import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generateImageTask, generateVideoTask } from "../../trigger/media-generation";
import type { indexAssetTask } from "../../trigger/index-asset";
import type {
  generateElevenLabsAudioTask,
  ElevenLabsAudioPayload,
} from "../../trigger/elevenlabs-audio";

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(private configService: ConfigService) {}

  async generateImage(spaceId: string, stepId: string, prompt: string): Promise<any> {
    this.logger.log(`Triggering image generation for space ${spaceId}, step ${stepId}`);

    return await tasks.trigger<typeof generateImageTask>("generate-image", {
      spaceId,
      stepId,
      prompt,
    });
  }

  async generateVideo(
    spaceId: string,
    stepId: string,
    imageUrl: string,
    prompt: string,
  ): Promise<any> {
    this.logger.log(`Triggering video generation for space ${spaceId}, step ${stepId}`);

    return await tasks.trigger<typeof generateVideoTask>("generate-video", {
      spaceId,
      stepId,
      imageUrl,
      prompt,
    });
  }

  async generateElevenLabsAudio(
    spaceId: string,
    stepId: string,
    prompt: string,
    durationSeconds: number,
    audioType: ElevenLabsAudioPayload["audioType"],
  ): Promise<any> {
    this.logger.log(
      `Triggering ElevenLabs audio (${audioType}) for space ${spaceId}, step ${stepId}`,
    );

    return await tasks.trigger<typeof generateElevenLabsAudioTask>("generate-elevenlabs-audio", {
      spaceId,
      stepId,
      prompt,
      durationSeconds,
      audioType,
    });
  }

  async triggerIndexAsset(spaceId: string, assetId: string): Promise<string> {
    this.logger.log(`Triggering asset indexing for asset ${assetId} in space ${spaceId}`);
    const handle = await tasks.trigger<typeof indexAssetTask>("index-asset", { spaceId, assetId });
    return handle.id;
  }
}
