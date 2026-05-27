import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { SpaceAssetsService, CreateSpaceAssetDto } from "./space-assets.service";
import { Ctx, RequestContext } from "../common/request-context";

@Controller("spaces/:spaceId/assets")
@UseGuards(JwtGuard)
export class SpaceAssetsController {
  constructor(private spaceAssetsService: SpaceAssetsService) {}

  /**
   * Register a new asset in the space (auto-indexes by default)
   * Query: ?index=false to skip indexing
   */
  @Post()
  async create(
    @Param("spaceId") spaceId: string,
    @Body() dto: CreateSpaceAssetDto,
    @Query("index") indexParam: string,
    @Ctx() ctx: RequestContext,
  ) {
    const autoIndex = indexParam !== "false";
    return this.spaceAssetsService.create(spaceId, dto, ctx, autoIndex);
  }

  /**
   * List all assets in the space (with indexing status)
   */
  @Get()
  async findAll(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    return this.spaceAssetsService.findAll(spaceId, ctx);
  }

  /**
   * Get a single asset with its indexing status
   */
  @Get(":assetId")
  async findOne(
    @Param("spaceId") spaceId: string,
    @Param("assetId") assetId: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.spaceAssetsService.getOne(spaceId, assetId, ctx);
  }

  /**
   * Delete an asset
   */
  @Delete(":assetId")
  async delete(
    @Param("spaceId") spaceId: string,
    @Param("assetId") assetId: string,
    @Ctx() ctx: RequestContext,
  ) {
    await this.spaceAssetsService.delete(spaceId, assetId, ctx);
    return { status: "deleted", assetId };
  }

  /**
   * Trigger indexing for an asset (or re-index)
   */
  @Post(":assetId/index")
  async triggerIndex(
    @Param("spaceId") spaceId: string,
    @Param("assetId") assetId: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.spaceAssetsService.triggerIndex(spaceId, assetId, ctx);
  }

  /**
   * Get indexing status for an asset
   */
  @Get(":assetId/index/status")
  async getIndexStatus(
    @Param("spaceId") spaceId: string,
    @Param("assetId") assetId: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.spaceAssetsService.getIndexStatus(spaceId, assetId, ctx);
  }
}
