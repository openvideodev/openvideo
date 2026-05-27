import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { IProject } from "@openvideo/core";
import { eq, and } from "drizzle-orm";

export type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private sql!: ReturnType<typeof postgres>;
  db!: Db;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>("DATABASE_URL");
    this.sql = postgres(url, { max: 10 });
    this.db = drizzle(this.sql, { schema });
    this.logger.log("Drizzle connected");
  }

  async onModuleDestroy() {
    await this.sql.end();
  }

  // ── Space helpers ───────────────────────────────────────────────────────────

  async loadSpaceSnapshot(spaceId: string): Promise<IProject | null> {
    const [row] = await this.db
      .select({ data: schema.space.data })
      .from(schema.space)
      .where(eq(schema.space.id, spaceId));

    if (!row?.data) return null;
    return row.data as unknown as IProject;
  }

  async loadProjectData(
    spaceId: string,
  ): Promise<{ width: number; height: number; fps: number; data: any } | null> {
    // Find the project by spaceId
    const [projectRow] = await this.db
      .select()
      .from(schema.project)
      .where(eq(schema.project.spaceId, spaceId));

    if (!projectRow) return null;

    return {
      width: projectRow.width,
      height: projectRow.height,
      fps: projectRow.fps,
      data: projectRow.data,
    };
  }

  async saveSpaceSnapshot(spaceId: string, snapshot: IProject): Promise<void> {
    await this.db
      .insert(schema.space)
      .values({
        id: spaceId,
        name: (snapshot as any).name || "Untitled Space",
        userId: (snapshot as any).userId || "unknown",
        data: snapshot as any,
      })
      .onConflictDoUpdate({
        target: schema.space.id,
        set: {
          data: snapshot as any,
          updatedAt: new Date(),
        },
      });
  }

  // ── DirectorSession helpers ───────────────────────────────────────────────────

  async findSession(spaceId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.directorSession)
      .where(
        and(eq(schema.directorSession.spaceId, spaceId), eq(schema.directorSession.userId, userId)),
      );
    return row ?? null;
  }

  async findSessionById(sessionId: string) {
    const [row] = await this.db
      .select()
      .from(schema.directorSession)
      .where(eq(schema.directorSession.id, sessionId));
    return row ?? null;
  }

  async createSession(spaceId: string, userId: string) {
    const id = crypto.randomUUID();
    const [row] = await this.db
      .insert(schema.directorSession)
      .values({ id, spaceId, userId, historyJson: [] })
      .returning();
    return row;
  }

  async updateSessionHistory(sessionId: string, historyJson: any[]) {
    await this.db
      .update(schema.directorSession)
      .set({ historyJson, updatedAt: new Date() })
      .where(eq(schema.directorSession.id, sessionId));
  }

  async updateSessionPendingPlan(sessionId: string, pendingPlan: any | null) {
    await this.db
      .update(schema.directorSession)
      .set({ pendingPlan, updatedAt: new Date() })
      .where(eq(schema.directorSession.id, sessionId));
  }
}
