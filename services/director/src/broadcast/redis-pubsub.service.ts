import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BroadcastService } from './broadcast.service';
import { CoreRegistryService } from '../core/core-registry.service';
import { Command, loadClip } from '@openvideo/core';
import { nanoid } from 'nanoid';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private subClient: Redis;

  constructor(
    private configService: ConfigService,
    private broadcastService: BroadcastService,
    private coreRegistry: CoreRegistryService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return;

    this.subClient = new Redis(redisUrl);

    // Subscribe to all project update channels
    await this.subClient.psubscribe('project:updates:*');

    this.subClient.on('pmessage', async (pattern, channel, message) => {
      try {
        const projectId = channel.split(':').pop();
        if (!projectId) return;

        const data = JSON.parse(message);
        this.logger.log(`Received update for project ${projectId}: ${data.type} (Status: ${data.status})`);
        
        // If the task is done, apply the result to the project core
        if (data.type === 'plan.step' && data.status === 'done' && data.result) {
          await this.applyTaskResult(projectId, data.result);
        }

        this.broadcastService.broadcast(projectId, data);
      } catch (error) {
        this.logger.error(`Failed to handle Redis message: ${error.message}`);
      }
    });

    this.logger.log('Redis Pub/Sub listener initialized');
  }

  private async applyTaskResult(projectId: string, result: { imageUrl?: string; videoUrl?: string; prompt?: string }) {
    const core = await this.coreRegistry.get(projectId);
    
    const src = result.imageUrl || result.videoUrl;
    if (!src) return;

    let clipPayload: any = {
      type: result.videoUrl ? 'Video' : 'Image',
      name: result.prompt || (result.videoUrl ? 'Generated Video' : 'Generated Image'),
      src,
      display: { from: 0, to: 5000000 }, // Default 5s
    };

    
    const state = core.getSnapshot();
    try {

      clipPayload = await loadClip(clipPayload, {
        canvasSize: { width: state.settings.width, height: state.settings.height }
      });
    } catch (e) {
      this.logger.error(`Failed to load clip for generated media: ${e.message}`);
      return;
    }

    const command: Command = {
      id: nanoid(),
      type: 'clip.add',
      payload: {
        clip: clipPayload
      },
      meta: { source: 'agent' },
    };

    core.execute(command);
    await this.coreRegistry.persist(projectId);
    this.logger.log(`Applied and persisted media update for project ${projectId}`);

    // Notify the user in the chat that the generated asset was added
    this.broadcastService.broadcast(projectId, {
      type: 'chat.response',
      message: `✅ Finished generating **${clipPayload.name}** and added it to your project.`,
    });
  }

  async onModuleDestroy() {
    if (this.subClient) {
      await this.subClient.quit();
    }
  }
}
