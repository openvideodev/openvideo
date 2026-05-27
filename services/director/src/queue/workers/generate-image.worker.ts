import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { CoreRegistryService } from "../../core/core-registry.service";
import { BroadcastService } from "../../broadcast/broadcast.service";
import { Command } from "@openvideo/core";
import { nanoid } from "nanoid";

@Processor("generate-image")
export class GenerateImageWorker extends WorkerHost {
  private readonly logger = new Logger(GenerateImageWorker.name);

  constructor(
    private coreRegistry: CoreRegistryService,
    private broadcastService: BroadcastService,
  ) {
    super();
  }

  async process(job: Job<{ projectId: string; planId: string; stepId: string; params: any }>) {
    const { projectId, planId, stepId, params } = job.data;
    this.logger.log(`Generating image for step ${stepId} (Project ${projectId})`);

    // Simulate image generation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // The result would be an R2 URL
    const imageUrl = "https://picsum.photos/1080/1920";

    // Apply the command
    const core = await this.coreRegistry.get(projectId);
    const command: Command = {
      id: nanoid(),
      type: "clip.add",
      payload: {
        type: "Video", // Core treats images as Video clips currently or Image type
        name: "Generated Image",
        src: imageUrl,
        display: { from: 0, to: 5000000 },
      },
      meta: { source: "agent" },
    };

    core.execute(command);

    // Notify client that step is complete
    this.broadcastService.broadcast(projectId, {
      type: "plan.step",
      stepId,
      status: "done",
      description: "Image generation complete",
    });
  }
}
