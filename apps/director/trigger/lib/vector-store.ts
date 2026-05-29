import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { GoogleGenAI } from "@google/genai";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";

class GeminiEmbedding2 extends Embeddings {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    super({});
    this.ai = new GoogleGenAI({ apiKey });
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const doc of documents) {
      const formattedDoc = doc.startsWith("title:") ? doc : `title: none | text: ${doc}`;
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: formattedDoc,
      });
      const values = response.embeddings?.[0]?.values;
      results.push(values ?? new Array(3072).fill(0));
    }
    return results;
  }

  async embedQuery(query: string): Promise<number[]> {
    const formattedQuery = query.startsWith("task:")
      ? query
      : `task: search result | query: ${query}`;
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: formattedQuery,
    });
    return response.embeddings?.[0]?.values ?? new Array(3072).fill(0);
  }
}

let _store: PGVectorStore | null = null;

export async function getVectorStore(): Promise<PGVectorStore> {
  if (!_store) {
    const dbUrl = process.env.DATABASE_URL;
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");
    if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

    _store = await PGVectorStore.initialize(new GeminiEmbedding2(apiKey), {
      postgresConnectionOptions: { connectionString: dbUrl },
      tableName: "langchain_pg_embedding",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "document",
        metadataColumnName: "cmetadata",
      },
    });
  }
  return _store;
}

export async function upsertDocuments(docs: Document[]): Promise<void> {
  if (docs.length === 0) return;
  const store = await getVectorStore();
  await store.addDocuments(docs);
}

export { Document };
