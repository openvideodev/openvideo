import { getDB, schema, eq, and } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { nanoid } from "nanoid";

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  async getOrCreateSession(projectId: string, userId: string): Promise<string> {
    // Try to find existing session for this space+user
    const [existing] = await db
      .select()
      .from(schema.directorSession)
      .where(
        and(
          eq(schema.directorSession.spaceId, projectId),
          eq(schema.directorSession.userId, userId),
        ),
      )
      .limit(1);

    if (existing) return existing.id;

    // Create new session
    const [created] = await db
      .insert(schema.directorSession)
      .values({
        id: nanoid(),
        spaceId: projectId,
        userId,
        historyJson: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.logger.log(`Created new session ${created.id} for user ${userId} in project ${projectId}`);
    return created.id;
  }

  async getHistory(sessionId: string): Promise<BaseMessage[]> {
    const [session] = await db
      .select()
      .from(schema.directorSession)
      .where(eq(schema.directorSession.id, sessionId))
      .limit(1);

    if (!session?.historyJson) return [];

    const rawHistory = session.historyJson as any[];
    return rawHistory.map((msg) => {
      if (msg.type === "human") return new HumanMessage(msg.content);
      if (msg.type === "ai") return new AIMessage(msg.content);
      if (msg.type === "system") return new SystemMessage(msg.content);
      return new HumanMessage(msg.content);
    });
  }

  async appendMessages(sessionId: string, messages: BaseMessage[]): Promise<void> {
    const [session] = await db
      .select()
      .from(schema.directorSession)
      .where(eq(schema.directorSession.id, sessionId))
      .limit(1);

    if (!session) return;

    const currentHistory = (session.historyJson as any[]) || [];
    const newMessages = messages.map((m) => ({
      type: m._getType(),
      content: m.content,
    }));

    await db
      .update(schema.directorSession)
      .set({ historyJson: [...currentHistory, ...newMessages], updatedAt: new Date() })
      .where(eq(schema.directorSession.id, sessionId));
  }
}
