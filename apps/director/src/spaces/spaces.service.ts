import { getDB, schema, eq, and, desc } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { RequestContext } from "../common/request-context";

export interface CreateSpaceDto {
  name: string;
  description?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  fps?: number;
  scene?: {
    tracks: any[];
    clips: Record<string, any>;
    settings?: any;
  };
  data?: any;
}

export interface SpaceResponse {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  width: number;
  height: number;
  fps: number;
  scene: {
    tracks: any[];
    clips: Record<string, any>;
    settings?: any;
  };
  userId: string;
  orgId?: string;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);

  async create(dto: CreateSpaceDto, ctx: RequestContext): Promise<SpaceResponse> {
    const id = nanoid();

    const values: any = {
      id,
      name: dto.name,
      description: dto.description,
      thumbnail: dto.thumbnail,
      width: dto.width ?? 1080,
      height: dto.height ?? 1920,
      fps: dto.fps ?? 30,
      scene: dto.scene ?? { tracks: [], clips: {}, settings: {} },
      data: dto.data ?? null,
      userId: ctx.userId,
      updatedAt: new Date(),
    };

    if (ctx.orgId) {
      values.orgId = ctx.orgId;
    }

    const [row] = await db.insert(schema.space).values(values).returning();

    this.logger.log(`Created space ${id} for user ${ctx.userId}`);
    return this.toResponse(row);
  }

  async findAll(ctx: RequestContext): Promise<SpaceResponse[]> {
    let where: any = eq(schema.space.userId, ctx.userId);

    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    }

    const rows = await db
      .select()
      .from(schema.space)
      .where(where)
      .orderBy(desc(schema.space.updatedAt));

    return rows.map(this.toResponse);
  }

  async findOne(spaceId: string, ctx: RequestContext): Promise<SpaceResponse | null> {
    let where: any = eq(schema.space.id, spaceId);

    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    } else {
      where = and(where, eq(schema.space.userId, ctx.userId));
    }

    const [row] = await db.select().from(schema.space).where(where);

    return row ? this.toResponse(row) : null;
  }

  async getOne(spaceId: string, ctx: RequestContext): Promise<SpaceResponse> {
    const space = await this.findOne(spaceId, ctx);
    if (!space) {
      throw new NotFoundException(`Space ${spaceId} not found`);
    }
    return space;
  }

  async update(
    spaceId: string,
    dto: Partial<CreateSpaceDto>,
    ctx: RequestContext,
  ): Promise<SpaceResponse> {
    await this.getOne(spaceId, ctx);

    const updates: any = { updatedAt: new Date() };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.thumbnail !== undefined) updates.thumbnail = dto.thumbnail;
    if (dto.width !== undefined) updates.width = dto.width;
    if (dto.height !== undefined) updates.height = dto.height;
    if (dto.fps !== undefined) updates.fps = dto.fps;
    if (dto.scene !== undefined) updates.scene = dto.scene;
    if (dto.data !== undefined) updates.data = dto.data;

    const [row] = await db
      .update(schema.space)
      .set(updates)
      .where(eq(schema.space.id, spaceId))
      .returning();

    return this.toResponse(row);
  }

  async delete(spaceId: string, ctx: RequestContext): Promise<void> {
    await this.getOne(spaceId, ctx);
    await db.delete(schema.space).where(eq(schema.space.id, spaceId));
    this.logger.log(`Deleted space ${spaceId}`);
  }

  private toResponse(row: typeof schema.space.$inferSelect): SpaceResponse {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      thumbnail: row.thumbnail ?? undefined,
      width: row.width,
      height: row.height,
      fps: row.fps,
      scene: (row.scene as any) ?? { tracks: [], clips: {}, settings: {} },
      userId: row.userId,
      orgId: row.orgId ?? undefined,
      data: row.data ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
