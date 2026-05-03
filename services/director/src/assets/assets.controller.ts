import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { R2Service } from '../storage/r2.service';
import { JwtGuard } from '../auth/jwt.guard';
import { nanoid } from 'nanoid';

@Controller('assets')
@UseGuards(JwtGuard)
export class AssetsController {
  constructor(private r2Service: R2Service) {}

  /**
   * Request a signed URL for direct-to-R2 upload
   */
  @Post('upload-url')
  async getUploadUrl(@Body() body: { filename: string; contentType: string; projectId: string }) {
    const { filename, contentType, projectId } = body;
    
    // Create a safe, unique key: projects/{projectId}/{nanoId}-{filename}
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `projects/${projectId}/${nanoid(8)}-${safeFilename}`;
    
    return this.r2Service.getUploadUrl(key, contentType);
  }
}
