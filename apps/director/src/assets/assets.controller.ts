import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { R2Service } from "../storage/r2.service";
import { AssetsService } from "./assets.service";
import { JwtGuard } from "../auth/jwt.guard";
import { nanoid } from "nanoid";

@Controller("assets")
export class AssetsController {
  constructor(
    private r2Service: R2Service,
    private assetsService: AssetsService,
  ) {}

  /**
   * Request a signed URL for direct-to-R2 upload
   */
  @Post("upload-url")
  async getUploadUrl(@Body() body: { filename: string; contentType: string; spaceId: string }) {
    const { filename, contentType, spaceId } = body;

    // Create a safe, unique key: spaces/{spaceId}/{nanoId}-{filename}
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `spaces/${spaceId}/${nanoid(8)}-${safeFilename}`;

    return this.r2Service.getUploadUrl(key, contentType);
  }

  /**
   * Register uploaded asset and enqueue indexing
   */
  @Post("register")
  async registerAsset(
    @Body()
    body: {
      id: string;
      spaceId: string;
      name: string;
      type: string;
      src: string;
      duration?: number;
      size?: number;
    },
  ) {
    const asset = await this.assetsService.registerAsset(body);
    return { status: "registered", asset };
  }
}
