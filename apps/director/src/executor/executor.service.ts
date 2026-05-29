import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { Plan } from "../types/plan.types";
import { CoreRegistryService } from "../core/core-registry.service";
import { CommandBuilderService } from "./command-builder.service";
import { BroadcastService } from "../broadcast/broadcast.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TriggerService } from "../trigger/trigger.service";

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    private coreRegistry: CoreRegistryService,
    private commandBuilder: CommandBuilderService,
    private broadcastService: BroadcastService,
    private triggerService: TriggerService,
    @InjectQueue("generate-audio") private generateAudioQueue: Queue,
  ) {}

  /**
   * Executes a plan step by step.
   */
  async executePlan(spaceId: string, plan: Plan): Promise<void> {
    this.logger.log(`Executing plan ${plan.id} for space ${spaceId}`);

    const core = await this.coreRegistry.get(spaceId);
    let hasError = false;

    for (const step of plan.steps) {
      this.broadcastService.broadcast(spaceId, {
        type: "plan.step",
        stepId: step.id,
        status: "running",
        description: step.description,
      });

      try {
        // 2. Synchronous execution (commands, synchronous skills)
        const commands = await this.commandBuilder.buildCommandsForStep(spaceId, step);
        if (commands.length > 0) {
          core.batch(commands);
        }

        // 3. Dispatch async generation jobs
        if (step.type === "generate") {
          if (step.jobType === "generate-audio") {
            await this.generateAudioQueue.add("generate", {
              spaceId,
              planId: plan.id,
              stepId: step.id,
              params: step.jobParams,
            });
          } else if (step.jobType === "generate-image") {
            await this.triggerService.generateImage(
              spaceId,
              step.id,
              step.jobParams?.prompt || step.description,
            );
          } else if (step.jobType === "generate-video") {
            await this.triggerService.generateVideo(
              spaceId,
              step.id,
              step.jobParams?.imageUrl,
              step.jobParams?.prompt || step.description,
            );
          } else if (
            step.jobType === "generate-background-music" ||
            step.jobType === "generate-sound-effect"
          ) {
            await this.triggerService.generateElevenLabsAudio(
              spaceId,
              step.id,
              step.jobParams?.prompt || step.description,
              step.jobParams?.durationSeconds ?? 30,
              step.jobType === "generate-background-music" ? "background-music" : "sound-effect",
            );
          }
        }

        // Mark step as done in UI (generate steps show queued, others show completed)
        this.broadcastService.broadcast(spaceId, {
          type: "plan.step",
          stepId: step.id,
          status: "done",
          description:
            step.type === "generate"
              ? `${step.description} (queued — generating in background)`
              : step.description,
        });
      } catch (error: any) {
        this.logger.error(`Failed to execute step ${step.id}`, error);
        this.broadcastService.broadcast(spaceId, {
          type: "plan.step",
          stepId: step.id,
          status: "error",
          description: `Failed: ${error.message}`,
        });
        hasError = true;
        // Stop execution on error
        break;
      }
    }

    // Persist snapshot after synchronous steps
    await this.coreRegistry.persist(spaceId);

    // Send completion summary to chat
    if (hasError) {
      this.broadcastService.broadcast(spaceId, {
        type: "chat.response",
        message: `❌ I encountered an error while executing the plan.`,
      });
    }

    this.broadcastService.broadcast(spaceId, {
      type: "plan.complete",
      planId: plan.id,
    });
  }
}
