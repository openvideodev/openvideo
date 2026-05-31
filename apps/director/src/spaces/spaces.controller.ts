import { getDB, schema, eq, and, desc } from "@openvideo/db";
const db = getDB();

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { SpacesService, CreateSpaceDto } from "./spaces.service";
import { JwtGuard } from "../auth/jwt.guard";
import { Ctx, RequestContext } from "../common/request-context";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Controller("spaces")
@UseGuards(JwtGuard)
export class SpacesController {
  constructor(
    private spacesService: SpacesService,
    @InjectQueue("index-project") private indexQueue: Queue,
  ) {}

  /** GET /spaces - List all spaces for the authenticated user */
  @Get()
  async findAll(@Ctx() ctx: RequestContext) {
    return this.spacesService.findAll(ctx);
  }

  /** POST /spaces - Create a new space */
  @Post()
  async create(@Body() body: CreateSpaceDto, @Ctx() ctx: RequestContext) {
    return this.spacesService.create(body, ctx);
  }

  /** GET /spaces/:id - Get a single space */
  @Get(":id")
  async findOne(@Param("id") id: string, @Ctx() ctx: RequestContext) {
    const space = await this.spacesService.findOne(id, ctx);
    if (!space) {
      throw new NotFoundException(`Space ${id} not found`);
    }
    return space;
  }

  /** PATCH /spaces/:id - Update a space */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: Partial<CreateSpaceDto>,
    @Ctx() ctx: RequestContext,
  ) {
    return this.spacesService.update(id, body, ctx);
  }

  /** DELETE /spaces/:id - Delete a space */
  @Delete(":id")
  async remove(@Param("id") id: string, @Ctx() ctx: RequestContext) {
    await this.spacesService.delete(id, ctx);
    return { success: true };
  }

  /**
   * POST /spaces/:id/sync - Trigger background RAG re-indexing of a space.
   * Called by the editor UI when the project has structural changes.
   */
  @Post(":id/sync")
  async sync(@Param("id") id: string, @Ctx() ctx: RequestContext) {
    // Verify access
    await this.spacesService.getOne(id, ctx);
    await this.indexQueue.add("index", { projectId: id });
    return { status: "queued", spaceId: id };
  }
}
