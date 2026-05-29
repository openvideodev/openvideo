import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { IndexProjectWorker } from "./workers/index-project.worker";
import { TranscribeClipWorker } from "./workers/transcribe-clip.worker";
import { GenerateAudioWorker } from "./workers/generate-audio.worker";
import { GenerateImageWorker } from "./workers/generate-image.worker";
import { IndexAssetWorker } from "./workers/index-asset.worker";
import { RagModule } from "../rag/rag.module";
import { CoreModule } from "../core/core.module";
import { BroadcastModule } from "../broadcast/broadcast.module";

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");

        if (redisUrl) {
          // Parse connection URL (e.g. redis:// or rediss://)
          const url = new URL(redisUrl);
          const isTls = url.protocol === "rediss:";

          return {
            connection: {
              host: url.hostname,
              port: Number(url.port) || (isTls ? 6380 : 6379),
              username: url.username || undefined,
              password: url.password || undefined,
              tls: isTls ? {} : undefined, // Essential for Upstash
            },
            defaultJobOptions: {
              removeOnComplete: 100,
              removeOnFail: 100,
            },
            defaultWorkerOptions: {
              blockingTimeout: 30000,
            },
          };
        } else {
          // Fallback for local development if no redis URL is provided
          console.warn("No REDIS_URL provided, falling back to local redis on port 6379");
          return {
            connection: {
              host: "localhost",
              port: 6379,
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    // Register queues
    BullModule.registerQueue({ name: "index-project" }),
    BullModule.registerQueue({ name: "transcribe-clip" }),
    BullModule.registerQueue({ name: "generate-audio" }),
    BullModule.registerQueue({ name: "generate-image" }),
    BullModule.registerQueue({ name: "index-asset" }),
    RagModule,
    CoreModule,
    BroadcastModule,
  ],
  providers: [
    IndexProjectWorker,
    TranscribeClipWorker,
    GenerateAudioWorker,
    GenerateImageWorker,
    IndexAssetWorker,
  ],
  exports: [BullModule],
})
export class QueueModule {}
