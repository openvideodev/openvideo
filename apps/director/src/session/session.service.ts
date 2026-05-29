import { Injectable, Logger } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private db: DrizzleService) {}

  async getOrCreateSession(projectId: string, userId: string): Promise<string> {
    let session = await this.db.findSession(projectId, userId);

    if (!session) {
      session = await this.db.createSession(projectId, userId);
      this.logger.log(
        `Created new session ${session.id} for user ${userId} in project ${projectId}`,
      );
    }

    return session.id;
  }

  async getHistory(sessionId: string): Promise<BaseMessage[]> {
    const session = await this.db.findSessionById(sessionId);
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
    const session = await this.db.findSessionById(sessionId);
    if (!session) return;

    const currentHistory = (session.historyJson as any[]) || [];
    const newMessages = messages.map((m) => ({
      type: m._getType(),
      content: m.content,
    }));

    await this.db.updateSessionHistory(sessionId, [...currentHistory, ...newMessages]);
  }
}
