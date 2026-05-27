import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { RequestContext } from "../common/request-context";

export interface CreateSpaceDto {
  name: string;
  data?: any;
}

export interface SpaceResponse {
  id: string;
  spaceId: string; // Alias for id, API-friendly
  name: string;
  userId: string;
  orgId?: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);

  constructor(private db: DrizzleService) {}

  async create(dto: CreateSpaceDto, ctx: RequestContext): Promise<SpaceResponse> {
    const id = nanoid();

    const values: any = {
      id,
      name: dto.name,
      userId: ctx.userId,
      data: dto.data ?? {},
      updatedAt: new Date(),
    };

    if (ctx.orgId) {
      values.orgId = ctx.orgId;
    }

    const [row] = await this.db.db.insert(schema.space).values(values).returning();

    this.logger.log(`Created space ${id} for user ${ctx.userId}`);
    return this.toResponse(row);
  }

  async findAll(ctx: RequestContext): Promise<SpaceResponse[]> {
    let where: any = eq(schema.space.userId, ctx.userId);

    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    }

    const rows = await this.db.db
      .select()
      .from(schema.space)
      .where(where)
      .orderBy(desc(schema.space.updatedAt));

    return rows.map(this.toResponse);
  }

  async findOne(spaceId: string, ctx: RequestContext): Promise<SpaceResponse | null> {
    let where: any = eq(schema.space.id, spaceId);

    // Scope by user or org
    if (ctx.orgId) {
      where = and(where, eq(schema.space.orgId, ctx.orgId));
    } else {
      where = and(where, eq(schema.space.userId, ctx.userId));
    }

    const [row] = await this.db.db.select().from(schema.space).where(where);

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
    // Verify access first
    await this.getOne(spaceId, ctx);

    const updates: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.data !== undefined) updates.data = dto.data;

    const [row] = await this.db.db
      .update(schema.space)
      .set(updates)
      .where(eq(schema.space.id, spaceId))
      .returning();

    return this.toResponse(row);
  }

  async delete(spaceId: string, ctx: RequestContext): Promise<void> {
    // Verify access first
    await this.getOne(spaceId, ctx);

    await this.db.db.delete(schema.space).where(eq(schema.space.id, spaceId));

    this.logger.log(`Deleted space ${spaceId}`);
  }

  private toResponse(row: typeof schema.space.$inferSelect): SpaceResponse {
    return {
      id: row.id,
      spaceId: row.id, // API-friendly alias
      name: row.name,
      userId: row.userId,
      orgId: row.orgId ?? undefined,
      data: row.data,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
