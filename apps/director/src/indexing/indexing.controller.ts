import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { IndexingService } from "./indexing.service";
import { Ctx, RequestContext } from "../common/request-context";

@Controller("spaces/:spaceId/index")
export class IndexingController {
  constructor(private indexingService: IndexingService) {}

  /**
   * Trigger bulk indexing for all assets in the space
   * (re-indexes existing, indexes pending)
   */
  @Post()
  async triggerBulkIndex(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    return this.indexingService.triggerBulkIndex(spaceId, ctx);
  }

  /**
   * Get overall indexing progress for the space
   */
  @Get("status")
  async getBulkStatus(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    return this.indexingService.getBulkStatus(spaceId, ctx);
  }

  /**
   * Get list of indexed assets (completed indexing)
   * Query params: ?status=completed|failed|processing|pending
   */
  @Get("assets")
  async getIndexedAssets(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    return this.indexingService.getIndexedAssets(spaceId, ctx);
  }
}
