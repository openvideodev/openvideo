import { getDB, schema, eq, and, desc, sql } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { RequestContext } from "../common/request-context";
import { IndexingStatusService } from "../rag/indexing-status.service";
import { TriggerService } from "../trigger/trigger.service";

export interface CreateSpaceAssetDto {
  id?: string;
  name: string;
  type: "image" | "video" | "audio";
  src: string;
  duration?: number;
  size?: number;
}

export interface SpaceAssetResponse {
  id: string;
  spaceId: string;
  projectId: string; // Alias for spaceId
  name: string;
  type: string;
  src: string;
  duration?: number;
  size?: number;
  orgId?: string;
  createdAt: Date;
  updatedAt: Date;
  indexing?: {
    status: string;
    progress: number;
    stage: string | null;
  } | null;
}

@Injectable()
export class SpaceAssetsService {
  private readonly logger = new Logger(SpaceAssetsService.name);

  constructor(
    private indexingStatus: IndexingStatusService,
    private triggerService: TriggerService,
  ) {}

  async create(
    spaceId: string,
    dto: CreateSpaceAssetDto,
    ctx: RequestContext,
    autoIndex: boolean = true,
  ): Promise<SpaceAssetResponse> {
    const id = dto.id ?? nanoid();

    const values: any = {
      id,
      spaceId: spaceId,
      name: dto.name,
      type: dto.type,
      src: dto.src,
      duration: dto.duration,
      size: dto.size,
      updatedAt: new Date(),
    };

    if (ctx.orgId) {
      values.orgId = ctx.orgId;
    }

    const [row] = await db
      .insert(schema.asset)
      .values(values)
      .onConflictDoUpdate({
        target: schema.asset.id,
        set: {
          name: dto.name,
          type: dto.type,
          src: dto.src,
          duration: dto.duration,
          size: dto.size,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Create indexing status and enqueue
    let indexingStatus = null;
    if (autoIndex) {
      await this.indexingStatus.createStatus(id, spaceId, ctx);
      await this.enqueueIndexJob(spaceId, id);
      indexingStatus = await this.indexingStatus.getStatus(id, ctx);
    }

    this.logger.log(`Created asset ${id} in space ${spaceId}`);
    return this.toResponse(row, indexingStatus);
  }

  async findAll(spaceId: string, ctx: RequestContext): Promise<SpaceAssetResponse[]> {
    // Verify space access
    await this.verifySpaceAccess(spaceId, ctx);

    let where: any = eq(schema.asset.spaceId, spaceId);
    if (ctx.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId));
    }

    const rows = await db
      .select()
      .from(schema.asset)
      .where(where)
      .orderBy(desc(schema.asset.createdAt));

    // Get indexing status for each asset
    const assetIds = rows.map((r: any) => r.id);
    const statuses = await Promise.all(
      assetIds.map((id: string) => this.indexingStatus.getStatus(id, ctx)),
    );
    const statusMap = new Map(statuses.filter(Boolean).map((s: any) => [s.assetId, s]));

    return rows.map((row: any) => this.toResponse(row, statusMap.get(row.id) ?? null));
  }

  async findOne(
    spaceId: string,
    assetId: string,
    ctx: RequestContext,
  ): Promise<SpaceAssetResponse | null> {
    let where: any = and(eq(schema.asset.id, assetId), eq(schema.asset.spaceId, spaceId));

    if (ctx.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId));
    }

    const [row] = await db.select().from(schema.asset).where(where);

    if (!row) return null;

    const indexingStatus = await this.indexingStatus.getStatus(assetId, ctx);
    return this.toResponse(row, indexingStatus);
  }

  async getOne(spaceId: string, assetId: string, ctx: RequestContext): Promise<SpaceAssetResponse> {
    const asset = await this.findOne(spaceId, assetId, ctx);
    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} not found in space ${spaceId}`);
    }
    return asset;
  }

  async delete(spaceId: string, assetId: string, ctx: RequestContext): Promise<void> {
    // Verify access
    await this.getOne(spaceId, assetId, ctx);

    await Promise.all([
      db.delete(schema.asset).where(eq(schema.asset.id, assetId)),
      db.delete(schema.assetIndexingStatus).where(eq(schema.assetIndexingStatus.assetId, assetId)),
      db
        .execute(sql`DELETE FROM langchain_pg_embedding WHERE cmetadata->>'assetId' = ${assetId}`)
        .catch((err: Error) => {
          this.logger.warn(`Could not delete vectors for asset ${assetId}: ${err.message}`);
        }),
    ]);

    this.logger.log(`Deleted asset ${assetId} from space ${spaceId}`);
  }

  async triggerIndex(
    spaceId: string,
    assetId: string,
    ctx: RequestContext,
  ): Promise<{ status: string; jobId: string }> {
    // Verify access
    await this.getOne(spaceId, assetId, ctx);

    // Reset status to pending and dispatch to Trigger.dev
    await this.indexingStatus.createStatus(assetId, spaceId, ctx);
    const triggerId = await this.enqueueIndexJob(spaceId, assetId);

    return { status: "queued", jobId: triggerId };
  }

  async getIndexStatus(
    spaceId: string,
    assetId: string,
    ctx: RequestContext,
  ): Promise<ReturnType<IndexingStatusService["getStatus"]>> {
    // Verify access
    await this.getOne(spaceId, assetId, ctx);

    return this.indexingStatus.getStatus(assetId, ctx);
  }

  private async enqueueIndexJob(spaceId: string, assetId: string): Promise<string> {
    return this.triggerService.triggerIndexAsset(spaceId, assetId);
  }

  private async verifySpaceAccess(spaceId: string, ctx: RequestContext): Promise<void> {
    // Quick check that space exists and user has access
    let where: any = eq(schema.space.id, spaceId);
    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    } else {
      where = and(where, eq(schema.space.userId, ctx.userId));
    }

    const [space] = await db.select({ id: schema.space.id }).from(schema.space).where(where);

    if (!space) {
      throw new NotFoundException(`Space ${spaceId} not found`);
    }
  }

  private toResponse(row: any, indexing: any): SpaceAssetResponse {
    return {
      id: row.id,
      spaceId: row.spaceId,
      projectId: row.spaceId, // Backward compat
      name: row.name,
      type: row.type,
      src: row.src,
      duration: row.duration ?? undefined,
      size: row.size ?? undefined,
      orgId: row.orgId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      indexing: indexing
        ? {
            status: indexing.status,
            progress: indexing.progress,
            stage: indexing.stage,
          }
        : null,
    };
  }
}
