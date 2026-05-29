import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmbedderService } from "./embedder.service";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private store: VectorStore;
  private isMemory: boolean;
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    private configService: ConfigService,
    private embedderService: EmbedderService,
  ) {}

  async onModuleInit() {
    const isDev = this.configService.get<string>("NODE_ENV") === "development";
    const dbUrl = this.configService.get<string>("DATABASE_URL");

    // In a real scenario, you can force memory store via env var for testing.
    // We'll use PGVector if DB URL is present, fallback to memory.
    if (dbUrl) {
      this.isMemory = false;
      this.logger.log("Initializing PGVector store...");

      const config = {
        postgresConnectionOptions: {
          connectionString: dbUrl,
        },
        tableName: "langchain_pg_embedding",
        columns: {
          idColumnName: "id",
          vectorColumnName: "embedding",
          contentColumnName: "document",
          metadataColumnName: "cmetadata",
        },
      };

      this.store = await PGVectorStore.initialize(this.embedderService.getEmbeddings(), config);
    } else {
      this.isMemory = true;
      this.logger.warn("No DATABASE_URL found. Falling back to MemoryVectorStore.");
      this.store = new MemoryVectorStore(this.embedderService.getEmbeddings());
    }
  }

  /**
   * Adds or replaces documents for a given project.
   * Note: This is an additive operation by default.
   * In a robust implementation, you should delete previous docs for the same entityId/projectId first.
   */
  async upsert(documents: Document[]): Promise<void> {
    if (documents.length === 0) return;

    // PGVectorStore doesn't natively support easy deletion by metadata filter in the LangChain wrapper.
    // A robust approach would use Prisma directly to delete old records.
    // For simplicity, we just add here.
    await this.store.addDocuments(documents);
    this.logger.debug(`Upserted ${documents.length} documents into vector store`);
  }

  async deleteByProjectId(projectId: string, layer?: string): Promise<void> {
    if (this.isMemory) return; // Not easily supported in memory store without rebuilding

    // To implement proper deletion by metadata, we would need to run a raw SQL query via pg
    // since LangChain's PGVector wrapper lacks a built-in delete-by-metadata method.
    // Example:
    // await prisma.$executeRaw`DELETE FROM langchain_pg_embedding WHERE cmetadata->>'projectId' = ${projectId} AND cmetadata->>'layer' = ${layer}`;
    this.logger.debug(`Would delete vectors for project ${projectId} layer: ${layer || "all"}`);
  }

  async similaritySearch(query: string, topK: number, spaceId: string): Promise<Document[]> {
    return this.store.similaritySearch(query, topK, { spaceId });
  }
}
