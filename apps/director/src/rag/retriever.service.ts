import { getDB, schema, eq } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { VectorStoreService } from "./vector-store.service";

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);

  constructor(private vectorStore: VectorStoreService) {}

  /**
   * Searches the vector store across both 'metadata' and 'transcript' layers.
   * Formats the results into a string block suitable for the system prompt.
   */
  /**
   * Exact word/phrase search against stored transcript words[].
   * Returns word-level timestamps with ~100ms precision.
   */
  async searchWords(spaceId: string, phrase: string): Promise<string> {
    this.logger.debug(`Word search for "${phrase}" in space ${spaceId}`);

    const rows = await db
      .select()
      .from(schema.assetTranscript)
      .where(eq(schema.assetTranscript.spaceId, spaceId));

    if (rows.length === 0) return "No transcripts found for this space.";

    const needle = phrase.toLowerCase().trim();
    const results: string[] = [];

    for (const row of rows) {
      const segments: any[] = row.segments || [];
      for (const seg of segments) {
        const words: any[] = seg.words || [];
        if (words.length === 0) continue;

        // Build sliding window over words to find the phrase
        const phraseWords = needle.split(/\s+/);
        for (let i = 0; i <= words.length - phraseWords.length; i++) {
          const window = words.slice(i, i + phraseWords.length);
          const match = phraseWords.every((pw, j) => window[j]?.word?.toLowerCase().includes(pw));
          if (match) {
            const startMs = window[0].startMs;
            const endMs = window[window.length - 1].endMs;
            results.push(
              `Asset ID: ${row.assetId} | Phrase: "${window.map((w) => w.word).join(" ")}" | Time: ${startMs}ms–${endMs}ms`,
            );
          }
        }
      }
    }

    if (results.length === 0) return `No exact matches found for "${phrase}".`;
    return `Word-level matches for "${phrase}":\n` + results.join("\n");
  }

  /**
   * Broad cross-asset search with higher topK, results grouped by asset.
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

    let contextString = "--- RELEVANT PROJECT CONTEXT ---\n\n";

    docs.forEach((doc, index) => {
      const layer = doc.metadata.layer;
      const isAssetTranscript = layer === "asset-transcript";
      const isAssetVisual = layer === "asset-visual-description";
      const isAssetImage = layer === "asset-description";
      const isClipTranscript = layer === "transcript";

      if (isAssetTranscript || isAssetVisual || isAssetImage) {
        let label = "";
        if (isAssetTranscript) label = "[Asset Voice/Transcript Segment]";
        else if (isAssetVisual) label = "[Asset Visual/Scene Segment]";
        else label = "[Asset Image Description]";

        contextString += `${index + 1}. ${label}\n`;
        contextString += `${doc.pageContent}\n`;
        contextString += `Asset Name: ${doc.metadata.assetName}\n`;
        contextString += `Asset ID: ${doc.metadata.assetId}\n`;
        contextString += `Asset Type: ${doc.metadata.assetType}\n`;
        contextString += `Source URL: ${doc.metadata.src}\n`;
        if (doc.metadata.startMs !== undefined && doc.metadata.endMs !== undefined) {
          contextString += `Time Range: ${doc.metadata.startMs}ms - ${doc.metadata.endMs}ms\n`;
        }
        if (Array.isArray(doc.metadata.topics) && doc.metadata.topics.length > 0) {
          contextString += `Topics: ${doc.metadata.topics.join(", ")}\n`;
        }
        if (Array.isArray(doc.metadata.objects) && doc.metadata.objects.length > 0) {
          contextString += `Objects/Entities: ${doc.metadata.objects.join(", ")}\n`;
        }
      } else {
        const label = isClipTranscript ? "[Transcript Segment]" : "[Structural Metadata]";
        contextString += `${index + 1}. ${label}\n`;
        contextString += `${doc.pageContent}\n`;

        if (
          isClipTranscript &&
          doc.metadata.startMs !== undefined &&
          doc.metadata.endMs !== undefined
        ) {
          contextString += `Time Range: ${doc.metadata.startMs}ms - ${doc.metadata.endMs}ms\n`;
          contextString += `Clip ID: ${doc.metadata.clipId}\n`;
        } else {
          contextString += `Entity ID: ${doc.metadata.entityId} (${doc.metadata.entityType})\n`;
        }
      }

      contextString += "\n";
    });

    return contextString;
  }
}
