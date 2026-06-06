import { getDB, schema, eq, sql } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VectorStoreService } from "./vector-store.service";
import { IndexingStatusService } from "./indexing-status.service";
import { GoogleGenAI } from "@google/genai";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import {
  detectScenes,
  extractKeyframeBatch,
  cleanupFrames,
  createTempFrameDir,
  cleanupTempDir,
  type Scene,
  type ExtractedFrame,
} from "./video-processing";

@Injectable()
export class AssetIndexerService {
  private readonly logger = new Logger(AssetIndexerService.name);
  private ai: GoogleGenAI;

  constructor(
    private vectorStore: VectorStoreService,
    private configService: ConfigService,
    private indexingStatus: IndexingStatusService,
  ) {
    const apiKey = this.configService.getOrThrow<string>("GOOGLE_API_KEY");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async indexAsset(spaceId: string, assetId: string): Promise<void> {
    this.logger.log(`Indexing asset: ${assetId} for project: ${spaceId}`);

    // 1. Fetch asset from DB
    const asset = await db
      .select()
      .from(schema.asset)
      .where(eq(schema.asset.id, assetId))
      .then((rows: any[]) => rows[0]);

    if (!asset) {
      this.logger.error(`Asset ${assetId} not found in database.`);
      return;
    }

    // Clean up any existing vectors for this assetId first
    await this.deleteVectorsForAsset(assetId);

    await this.indexingStatus.markStarted(assetId, assetId);

    try {
      if (asset.type === "image") {
        await this.indexImage(spaceId, asset);
      } else if (asset.type === "audio") {
        await this.indexAudio(spaceId, asset);
      } else if (asset.type === "video") {
        await this.indexVideo(spaceId, asset);
      } else {
        this.logger.warn(`Unsupported asset type for indexing: ${asset.type}`);
      }
      await this.indexingStatus.markCompleted(assetId);
      this.logger.log(`Successfully indexed asset: ${asset.name} (${asset.id})`);
    } catch (err) {
      await this.indexingStatus.markFailed(assetId, err.message);
      this.logger.error(`Failed to index asset ${asset.id}: ${err.message}`, err.stack);
    }
  }

  private async deleteVectorsForAsset(assetId: string): Promise<void> {
    try {
      await db.execute(
        sql`DELETE FROM langchain_pg_embedding WHERE cmetadata->>'assetId' = ${assetId}`,
      );
      this.logger.debug(`Cleared existing vector store records for asset: ${assetId}`);
    } catch (err) {
      this.logger.warn(
        `Could not clear old vector store records for asset ${assetId}: ${err.message}`,
      );
    }
  }

  private async indexImage(
    spaceId: string,
    asset: typeof schema.asset.$inferSelect,
  ): Promise<void> {
    this.logger.log(`Analyzing image asset: ${asset.name}`);

    // Fetch image bytes
    const response = await fetch(asset.src);
    if (!response.ok) throw new Error(`Failed to fetch image from src: ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    // Describe visual details using Gemini
    const geminiResponse = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        "Describe this image in detail. Include: visible objects and people, any text shown on screen, colors and visual style, overall scene setting and context, and likely topics or themes. Return a clear natural language description.",
      ],
    });

    const description = geminiResponse.text || "No description generated.";

    // Create and upsert vector document
    const doc = new Document({
      pageContent: `title: ${asset.name} | description: ${description}`,
      metadata: {
        spaceId,
        assetId: asset.id,
        assetName: asset.name,
        assetType: "image",
        src: asset.src,
        layer: "asset-description",
      },
    });

    await this.vectorStore.upsert([doc]);
  }

  private async indexAudio(
    spaceId: string,
    asset: typeof schema.asset.$inferSelect,
  ): Promise<void> {
    this.logger.log(`Transcribing audio asset: ${asset.name}`);

    const segments = await this.transcribeMediaWithDeepgram(asset.src);

    // Save transcripts to DB for fast lookup
    await db
      .insert(schema.assetTranscript)
      .values({
        id: nanoid(),
        assetId: asset.id,
        spaceId,
        segments,
      })
      .onConflictDoUpdate({
        target: schema.assetTranscript.assetId,
        set: {
          segments,
        },
      });

    // Create and upsert vector documents for each segment
    const docs = segments.flatMap((seg) => {
      const chunks = this.splitSegmentIntoChunks(seg);
      return chunks.map((chunk) => {
        return new Document({
          pageContent: `title: ${asset.name} | text: ${chunk.text}`,
          metadata: {
            spaceId,
            assetId: asset.id,
            assetName: asset.name,
            assetType: "audio",
            src: asset.src,
            layer: "asset-transcript",
            startMs: chunk.startMs,
            endMs: chunk.endMs,
          },
        });
      });
    });

    if (docs.length > 0) {
      await this.vectorStore.upsert(docs);
    }
  }

  private async indexVideo(
    spaceId: string,
    asset: typeof schema.asset.$inferSelect,
  ): Promise<void> {
    this.logger.log(`Processing video asset with scene-based indexing: ${asset.name}`);

    const tempFilePath = path.join(os.tmpdir(), `index-vid-${asset.id}.mp4`);
    let frameDir: string | null = null;

    try {
      // 1. Download video to local temp file
      await this.indexingStatus.updateProgress(asset.id, 5, "downloading");
      const downloadResponse = await fetch(asset.src);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download video file: ${downloadResponse.statusText}`);
      }
      const fileStream = fs.createWriteStream(tempFilePath);
      await pipeline(Readable.fromWeb(downloadResponse.body as any), fileStream);
      this.logger.log(`Downloaded ${asset.name} to ${tempFilePath}`);

      // 2. Detect scenes using ffmpeg (fast, local, free)
      await this.indexingStatus.updateProgress(asset.id, 15, "analyzing");
      this.logger.log(`Detecting scenes in ${asset.name}...`);
      const scenes = await detectScenes(tempFilePath, {
        threshold: 0.3,
        minSceneDuration: 2,
        maxSceneDuration: 300, // 5 min max per scene
        maxScenes: 50,
      });
      this.logger.log(`Detected ${scenes.length} scenes in ${asset.name}`);

      // 3. Transcribe audio (can run in parallel with visual processing)
      await this.indexingStatus.updateProgress(asset.id, 25, "transcribing");
      const transcriptPromise = this.transcribeAndSaveAudio(spaceId, asset);

      // 4. Process visual scenes in parallel batches
      await this.indexingStatus.updateProgress(asset.id, 30, "analyzing");
      frameDir = await createTempFrameDir(`frames-${asset.id}-`);

      const visualScenes = await this.processScenesInParallel(
        asset,
        tempFilePath,
        frameDir,
        scenes,
      );

      // 5. Wait for transcript and save visual timeline
      const segments = await transcriptPromise;

      // Save visual timeline to DB
      await db
        .insert(schema.assetVisualTimeline)
        .values({
          id: nanoid(),
          assetId: asset.id,
          spaceId,
          scenes: visualScenes,
        })
        .onConflictDoUpdate({
          target: schema.assetVisualTimeline.assetId,
          set: { scenes: visualScenes },
        });

      // 6. Create vector documents
      const visualDocs = visualScenes.map((scene) => {
        const topicsStr = Array.isArray(scene.topics) ? scene.topics.join(", ") : "";
        const objectsStr = Array.isArray(scene.objects) ? scene.objects.join(", ") : "";
        const keywordsStr = Array.isArray(scene.keywords) ? scene.keywords.join(", ") : "";
        const richContent = [
          `title: ${asset.name}`,
          `description: ${scene.description}`,
          topicsStr ? `topics: ${topicsStr}` : "",
          objectsStr ? `objects: ${objectsStr}` : "",
          keywordsStr ? `keywords: ${keywordsStr}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        return new Document({
          pageContent: richContent,
          metadata: {
            spaceId,
            assetId: asset.id,
            assetName: asset.name,
            assetType: "video",
            src: asset.src,
            layer: "asset-visual-description",
            startMs: scene.startMs,
            endMs: scene.endMs,
            topics: scene.topics ?? [],
            objects: scene.objects ?? [],
          },
        });
      });

      const audioDocs = segments.flatMap((seg) => {
        const chunks = this.splitSegmentIntoChunks(seg);
        return chunks.map((chunk) => {
          return new Document({
            pageContent: `title: ${asset.name} | text: ${chunk.text}`,
            metadata: {
              spaceId,
              assetId: asset.id,
              assetName: asset.name,
              assetType: "video",
              src: asset.src,
              layer: "asset-transcript",
              startMs: chunk.startMs,
              endMs: chunk.endMs,
            },
          });
        });
      });

      const allDocs = [...visualDocs, ...audioDocs];
      if (allDocs.length > 0) {
        await this.vectorStore.upsert(allDocs);
      }

      this.logger.log(
        `Indexed ${asset.name}: ${visualScenes.length} visual scenes, ${segments.length} transcript segments`,
      );
    } finally {
      // Cleanup
      if (frameDir) {
        await cleanupTempDir(frameDir).catch(() => {});
      }
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        this.logger.warn(`Failed to delete temp file: ${e.message}`);
      }
    }
  }

  /**
   * Transcribe audio and save to database.
   * Extracted as separate method for parallel execution.
   */
  private async transcribeAndSaveAudio(
    spaceId: string,
    asset: typeof schema.asset.$inferSelect,
  ): Promise<
    Array<{
      text: string;
      startMs: number;
      endMs: number;
      words?: Array<{ word: string; punctuated_word?: string; startMs: number; endMs: number }>;
    }>
  > {
    let segments: any[] = [];
    try {
      segments = await this.transcribeMediaWithDeepgram(asset.src);
      await db
        .insert(schema.assetTranscript)
        .values({
          id: nanoid(),
          assetId: asset.id,
          spaceId,
          segments,
        })
        .onConflictDoUpdate({
          target: schema.assetTranscript.assetId,
          set: { segments },
        });
    } catch (err) {
      this.logger.warn(
        `Voice transcription failed for video ${asset.name}: ${err.message}. Proceeding with visual-only.`,
      );
    }
    return segments;
  }

  /**
   * Process scenes in parallel batches using frame sampling + Gemini Flash.
   * Each scene: extract 3 keyframes → describe with Flash → merge into scene description.
   */
  private async processScenesInParallel(
    asset: typeof schema.asset.$inferSelect,
    videoPath: string,
    frameDir: string,
    scenes: Scene[],
  ): Promise<
    Array<{
      startMs: number;
      endMs: number;
      description: string;
      objects: string[];
      topics: string[];
      keywords: string[];
    }>
  > {
    const PARALLEL_BATCH_SIZE = 3;
    const results: Array<{
      startMs: number;
      endMs: number;
      description: string;
      objects: string[];
      topics: string[];
      keywords: string[];
    }> = [];

    for (let i = 0; i < scenes.length; i += PARALLEL_BATCH_SIZE) {
      const batch = scenes.slice(i, i + PARALLEL_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((scene, batchIndex) =>
          this.processSingleScene(asset, videoPath, frameDir, scene, i + batchIndex, scenes.length),
        ),
      );
      results.push(...batchResults);

      // Update progress
      const progress = 30 + Math.round((i / scenes.length) * 50);
      await this.indexingStatus.updateProgress(asset.id, progress, "analyzing").catch(() => {});
    }

    return results;
  }

  /**
   * Process a single scene: extract frames, describe with Gemini Flash.
   */
  private async processSingleScene(
    asset: typeof schema.asset.$inferSelect,
    videoPath: string,
    frameDir: string,
    scene: Scene,
    sceneIndex: number,
    totalScenes: number,
  ): Promise<{
    startMs: number;
    endMs: number;
    description: string;
    objects: string[];
    topics: string[];
    keywords: string[];
  }> {
    this.logger.log(
      `Processing scene ${sceneIndex + 1}/${totalScenes}: ${scene.startTime.toFixed(1)}s - ${scene.endTime.toFixed(1)}s`,
    );

    // Extract 3 keyframes from scene (start, middle, end)
    const frames = await extractKeyframeBatch(videoPath, scene.startTime, scene.endTime, frameDir, {
      framesPerScene: 3,
      width: 640,
      quality: 3,
    });

    if (frames.length === 0) {
      this.logger.warn(`No frames extracted for scene ${sceneIndex + 1}`);
      return {
        startMs: Math.round(scene.startTime * 1000),
        endMs: Math.round(scene.endTime * 1000),
        description: "No visual content detected",
        objects: [],
        topics: [],
        keywords: [],
      };
    }

    // Describe frames with Gemini Flash
    const prompt = `Analyze these ${frames.length} frames from a video scene.

Describe:
1. What is happening visually - actions, setting, composition, lighting, mood
2. Key objects, people, or entities visible
3. High-level topics or themes
4. Any text visible on screen
5. Important keywords that describe this scene

Return a JSON object:
{
  "description": "detailed visual description",
  "objects": ["object1", "object2"],
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"]
}

Return raw JSON only. No markdown, no backticks.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...frames.map((f) => ({
            inlineData: { data: f.base64Data, mimeType: f.mimeType },
          })),
          prompt,
        ],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const rawText = response.text || "";
      let parsed: any;

      try {
        const cleanJson = rawText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsed = JSON.parse(cleanJson);
      } catch {
        // Fallback: extract description from non-JSON response
        parsed = {
          description: rawText.slice(0, 500),
          objects: [],
          topics: [],
          keywords: [],
        };
      }

      return {
        startMs: Math.round(scene.startTime * 1000),
        endMs: Math.round(scene.endTime * 1000),
        description: parsed.description || "No description",
        objects: parsed.objects || [],
        topics: parsed.topics || [],
        keywords: parsed.keywords || [],
      };
    } catch (err) {
      this.logger.error(`Failed to analyze scene ${sceneIndex + 1}: ${err.message}`);
      return {
        startMs: Math.round(scene.startTime * 1000),
        endMs: Math.round(scene.endTime * 1000),
        description: `Scene analysis failed: ${err.message}`,
        objects: [],
        topics: [],
        keywords: [],
      };
    } finally {
      // Cleanup frames for this scene
      await cleanupFrames(frames);
    }
  }

  private async transcribeMediaWithDeepgram(src: string): Promise<
    Array<{
      text: string;
      startMs: number;
      endMs: number;
      words?: Array<{ word: string; punctuated_word?: string; startMs: number; endMs: number }>;
    }>
  > {
    const deepgramKey = this.configService.get<string>("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      throw new Error("DEEPGRAM_API_KEY not configured in director environment");
    }

    this.logger.log(`Invoking Deepgram API for URL: ${src}`);

    const url =
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true&utterances=true";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: src }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Deepgram API returned error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const alternative = data.results?.channels?.[0]?.alternatives?.[0];
    const paragraphs: any[] = alternative?.paragraphs?.paragraphs || [];

    const segments: Array<{
      text: string;
      startMs: number;
      endMs: number;
      words?: Array<{ word: string; startMs: number; endMs: number }>;
    }> = [];

    const allWords: any[] = alternative?.words || [];

    if (paragraphs.length > 0) {
      for (const p of paragraphs) {
        const text = p.sentences.map((s: any) => s.text).join(" ");
        const pStart = p.start;
        const pEnd = p.end;
        const pWords = allWords
          .filter((w: any) => w.start >= pStart && w.end <= pEnd + 0.1)
          .map((w: any) => ({
            word: w.word,
            punctuated_word: w.punctuated_word ?? w.word,
            startMs: Math.round(w.start * 1000),
            endMs: Math.round(w.end * 1000),
          }));
        segments.push({
          text,
          startMs: Math.round(pStart * 1000),
          endMs: Math.round(pEnd * 1000),
          words: pWords,
        });
      }
    } else {
      // Fallback: build sentence-boundary segments from word timestamps.
      // Deepgram provides `punctuated_word` (e.g. "Yeah.", "As") — use it for
      // sentence-end detection and for the human-readable segment text.
      // Split ONLY when we hit sentence-ending punctuation OR a long pause (>1.2s).
      // Never split mid-sentence — content integrity is more important than chunk size.
      if (allWords.length > 0) {
        const LONG_PAUSE_THRESHOLD_S = 1.2; // only split on a real breath/pause
        const EMERGENCY_MAX_WORDS = 60; // absolute safety valve — avoids runaway chunks
        let chunkWords: any[] = [];
        let chunkStart = allWords[0].start;
        let prevEnd = allWords[0].end;

        const isSentenceEnd = (w: any): boolean => {
          // Prefer punctuated_word ("Yeah.") over raw word ("yeah")
          const pw: string = w.punctuated_word ?? w.word ?? "";
          return /[.?!]\s*$/.test(pw.trimEnd());
        };

        for (let i = 0; i < allWords.length; i++) {
          const w = allWords[i];
          const gap = i > 0 ? w.start - prevEnd : 0;
          const prevWord = chunkWords[chunkWords.length - 1];

          // Flush the chunk when:
          // 1. Long pause (>1.2s) — real breath between thoughts
          // 2. Previous word ended a sentence + any pause >0.3s
          // 3. Emergency cap reached
          const longPause = gap > LONG_PAUSE_THRESHOLD_S;
          const sentenceEnd = prevWord && isSentenceEnd(prevWord);
          const shortPauseAfterSentence = sentenceEnd && gap > 0.3;
          const emergencyCap = chunkWords.length >= EMERGENCY_MAX_WORDS;

          const shouldSplit =
            chunkWords.length > 0 && (longPause || shortPauseAfterSentence || emergencyCap);

          if (shouldSplit) {
            segments.push({
              text: chunkWords.map((x) => x.punctuated_word ?? x.word).join(" "),
              startMs: Math.round(chunkStart * 1000),
              endMs: Math.round(prevEnd * 1000),
              words: chunkWords.map((x) => ({
                word: x.punctuated_word ?? x.word,
                startMs: Math.round(x.start * 1000),
                endMs: Math.round(x.end * 1000),
              })),
            });
            chunkWords = [];
            chunkStart = w.start;
          }

          chunkWords.push(w);
          prevEnd = w.end;
        }

        if (chunkWords.length > 0) {
          segments.push({
            text: chunkWords.map((x) => x.punctuated_word ?? x.word).join(" "),
            startMs: Math.round(chunkStart * 1000),
            endMs: Math.round(prevEnd * 1000),
            words: chunkWords.map((x) => ({
              word: x.punctuated_word ?? x.word,
              startMs: Math.round(x.start * 1000),
              endMs: Math.round(x.end * 1000),
            })),
          });
        }
      }
    }

    this.logger.log(`Deepgram generated ${segments.length} segments.`);
    return segments;
  }

  private splitSegmentIntoChunks(segment: {
    text: string;
    startMs: number;
    endMs: number;
    words?: Array<{ word: string; punctuated_word?: string; startMs: number; endMs: number }>;
  }): Array<{ text: string; startMs: number; endMs: number }> {
    const text = segment.text.trim();
    const words = segment.words || [];

    if (!text) return [];

    // If no word timestamps, split text by sentence punctuation using regex
    if (words.length === 0) {
      const sentences = text.split(/(?<=[.!?])\s+/);
      const chunks: Array<{ text: string; startMs: number; endMs: number }> = [];
      const duration = segment.endMs - segment.startMs;

      let charCount = 0;
      for (const s of sentences) {
        const sText = s.trim();
        if (!sText) continue;

        const sStartMs = segment.startMs + Math.round((charCount / text.length) * duration);
        charCount += s.length + 1; // +1 for the split space
        const sEndMs = Math.min(
          segment.endMs,
          segment.startMs + Math.round((charCount / text.length) * duration),
        );

        chunks.push({
          text: sText,
          startMs: sStartMs,
          endMs: sEndMs,
        });
      }
      return chunks;
    }

    const chunks: Array<{ text: string; startMs: number; endMs: number }> = [];
    let currentWords: typeof words = [];
    let chunkStartMs = words[0].startMs;

    const isSentenceEnd = (w: (typeof words)[0]): boolean => {
      const pw = w.punctuated_word ?? w.word;
      return /[.!?]$/.test(pw.trim());
    };

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      currentWords.push(w);

      const hasNext = i < words.length - 1;
      const nextW = words[i + 1];

      const currEnd = w.endMs;
      const nextStart = nextW ? nextW.startMs : currEnd;
      const pause = (nextStart - currEnd) / 1000; // seconds

      let shouldSplit = false;
      if (!hasNext) {
        shouldSplit = true;
      } else if (isSentenceEnd(w)) {
        shouldSplit = true;
      } else if (pause > 1.2) {
        shouldSplit = true;
      } else if (currentWords.length >= 35) {
        shouldSplit = true;
      }

      if (shouldSplit && currentWords.length > 0) {
        const chunkText = currentWords.map((cw) => cw.punctuated_word ?? cw.word).join(" ");
        const chunkEndMs = currentWords[currentWords.length - 1].endMs;
        chunks.push({
          text: chunkText,
          startMs: chunkStartMs,
          endMs: chunkEndMs,
        });
        if (hasNext) {
          currentWords = [];
          chunkStartMs = nextW.startMs;
        }
      }
    }

    return chunks;
  }
}
