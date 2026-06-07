import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ModalClient } from "modal";

export type ElevenLabsAudioType = "background-music" | "sound-effect";

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(private configService: ConfigService) {}

  async generateImage(spaceId: string, stepId: string, prompt: string): Promise<any> {
    this.logger.log(`Triggering Modal image generation for space ${spaceId}, step ${stepId}`);

    try {
      // Call Modal function using JS SDK
      const modal = new ModalClient();
      const generateImage = await modal.functions.fromName(
        "openvideo-media-generator",
        "generate_image",
      );

      const result = await generateImage.remote([spaceId, stepId, prompt]);
      this.logger.log(`Modal image generation triggered successfully`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to trigger Modal image generation:`, error.message);
      throw error;
    }
  }

  async generateVideo(
    spaceId: string,
    stepId: string,
    imageUrl: string,
    prompt: string,
  ): Promise<any> {
    this.logger.log(`Triggering Modal video generation for space ${spaceId}, step ${stepId}`);

    try {
      // Call Modal function using JS SDK
      const modal = new ModalClient();
      const generateVideo = await modal.functions.fromName(
        "openvideo-media-generator",
        "generate_video",
      );

      const result = await generateVideo.remote([spaceId, stepId, imageUrl, prompt]);
      this.logger.log(`Modal video generation triggered successfully`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to trigger Modal video generation:`, error.message);
      throw error;
    }
  }

  async generateElevenLabsAudio(
    spaceId: string,
    stepId: string,
    prompt: string,
    durationSeconds: number,
    audioType: ElevenLabsAudioType,
  ): Promise<any> {
    this.logger.log(
      `Triggering Modal ElevenLabs audio (${audioType}) for space ${spaceId}, step ${stepId}`,
    );

    try {
      // Call Modal function using JS SDK
      const modal = new ModalClient();
      const generateAudio = await modal.functions.fromName(
        "openvideo-media-generator",
        "generate_elevenlabs_audio",
      );

      const result = await generateAudio.remote([
        spaceId,
        stepId,
        prompt,
        durationSeconds,
        audioType,
      ]);
      this.logger.log(`Modal audio generation triggered successfully`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to trigger Modal audio generation:`, error.message);
      throw error;
    }
  }

  async triggerIndexAsset(spaceId: string, assetId: string): Promise<string> {
    this.logger.log(`Triggering Modal asset indexing for asset ${assetId} in space ${spaceId}`);

    try {
      // Call Modal function using JS SDK
      this.logger.log(`Calling Modal function for asset indexing: ${assetId}`);

      const modal = new ModalClient();
      const indexAsset = await modal.functions.fromName("openvideo-indexer", "index_asset");

      const result = await indexAsset.remote([assetId]);
      this.logger.log(`Modal asset indexing triggered successfully:`, result);
      return "success";
    } catch (error: any) {
      this.logger.error(`Failed to trigger Modal asset indexing:`, error.message);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
  }

  async triggerConformAsset(assetId: string, maxFps: number = 60): Promise<string> {
    this.logger.log(`Triggering Modal asset conform for asset ${assetId} (max_fps: ${maxFps})`);

    try {
      const modal = new ModalClient();
      const conformAsset = await modal.functions.fromName("openvideo-processor", "conform_asset");

      const result = await conformAsset.remote([assetId, maxFps]);
      this.logger.log(`Modal asset conform triggered successfully:`, result);
      return "success";
    } catch (error: any) {
      this.logger.error(`Failed to trigger Modal asset conform:`, error.message);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
  }
}
