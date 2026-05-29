import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { SpacesService, CreateSpaceDto } from "./spaces.service";
import { Ctx, RequestContext } from "../common/request-context";

@Controller("spaces")
export class SpacesController {
  constructor(private spacesService: SpacesService) {}

  /**
   * Create a new space
   */
  @Post()
  async create(@Body() dto: CreateSpaceDto, @Ctx() ctx: RequestContext) {
    return this.spacesService.create(dto, ctx);
  }

  /**
   * List all spaces for the current user/org
   */
  @Get()
  async findAll(@Ctx() ctx: RequestContext) {
    return this.spacesService.findAll(ctx);
  }

  /**
   * Get a single space by ID
   */
  @Get(":spaceId")
  async findOne(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    return this.spacesService.getOne(spaceId, ctx);
  }

  /**
   * Update a space
   */
  @Put(":spaceId")
  async update(
    @Param("spaceId") spaceId: string,
    @Body() dto: Partial<CreateSpaceDto>,
    @Ctx() ctx: RequestContext,
  ) {
    return this.spacesService.update(spaceId, dto, ctx);
  }

  /**
   * Delete a space
   */
  @Delete(":spaceId")
  async delete(@Param("spaceId") spaceId: string, @Ctx() ctx: RequestContext) {
    await this.spacesService.delete(spaceId, ctx);
    return { status: "deleted", spaceId };
  }
}
