import { task, logger } from "@trigger.dev/sdk/v3";
import { GoogleGenAI } from "@google/genai";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import { getDb, schema, eq, sql } from "./lib/db";
import { upsertDocuments } from "./lib/vector-store";
import { markStarted, updateProgress, markCompleted, markFailed } from "./lib/indexing-status";
import { transcribeWithDeepgram } from "./lib/deepgram";
import {
  detectScenes,
  extractKeyframeBatch,
  cleanupFrames,
  createTempFrameDir,
  cleanupTempDir,
  type Scene,
} from "../src/rag/video-processing";

// ─── Payload types ────────────────────────────────────────────────────────────

export interface IndexAssetPayload {
  spaceId: string;
  assetId: string;
}

// ─── Main task ────────────────────────────────────────────────────────────────

export const indexAssetTask = task({
  id: "index-asset",
  maxDuration: 900,
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, factor: 2 },
  run: async (payload: IndexAssetPayload) => {
    const { spaceId, assetId } = payload;
    logger.log("Starting asset indexing", { spaceId, assetId });

    const db = getDb();

    const asset = await db
      .select()
      .from(schema.asset)
      .where(eq(schema.asset.id, assetId))
      .then((rows) => rows[0]);

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Clear any existing vectors for this asset
    await db
      .execute(sql`DELETE FROM langchain_pg_embedding WHERE cmetadata->>'assetId' = ${assetId}`)
      .catch((err) => logger.warn("Could not clear old vectors", { error: err.message }));

    // Ensure indexing status record exists (create if missing)
    const existingStatus = await db
      .select()
      .from(schema.assetIndexingStatus)
      .where(eq(schema.assetIndexingStatus.assetId, assetId))
      .then((rows) => rows[0]);

    if (!existingStatus) {
      await db.insert(schema.assetIndexingStatus).values({
        id: nanoid(),
        assetId,
        spaceId,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await markStarted(assetId, assetId);

    try {
      if (asset.type === "image") {
        await indexImage(spaceId, asset);
      } else if (asset.type === "audio") {
        await indexAudio(spaceId, asset);
      } else if (asset.type === "video") {
        await indexVideo(spaceId, asset);
      } else {
        logger.warn("Unsupported asset type", { type: asset.type });
      }

      await markCompleted(assetId);
      logger.log("Asset indexed successfully", { assetId, name: asset.name });
    } catch (err: any) {
      await markFailed(assetId, err.message);
      throw err; // re-throw so Trigger.dev retries
    }
  },
});

// ─── Image indexing ───────────────────────────────────────────────────────────

async function indexImage(spaceId: string, asset: typeof schema.asset.$inferSelect): Promise<void> {
  logger.log("Indexing image", { name: asset.name });

  const response = await fetch(asset.src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const base64Data = buffer.toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  const ai = getGemini();
  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      "Describe this image in detail. Include: visible objects and people, any text shown on screen, colors and visual style, overall scene setting and context, and likely topics or themes. Return a clear natural language description.",
    ],
  });

  const description = geminiResponse.text || "No description generated.";
  await upsertDocuments([
    new Document({
      pageContent: `title: ${asset.name} | description: ${description}`,
      metadata: {
        spaceId,
        assetId: asset.id,
        assetName: asset.name,
        assetType: "image",
        src: asset.src,
        layer: "asset-description",
      },
    }),
  ]);
}

// ─── Audio indexing ───────────────────────────────────────────────────────────

async function indexAudio(spaceId: string, asset: typeof schema.asset.$inferSelect): Promise<void> {
  logger.log("Indexing audio", { name: asset.name });
  await updateProgress(asset.id, 10, "transcribing");

  const segments = await transcribeWithDeepgram(asset.src);

  await saveTranscript(spaceId, asset.id, segments);

  const docs = segments.map(
    (seg) =>
      new Document({
        pageContent: `title: ${asset.name} | text: ${seg.text}`,
        metadata: {
          spaceId,
          assetId: asset.id,
          assetName: asset.name,
          assetType: "audio",
          src: asset.src,
          layer: "asset-transcript",
          startMs: seg.startMs,
          endMs: seg.endMs,
        },
      }),
  );

  if (docs.length > 0) await upsertDocuments(docs);
}

// ─── Video indexing ───────────────────────────────────────────────────────────

async function indexVideo(spaceId: string, asset: typeof schema.asset.$inferSelect): Promise<void> {
  logger.log("Indexing video with scene-based analysis", { name: asset.name });

  const tempFilePath = path.join(os.tmpdir(), `index-vid-${asset.id}.mp4`);
  let frameDir: string | null = null;

  try {
    // 1. Download
    await updateProgress(asset.id, 5, "downloading");
    const downloadResponse = await fetch(asset.src);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download video: ${downloadResponse.statusText}`);
    }
    const fileStream = fs.createWriteStream(tempFilePath);
    await pipeline(Readable.fromWeb(downloadResponse.body as any), fileStream);
    logger.log("Video downloaded", { path: tempFilePath });

    // 2. Scene detection
    await updateProgress(asset.id, 15, "analyzing");
    const scenes = await detectScenes(tempFilePath, {
      threshold: 0.3,
      minSceneDuration: 2,
      maxSceneDuration: 300,
      maxScenes: 50,
    });
    logger.log("Scenes detected", { count: scenes.length });

    // 3. Transcription (parallel with visual processing)
    await updateProgress(asset.id, 25, "transcribing");
    const transcriptPromise = transcribeWithDeepgram(asset.src)
      .then(async (segments) => {
        await saveTranscript(spaceId, asset.id, segments);
        return segments;
      })
      .catch((err) => {
        logger.warn("Transcription failed, continuing visual-only", { error: err.message });
        return [];
      });

    // 4. Visual scene analysis in parallel batches
    await updateProgress(asset.id, 30, "analyzing");
    frameDir = await createTempFrameDir(`frames-${asset.id}-`);
    const visualScenes = await processScenesInParallel(asset, tempFilePath, frameDir, scenes);

    // 5. Wait for transcript
    const segments = await transcriptPromise;

    // 6. Save visual timeline
    await updateProgress(asset.id, 85, "storing");
    await saveVisualTimeline(spaceId, asset.id, visualScenes);

    // 7. Embed all docs
    await updateProgress(asset.id, 90, "embedding");
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

    const audioDocs = segments.map(
      (seg) =>
        new Document({
          pageContent: `title: ${asset.name} | text: ${seg.text}`,
          metadata: {
            spaceId,
            assetId: asset.id,
            assetName: asset.name,
            assetType: "video",
            src: asset.src,
            layer: "asset-transcript",
            startMs: seg.startMs,
            endMs: seg.endMs,
          },
        }),
    );

    const allDocs = [...visualDocs, ...audioDocs];
    if (allDocs.length > 0) await upsertDocuments(allDocs);

    logger.log("Video indexed", {
      name: asset.name,
      visualScenes: visualScenes.length,
      transcriptSegments: segments.length,
    });
  } finally {
    if (frameDir) await cleanupTempDir(frameDir).catch(() => {});
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// ─── Scene processing helpers ─────────────────────────────────────────────────

type VisualScene = {
  startMs: number;
  endMs: number;
  description: string;
  objects: string[];
  topics: string[];
  keywords: string[];
};

async function processScenesInParallel(
  asset: typeof schema.asset.$inferSelect,
  videoPath: string,
  frameDir: string,
  scenes: Scene[],
): Promise<VisualScene[]> {
  const BATCH_SIZE = 3;
  const results: VisualScene[] = [];

  for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
    const batch = scenes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((scene, idx) =>
        processSingleScene(videoPath, frameDir, scene, i + idx, scenes.length),
      ),
    );
    results.push(...batchResults);

    const progress = 30 + Math.round((i / scenes.length) * 50);
    await updateProgress(asset.id, progress, "analyzing").catch(() => {});
  }

  return results;
}

async function processSingleScene(
  videoPath: string,
  frameDir: string,
  scene: Scene,
  sceneIndex: number,
  totalScenes: number,
): Promise<VisualScene> {
  logger.log(`Processing scene ${sceneIndex + 1}/${totalScenes}`, {
    start: scene.startTime.toFixed(1),
    end: scene.endTime.toFixed(1),
  });

  const frames = await extractKeyframeBatch(videoPath, scene.startTime, scene.endTime, frameDir, {
    framesPerScene: 3,
    width: 640,
    quality: 3,
  });

  if (frames.length === 0) {
    logger.warn("No frames extracted", { sceneIndex });
    return {
      startMs: Math.round(scene.startTime * 1000),
      endMs: Math.round(scene.endTime * 1000),
      description: "No visual content detected",
      objects: [],
      topics: [],
      keywords: [],
    };
  }

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
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...frames.map((f) => ({ inlineData: { data: f.base64Data, mimeType: f.mimeType } })),
        prompt,
      ],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const rawText = response.text || "";
    let parsed: any;
    try {
      parsed = JSON.parse(
        rawText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );
    } catch {
      parsed = { description: rawText.slice(0, 500), objects: [], topics: [], keywords: [] };
    }

    return {
      startMs: Math.round(scene.startTime * 1000),
      endMs: Math.round(scene.endTime * 1000),
      description: parsed.description || "No description",
      objects: parsed.objects || [],
      topics: parsed.topics || [],
      keywords: parsed.keywords || [],
    };
  } catch (err: any) {
    logger.error("Scene analysis failed", { sceneIndex, error: err.message });
    return {
      startMs: Math.round(scene.startTime * 1000),
      endMs: Math.round(scene.endTime * 1000),
      description: `Scene analysis failed: ${err.message}`,
      objects: [],
      topics: [],
      keywords: [],
    };
  } finally {
    await cleanupFrames(frames);
  }
}

// ─── DB write helpers ─────────────────────────────────────────────────────────

async function saveTranscript(spaceId: string, assetId: string, segments: any[]): Promise<void> {
  const db = getDb();
  await db
    .insert(schema.assetTranscript)
    .values({ id: nanoid(), assetId, spaceId, segments })
    .onConflictDoUpdate({
      target: schema.assetTranscript.assetId,
      set: { segments },
    });
}

async function saveVisualTimeline(
  spaceId: string,
  assetId: string,
  scenes: VisualScene[],
): Promise<void> {
  const db = getDb();
  await db
    .insert(schema.assetVisualTimeline)
    .values({ id: nanoid(), assetId, spaceId, scenes })
    .onConflictDoUpdate({
      target: schema.assetVisualTimeline.assetId,
      set: { scenes },
    });
}

// ─── Singleton Gemini client ──────────────────────────────────────────────────

let _ai: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}
