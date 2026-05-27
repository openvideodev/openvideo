import { Injectable, Logger } from "@nestjs/common";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { RequestContext } from "../common/request-context";

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private db: DrizzleService) {}

  async findAssetById(assetId: string, ctx?: RequestContext) {
    // Build where clause - optionally scope by orgId for multi-tenancy
    let where = eq(schema.asset.id, assetId);
    if (ctx?.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId))!;
    }

    const [row] = await this.db.db.select().from(schema.asset).where(where);
    return row ?? null;
  }

  async findAssetsBySpace(spaceId: string, ctx?: RequestContext) {
    // Build where clause - optionally scope by orgId for multi-tenancy
    let where = eq(schema.asset.spaceId, spaceId);
    if (ctx?.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId))!;
    }

    return this.db.db.select().from(schema.asset).where(where);
  }

  async registerAsset(data: {
    id: string;
    spaceId: string;
    name: string;
    type: string;
    src: string;
    duration?: number;
    size?: number;
  }) {
    const [row] = await this.db.db.insert(schema.asset).values(data).returning();
    return row;
  }
}
