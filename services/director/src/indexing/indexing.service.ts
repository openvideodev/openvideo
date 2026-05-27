import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { RequestContext } from "../common/request-context";
import { IndexingStatusService } from "../rag/indexing-status.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TriggerService } from "../trigger/trigger.service";

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private db: DrizzleService,
    private indexingStatus: IndexingStatusService,
    private triggerService: TriggerService,
    @InjectQueue("index-project") private projectIndexQueue: Queue,
  ) {}

  /**
   * Trigger bulk indexing for all assets in a space
   */
  async triggerBulkIndex(
    spaceId: string,
    ctx: RequestContext,
  ): Promise<{
    spaceId: string;
    queued: number;
    jobIds: string[];
  }> {
    // Verify space access
    await this.verifySpaceAccess(spaceId, ctx);

    // Get all assets in the space
    let where: any = eq(schema.asset.spaceId, spaceId);
    if (ctx.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId));
    }

    const assets = await this.db.db.select({ id: schema.asset.id }).from(schema.asset).where(where);

    // Queue indexing for each asset
    const jobIds: string[] = [];
    for (const asset of assets) {
      // Reset/create status
      await this.indexingStatus.createStatus(asset.id, spaceId, ctx);
      // Dispatch to Trigger.dev
      const triggerId = await this.triggerService.triggerIndexAsset(spaceId, asset.id);
      jobIds.push(triggerId);
    }

    // Also trigger project-level indexing (structural)
    await this.projectIndexQueue.add("index", { spaceId: spaceId });

    this.logger.log(`Triggered bulk indexing for ${assets.length} assets in space ${spaceId}`);

    return {
      spaceId,
      queued: assets.length,
      jobIds,
    };
  }

  /**
   * Get overall indexing progress for the space
   */
  async getBulkStatus(
    spaceId: string,
    ctx: RequestContext,
  ): Promise<{
    spaceId: string;
    summary: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    progress: number; // Overall percentage
  }> {
    // Verify space access
    await this.verifySpaceAccess(spaceId, ctx);

    const summary = await this.indexingStatus.getSpaceIndexingSummary(spaceId);

    // Calculate overall progress
    const progress =
      summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);

    return {
      spaceId,
      summary,
      progress,
    };
  }

  /**
   * Get list of assets with their indexing status
   */
  async getIndexedAssets(
    spaceId: string,
    ctx: RequestContext,
  ): Promise<{
    spaceId: string;
    assets: Array<{
      id: string;
      name: string;
      type: string;
      indexing: {
        status: string;
        progress: number;
        stage: string | null;
        error: string | null;
      };
    }>;
  }> {
    // Verify space access
    await this.verifySpaceAccess(spaceId, ctx);

    // Get all assets in space
    let where: any = eq(schema.asset.spaceId, spaceId);
    if (ctx.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId));
    }

    const assets = await this.db.db
      .select({
        id: schema.asset.id,
        name: schema.asset.name,
        type: schema.asset.type,
      })
      .from(schema.asset)
      .where(where);

    // Get indexing statuses
    const statuses = await Promise.all(assets.map((a) => this.indexingStatus.getStatus(a.id, ctx)));

    return {
      spaceId,
      assets: assets.map((asset, i) => {
        const status = statuses[i];
        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          indexing: status
            ? {
                status: status.status,
                progress: status.progress,
                stage: status.stage,
                error: status.error,
              }
            : {
                status: "pending",
                progress: 0,
                stage: null,
                error: null,
              },
        };
      }),
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
