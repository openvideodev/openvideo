import { getDB, schema, eq, and } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { RequestContext } from "../common/request-context";

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  async findAssetById(assetId: string, ctx?: RequestContext) {
    // Build where clause - optionally scope by orgId for multi-tenancy
    let where = eq(schema.asset.id, assetId);
    if (ctx?.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId))!;
    }

    const [row] = await db.select().from(schema.asset).where(where);
    return row ?? null;
  }

  async findAssetsBySpace(spaceId: string, ctx?: RequestContext) {
    // Build where clause - optionally scope by orgId for multi-tenancy
    let where = eq(schema.asset.spaceId, spaceId);
    if (ctx?.orgId) {
      where = and(where, eq(schema.asset.orgId, ctx.orgId))!;
    }

    return db.select().from(schema.asset).where(where);
  }

  async registerAsset(data: {
    id: string;
    spaceId: string;
    name: string;
    type: "image" | "video" | "audio" | "other";
    src: string;
    duration?: number;
    size?: number;
    userId: string;
  }) {
    const [row] = await db.insert(schema.asset).values(data).returning();
    return row;
  }
}
