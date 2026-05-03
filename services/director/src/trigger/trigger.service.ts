import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tasks } from '@trigger.dev/sdk/v3';
import type { generateImageTask, generateVideoTask } from '../../trigger/media-generation';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(private configService: ConfigService) {}

  async generateImage(projectId: string, stepId: string, prompt: string): Promise<any> {
    this.logger.log(`Triggering image generation for project ${projectId}, step ${stepId}`);
    
    return await tasks.trigger<typeof generateImageTask>('generate-image', {
      projectId,
      stepId,
      prompt,
    });
  }

  async generateVideo(projectId: string, stepId: string, imageUrl: string, prompt: string): Promise<any> {
    this.logger.log(`Triggering video generation for project ${projectId}, step ${stepId}`);

    return await tasks.trigger<typeof generateVideoTask>('generate-video', {
      projectId,
      stepId,
      imageUrl,
      prompt,
    });
  }
}
