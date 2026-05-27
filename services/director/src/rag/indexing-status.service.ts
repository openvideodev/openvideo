import { Injectable, Logger } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { RequestContext } from "../common/request-context";

export type IndexingStatus = "pending" | "processing" | "completed" | "failed";
export type IndexingStage = "downloading" | "transcribing" | "analyzing" | "embedding" | "storing";

export interface IndexingStatusResponse {
  id: string;
  assetId: string;
  spaceId: string;
  status: IndexingStatus;
  progress: number;
  stage: IndexingStage | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IndexingStatusService {
  private readonly logger = new Logger(IndexingStatusService.name);

  constructor(private db: DrizzleService) {}

  /**
   * Create initial pending status record when asset is registered
   */
  async createStatus(
    assetId: string,
    spaceId: string,
    ctx?: RequestContext,
  ): Promise<IndexingStatusResponse> {
    const id = nanoid();

    const values: any = {
      id,
      assetId,
      spaceId,
      status: "pending" as const,
      progress: 0,
      updatedAt: new Date(),
    };

    if (ctx?.orgId) {
      values.orgId = ctx.orgId;
    }

    const [row] = await this.db.db
      .insert(schema.assetIndexingStatus)
      .values(values)
      .onConflictDoUpdate({
        target: schema.assetIndexingStatus.assetId,
        set: {
          status: "pending",
          progress: 0,
          stage: null,
          error: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    this.logger.log(`Created indexing status for asset ${assetId}: ${row.status}`);
    return this.toResponse(row);
  }

  /**
   * Mark indexing as started (when worker picks up job)
   */
  async markStarted(assetId: string, jobId: string): Promise<void> {
    await this.db.db
      .update(schema.assetIndexingStatus)
      .set({
        status: "processing",
        jobId,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.assetIndexingStatus.assetId, assetId));

    this.logger.log(`Marked indexing as started for asset ${assetId}, job ${jobId}`);
  }

  /**
   * Update progress and current stage
   */
  async updateProgress(assetId: string, progress: number, stage?: IndexingStage): Promise<void> {
    const updates: any = {
      progress,
      updatedAt: new Date(),
    };
    if (stage) updates.stage = stage;

    await this.db.db
      .update(schema.assetIndexingStatus)
      .set(updates)
      .where(eq(schema.assetIndexingStatus.assetId, assetId));
  }

  /**
   * Mark indexing as completed
   */
  async markCompleted(assetId: string): Promise<void> {
    await this.db.db
      .update(schema.assetIndexingStatus)
      .set({
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.assetIndexingStatus.assetId, assetId));

    this.logger.log(`Marked indexing as completed for asset ${assetId}`);
  }

  /**
   * Mark indexing as failed
   */
  async markFailed(assetId: string, error: string): Promise<void> {
    await this.db.db
      .update(schema.assetIndexingStatus)
      .set({
        status: "failed",
        error: error.substring(0, 500), // Limit error length
        updatedAt: new Date(),
      })
      .where(eq(schema.assetIndexingStatus.assetId, assetId));

    this.logger.error(`Marked indexing as failed for asset ${assetId}: ${error}`);
  }

  /**
   * Get status for a single asset
   */
  async getStatus(assetId: string, ctx?: RequestContext): Promise<IndexingStatusResponse | null> {
    let where = eq(schema.assetIndexingStatus.assetId, assetId);

    // If org context provided, ensure asset belongs to org
    if (ctx?.orgId) {
      where = and(where, eq(schema.assetIndexingStatus.orgId, ctx.orgId))!;
    }

    const [row] = await this.db.db.select().from(schema.assetIndexingStatus).where(where);

    return row ? this.toResponse(row) : null;
  }

  /**
   * Get all indexing statuses for a project
   */
  async getStatusesBySpace(
    spaceId: string,
    ctx?: RequestContext,
  ): Promise<IndexingStatusResponse[]> {
    let where = eq(schema.assetIndexingStatus.spaceId, spaceId);

    if (ctx?.orgId) {
      where = and(where, eq(schema.assetIndexingStatus.orgId, ctx.orgId))!;
    }

    const rows = await this.db.db
      .select()
      .from(schema.assetIndexingStatus)
      .where(where)
      .orderBy(schema.assetIndexingStatus.updatedAt);

    return rows.map(this.toResponse);
  }

  /**
   * Get pending/completed counts for a project (for bulk status UI)
   */
  async getSpaceIndexingSummary(spaceId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const rows = await this.db.db
      .select({ status: schema.assetIndexingStatus.status })
      .from(schema.assetIndexingStatus)
      .where(eq(schema.assetIndexingStatus.spaceId, spaceId));

    const summary = {
      total: rows.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const row of rows) {
      if (row.status === "pending") summary.pending++;
      else if (row.status === "processing") summary.processing++;
      else if (row.status === "completed") summary.completed++;
      else if (row.status === "failed") summary.failed++;
    }

    return summary;
  }

  private toResponse(row: typeof schema.assetIndexingStatus.$inferSelect): IndexingStatusResponse {
    return {
      id: row.id,
      assetId: row.assetId,
      spaceId: row.spaceId,
      status: row.status as IndexingStatus,
      progress: row.progress ?? 0,
      stage: row.stage as IndexingStage | null,
      error: row.error ?? null,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
