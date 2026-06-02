import { getDB, schema, eq } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { VectorStoreService } from "./vector-store.service";

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);

  constructor(private vectorStore: VectorStoreService) {}

  /**
   * Human-readable label for each known layer type.
   * Unknown layers fall back to the raw layer string — zero maintenance needed
   * when the Python indexer adds new layer types.
   */
  private static readonly LAYER_LABELS: Record<string, string> = {
    "asset-transcript": "Asset Voice/Transcript Segment",
    "asset-visual-description": "Asset Visual/Scene Segment",
    "asset-description": "Asset Image Description",
    "video-chunk": "Video Segment",
    "asset-chapters": "Video Chapter",
    "asset-topics": "Asset Topics & Themes",
    "asset-summary": "Asset Summary",
    transcript: "Clip Transcript Segment",
  };

  /**
   * Metadata fields that are internal/redundant and should be omitted from output.
   * `spaceId` is already implied by context; `layer` is shown as the label.
   */
  private static readonly SKIP_FIELDS = new Set(["spaceId", "layer"]);

  /**
   * Fields holding millisecond timestamps — rendered as both ms and seconds
   * so the LLM can reason about them in either unit.
   */
  private static readonly MS_FIELDS = new Set(["startMs", "endMs"]);

  /**
   * Pretty-print a single metadata field value.
   *   - Arrays        → comma-joined string
   *   - MS timestamps → "Xms (Y.Ys)"
   *   - Everything else → toString()
   * Returns null if the value is empty / meaningless.
   */
  private formatMetaValue(key: string, value: unknown): string | null {
    if (value === undefined || value === null || value === "") return null;

    if (RetrieverService.MS_FIELDS.has(key) && typeof value === "number") {
      return `${value}ms (${(value / 1000).toFixed(1)}s)`;
    }

    if (Array.isArray(value)) {
      const filtered = value.filter(Boolean);
      return filtered.length > 0 ? filtered.join(", ") : null;
    }

    return String(value);
  }

  /**
   * Convert camelCase / lowercase keys to human-readable "Title Case" labels.
   * e.g. "assetName" → "Asset Name",  "primaryTheme" → "Primary Theme"
   */
  private keyToLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Serialize a single retrieval result into a human-readable text block
   * for the LLM context window.
   *
   * All metadata fields are emitted generically — new fields added by the
   * Python indexer appear automatically without any code changes here.
   * Only `SKIP_FIELDS` are suppressed; `startMs`+`endMs` are merged into
   * a single "Time Range" line.
   */
  private formatDoc(doc: any, index: number): string {
    const layer: string = doc.metadata?.layer ?? "unknown";
    const label = RetrieverService.LAYER_LABELS[layer] ?? layer;

    const lines: string[] = [`${index + 1}. [${label}]`, doc.pageContent ?? ""];

    for (const [key, value] of Object.entries(doc.metadata ?? {})) {
      if (RetrieverService.SKIP_FIELDS.has(key)) continue;
      if (key === "layer") continue; // already shown as label

      // Merge startMs + endMs into one "Time Range" line
      if (key === "startMs") {
        const endMs = doc.metadata.endMs;
        if (endMs !== undefined) {
          lines.push(
            `Time Range: ${this.formatMetaValue("startMs", value)} → ${this.formatMetaValue("endMs", endMs)}`,
          );
        } else {
          const formatted = this.formatMetaValue(key, value);
          if (formatted !== null) lines.push(`Start: ${formatted}`);
        }
        continue;
      }
      if (key === "endMs") continue; // consumed above

      const formatted = this.formatMetaValue(key, value);
      if (formatted !== null) lines.push(`${this.keyToLabel(key)}: ${formatted}`);
    }

    return lines.join("\n");
  }

  async searchWords(spaceId: string, phrase: string): Promise<string> {
    this.logger.debug(`Word search for "${phrase}" in space ${spaceId}`);

    const rows = await db
      .select()
      .from(schema.assetTranscript)
      .where(eq(schema.assetTranscript.spaceId, spaceId));

    if (rows.length === 0) return "No transcripts found for this space.";

    const clean = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .trim();
    const needle = clean(phrase);
    if (!needle) return `No exact matches found for "${phrase}".`;

    const phraseWords = needle.split(/\s+/);
    const results: string[] = [];

    for (const row of rows) {
      const segments: any[] = row.segments || [];
      for (const seg of segments) {
        const words: any[] = seg.words || [];
        if (words.length === 0) continue;

        for (let i = 0; i <= words.length - phraseWords.length; i++) {
          const window = words.slice(i, i + phraseWords.length);
          const match = phraseWords.every((pw, j) => {
            const wText = clean(window[j]?.word ?? "");
            return wText.includes(pw);
          });

          if (match) {
            const firstWord = window[0];
            const lastWord = window[window.length - 1];
            const startMs =
              firstWord.startMs !== undefined ? firstWord.startMs : firstWord.start_ms;
            const endMs = lastWord.endMs !== undefined ? lastWord.endMs : lastWord.end_ms;

            results.push(
              `Asset ID: ${row.assetId} | Phrase: "${window.map((w) => w.word).join(" ")}" | Time: ${startMs}ms (${(startMs / 1000).toFixed(1)}s) – ${endMs}ms (${(endMs / 1000).toFixed(1)}s)`,
            );
          }
        }
      }
    }

    if (results.length === 0) return `No exact matches found for "${phrase}".`;
    return `Word-level matches for "${phrase}":\n` + results.join("\n");
  }

  /**
   * Broad cross-asset search with higher topK.
   * Use for general questions spanning all indexed content in a space.
   */
  async searchAll(spaceId: string, query: string): Promise<string> {
    return this.search(spaceId, query, 30);
  }

  async search(projectId: string, query: string, topK = 10): Promise<string> {
    this.logger.debug(`Retrieving context for query: "${query}" in project ${projectId}`);

    let docs: any[] = [];
    try {
      docs = await this.vectorStore.similaritySearch(query, topK, projectId);
    } catch (err) {
      // RAG is optional — if no content is indexed yet, just return empty context
      this.logger.debug(`RAG search skipped (no indexed content yet): ${err.message}`);
      return "No project context indexed yet.";
    }

    if (docs.length === 0) {
      return "No relevant project context found.";
    }

    const blocks = docs.map((doc, i) => this.formatDoc(doc, i));
    return "--- RELEVANT PROJECT CONTEXT ---\n\n" + blocks.join("\n\n") + "\n";
  }
}
