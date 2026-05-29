import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { RequestContext } from "../common/request-context";
import { VectorStoreService } from "../rag/vector-store.service";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { ChatMessageDto } from "./chat.controller";

export interface ChatResponse {
  message: string;
  spaceId: string;
  sources: Array<{
    assetId: string;
    assetName: string;
    assetType: string;
    text: string;
    startMs?: number;
    endMs?: number;
    layer: string;
  }>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private ai: GoogleGenAI;

  constructor(
    private db: DrizzleService,
    private vectorStore: VectorStoreService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY");
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async chat(spaceId: string, dto: ChatMessageDto, ctx: RequestContext): Promise<ChatResponse> {
    // Verify space access
    await this.verifySpaceAccess(spaceId, ctx);

    // Check if AI is configured
    if (!this.ai) {
      throw new Error("Chat service not configured - GOOGLE_API_KEY missing");
    }

    const limit = dto.context?.limit ?? 5;

    // Retrieve relevant documents using RAG
    const docs = await this.vectorStore.similaritySearch(dto.message, limit, spaceId);

    // Build prompt with retrieved context
    const contextText = docs
      .map((doc: any, i: number) => {
        const meta = doc.metadata;
        return `[${i + 1}] ${meta.assetName} (${meta.assetType}): ${doc.pageContent}`;
      })
      .join("\n\n");

    const prompt = `You are a helpful assistant for video editing. Answer the user's question based on the following retrieved content from their video assets.

Retrieved Context:
${contextText}

User Question: ${dto.message}

Provide a helpful, concise answer. Reference specific assets and timestamps when relevant.`;

    // Generate response
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const answer = response.text ?? "No response generated.";

    // Format sources
    const sources = docs.map((doc: any) => ({
      assetId: doc.metadata.assetId as string,
      assetName: doc.metadata.assetName as string,
      assetType: doc.metadata.assetType as string,
      text: doc.pageContent,
      startMs: doc.metadata.startMs as number | undefined,
      endMs: doc.metadata.endMs as number | undefined,
      layer: doc.metadata.layer as string,
    }));

    this.logger.log(
      `Chat query in space ${spaceId}: "${dto.message.substring(0, 50)}..." - Retrieved ${docs.length} docs`,
    );

    return {
      message: answer,
      spaceId,
      sources,
    };
  }

  private async verifySpaceAccess(spaceId: string, ctx: RequestContext): Promise<void> {
    let where: any = eq(schema.space.id, spaceId);
    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    } else {
      where = and(where, eq(schema.space.userId, ctx.userId));
    }

    const [space] = await this.db.db
      .select({ id: schema.space.id })
      .from(schema.space)
      .where(where);

    if (!space) {
      throw new NotFoundException(`Space ${spaceId} not found`);
    }
  }
}
