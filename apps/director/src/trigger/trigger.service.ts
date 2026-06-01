import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type ElevenLabsAudioType = "background-music" | "sound-effect";

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);
  private readonly appUrl: string;

  constructor(private configService: ConfigService) {
    this.appUrl = this.configService.get<string>("APP_URL") || "http://localhost:3000";
  }

  async generateImage(spaceId: string, stepId: string, prompt: string): Promise<any> {
    this.logger.log(`Triggering image generation for space ${spaceId}, step ${stepId}`);

    return await this.startWorkflow("generate-image", {
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

    return await this.startWorkflow("generate-video", {
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
    audioType: ElevenLabsAudioType,
  ): Promise<any> {
    this.logger.log(
      `Triggering ElevenLabs audio (${audioType}) for space ${spaceId}, step ${stepId}`,
    );

    return await this.startWorkflow("generate-elevenlabs-audio", {
      spaceId,
      stepId,
      prompt,
      durationSeconds,
      audioType,
    });
  }

  async triggerIndexAsset(spaceId: string, assetId: string): Promise<string> {
    this.logger.log(`Triggering asset indexing for asset ${assetId} in space ${spaceId}`);
    const result = await this.startWorkflow("index-asset", { spaceId, assetId });
    return result.runId;
  }

  private async startWorkflow(workflow: string, payload: any): Promise<any> {
    const url = `${this.appUrl}/api/workflows/start`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflow, payload }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Workflow start failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.log(`Workflow ${workflow} started`, { runId: result.runId });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to start workflow ${workflow}:`, error.message);
      throw error;
    }
  }
}
