import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenAI } from "@google/genai";

class GeminiEmbedding2 extends Embeddings {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    super({});
    this.ai = new GoogleGenAI({ apiKey });
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const doc of documents) {
      // Ensure it has asymmetric format
      const formattedDoc = doc.startsWith("title:") ? doc : `title: none | text: ${doc}`;
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: formattedDoc,
      });
      const values = response.embeddings?.[0]?.values;
      if (values) {
        results.push(values);
      } else {
        results.push(new Array(3072).fill(0));
      }
    }
    return results;
  }

  async embedQuery(query: string): Promise<number[]> {
    // Format query for asymmetric retrieval: task: search result | query: {query}
    const formattedQuery = query.startsWith("task:")
      ? query
      : `task: search result | query: ${query}`;
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: formattedQuery,
    });
    return response.embeddings?.[0]?.values || new Array(3072).fill(0);
  }
}

@Injectable()
export class EmbedderService {
  private embedder: Embeddings;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>("GOOGLE_API_KEY");
    this.embedder = new GeminiEmbedding2(apiKey);
  }

  getEmbeddings() {
    return this.embedder;
  }
}
