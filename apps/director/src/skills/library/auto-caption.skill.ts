import { Injectable, Logger } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command, loadClip } from "@openvideo/core";
import { nanoid } from "nanoid";
import { ConfigService } from "@nestjs/config";

interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  words?: WordTiming[];
}

@Injectable()
export class AutoCaptionSkill implements EditingSkill {
  name = "auto-caption";
  description =
    "Automatically transcribes all spoken audio and adds animated caption clips to the video.";
  tags = ["captions", "text", "accessibility"];
  isAsync = true; // Requires transcription

  private readonly logger = new Logger(AutoCaptionSkill.name);

  constructor(private configService: ConfigService) {}

  async resolve(context: ProjectContext): Promise<Command[]> {
    const commands: Command[] = [];
    const { videoClipIds, audioClipIds, project } = context;

    const targetClipIds = [...videoClipIds, ...audioClipIds];
    if (targetClipIds.length === 0) {
      this.logger.warn("No video or audio clips found in project context to auto-caption.");
      return commands;
    }

    const videoWidth = project.settings?.width || 1080;
    const videoHeight = project.settings?.height || 1920;

    // 1. Identify or create a Caption track
    let trackId: string;
    const existingCaptionTrack = project.tracks.find(
      (t) => t.type === "caption" || t.name === "Captions",
    );

    if (existingCaptionTrack) {
      trackId = existingCaptionTrack.id;
      // Remove existing caption clips from the track to prevent overlap/duplication
      if (existingCaptionTrack.clipIds.length > 0) {
        commands.push({
          id: nanoid(),
          type: "clip.remove",
          payload: {
            ids: existingCaptionTrack.clipIds,
          },
          meta: { source: "agent" },
        });
      }
    } else {
      trackId = "track_" + nanoid(10);
      commands.push({
        id: nanoid(),
        type: "track.add",
        payload: {
          id: trackId,
          name: "Captions",
          type: "caption",
        },
        meta: { source: "agent" },
      });
    }

    // 2. Transcribe target clips and generate Caption clips
    for (const clipId of targetClipIds) {
      const clip = project.clips[clipId];
      if (!clip || !clip.src) continue;

      try {
        this.logger.log(`Fetching Deepgram transcript for clip ${clipId} (src: ${clip.src})`);
        const words = await this.transcribeMediaWithDeepgram(clip.src);
        if (!words || words.length === 0) continue;

        // Apply trimming and display timing transformations
        const trimFrom = clip.timing?.trim?.from || 0; // in microseconds
        const trimTo =
          clip.timing?.trim?.to ??
          (clip.timing?.duration ? trimFrom + clip.timing.duration : Infinity);
        const displayFrom = clip.timing?.display?.from || 0; // in microseconds

        // Filter words to match timeline trim bounds, and shift to timeline-relative seconds
        const timelineWords = words
          .map((w) => {
            const startUs = w.startMs * 1000;
            const endUs = w.endMs * 1000;
            return {
              word: w.word,
              startUs,
              endUs,
            };
          })
          .filter((w) => w.endUs > trimFrom && w.startUs < trimTo)
          .map((w) => {
            // Shift by trimFrom, then add displayFrom
            const timelineStartUs = Math.max(0, w.startUs - trimFrom) + displayFrom;
            const timelineEndUs = Math.min(trimTo - trimFrom, w.endUs - trimFrom) + displayFrom;
            return {
              word: w.word,
              // Convert to seconds for the chunking function
              start: timelineStartUs / 1000000,
              end: timelineEndUs / 1000000,
            };
          });

        // Group words into caption chunks (subtitles)
        const captionChunks = this.groupWords(timelineWords);

        // Prepare the caption configurations
        const clipsToAdd: any[] = [];
        for (const chunk of captionChunks) {
          const fromUs = Math.round(chunk.from * 1000000);
          const toUs = Math.round(chunk.to * 1000000);
          const durationUs = toUs - fromUs;

          // Estimate caption dimensions: average 28px width per char at size 80, clamp to 80% video width
          const fontSize = 80;
          const estimatedWidth = Math.min(videoWidth * 0.8, chunk.text.length * 28 + 60);
          const estimatedHeight = 120;
          const left = (videoWidth - estimatedWidth) / 2;
          const top = videoHeight - 350; // Position near the bottom

          clipsToAdd.push({
            type: "Caption",
            src: "",
            timing: {
              display: {
                from: fromUs,
                to: toUs,
              },
              playbackRate: 1,
              duration: durationUs,
            },
            left,
            top,
            width: estimatedWidth,
            height: estimatedHeight,
            angle: 0,
            zIndex: 10,
            opacity: 1,
            flip: null,
            text: chunk.text,
            style: {
              fontSize,
              fontFamily: "Bangers-Regular",
              fontWeight: "700",
              fontStyle: "normal",
              color: "#ffffff",
              align: "center",
              fontUrl:
                "https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf",
              stroke: {
                color: "#000000",
                width: 4,
              },
              shadow: {
                color: "#000000",
                alpha: 0.5,
                blur: 4,
                offsetX: 2,
                offsetY: 2,
              },
            },
            caption: {
              words: chunk.words,
              colors: {
                appeared: "#ffffff",
                active: "#ffffff",
                activeFill: "#FF5700",
                background: "",
                keyword: "#ffffff",
              },
              preserveKeywordColor: true,
              positioning: {
                videoWidth,
                videoHeight,
              },
            },
          });
        }

        // Batch action: prepare all clips with loadClip and build command payload
        if (clipsToAdd.length > 0) {
          const fullClips = await Promise.all(
            clipsToAdd.map((c) =>
              loadClip(c as any, {
                canvasSize: { width: videoWidth, height: videoHeight },
              }),
            ),
          );

          const addCommands: Command[] = fullClips.map((clip) => ({
            id: nanoid(),
            type: "clip.add",
            payload: { clip, trackId },
            meta: { source: "agent" },
          }));

          commands.push(...addCommands);
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to generate captions for clip ${clipId}: ${error.message}`,
          error.stack,
        );
      }
    }

    return commands;
  }

  private async transcribeMediaWithDeepgram(src: string): Promise<WordTiming[]> {
    const deepgramKey = this.configService.get<string>("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      throw new Error("DEEPGRAM_API_KEY not configured in director environment");
    }

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
    const words = alternative?.words || [];

    // Map using punctuated_word to match deepgramToCombo logic
    return words.map((w: any) => ({
      word: w.punctuated_word || w.word,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
    }));
  }

  private groupWords(words: Array<{ word: string; start: number; end: number }>) {
    if (!words || words.length === 0) return [];

    const chunks: any[] = [];
    let currentWords: any[] = [];
    let chunkStart = words[0].start;
    let prevEnd = words[0].end;

    // Limits for a standard subtitle chunk
    const maxWordsPerChunk = 4;
    const maxDurationSec = 2.5;
    const maxGapSec = 0.4;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const gap = i > 0 ? w.start - prevEnd : 0;
      const duration = w.end - chunkStart;

      const shouldSplit =
        currentWords.length > 0 &&
        (currentWords.length >= maxWordsPerChunk ||
          gap > maxGapSec ||
          duration > maxDurationSec ||
          /[.!?]$/.test(currentWords[currentWords.length - 1].word));

      if (shouldSplit) {
        const text = currentWords.map((x) => x.word).join(" ");
        chunks.push({
          text,
          from: chunkStart,
          to: prevEnd,
          words: currentWords.map((x, idx) => ({
            text: x.word,
            from: Math.round((x.start - chunkStart) * 1000),
            to: Math.round((x.end - chunkStart) * 1000),
            isKeyWord: idx === 0 || idx === currentWords.length - 1,
            paragraphIndex: "",
          })),
        });
        currentWords = [];
        chunkStart = w.start;
      }

      currentWords.push(w);
      prevEnd = w.end;
    }

    if (currentWords.length > 0) {
      const text = currentWords.map((x) => x.word).join(" ");
      chunks.push({
        text,
        from: chunkStart,
        to: prevEnd,
        words: currentWords.map((x, idx) => ({
          text: x.word,
          from: Math.round((x.start - chunkStart) * 1000),
          to: Math.round((x.end - chunkStart) * 1000),
          isKeyWord: idx === 0 || idx === currentWords.length - 1,
          paragraphIndex: "",
        })),
      });
    }

    return chunks;
  }
}
