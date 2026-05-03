import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Plan } from '../types/plan.types';
import { CoreRegistryService } from '../core/core-registry.service';
import { CommandBuilderService } from './command-builder.service';
import { BroadcastService } from '../broadcast/broadcast.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TriggerService } from '../trigger/trigger.service';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    private coreRegistry: CoreRegistryService,
    private commandBuilder: CommandBuilderService,
    private broadcastService: BroadcastService,
    private triggerService: TriggerService,
    @InjectQueue('generate-audio') private generateAudioQueue: Queue,
  ) {}

  /**
   * Executes a plan step by step.
   */
  async executePlan(projectId: string, plan: Plan): Promise<void> {
    this.logger.log(`Executing plan ${plan.id} for project ${projectId}`);
    
    const core = await this.coreRegistry.get(projectId);
    let hasError = false;

    for (const step of plan.steps) {
      this.broadcastService.broadcast(projectId, {
        type: 'plan.step',
        stepId: step.id,
        status: 'running',
        description: step.description,
      });

      try {
        if (step.type === 'chat') {
          this.broadcastService.broadcast(projectId, {
            type: 'chat.response',
            message: step.description,
          });
        }

        // 2. Synchronous execution (commands, synchronous skills)
        const commands = await this.commandBuilder.buildCommandsForStep(projectId, step);
        if (commands.length > 0) {
          core.batch(commands);
        }

        // 3. Dispatch async generation jobs
        if (step.type === 'generate') {
          if (step.jobType === 'generate-audio') {
            await this.generateAudioQueue.add('generate', { projectId, planId: plan.id, stepId: step.id, params: step.jobParams });
          } else if (step.jobType === 'generate-image') {
            await this.triggerService.generateImage(projectId, step.id, step.jobParams?.prompt || step.description);
          } else if (step.jobType === 'generate-video') {
            await this.triggerService.generateVideo(
              projectId, 
              step.id, 
              step.jobParams?.imageUrl, 
              step.jobParams?.prompt || step.description
            );
          }
        }

        // Mark step as done in UI (generate steps show queued, others show completed)
        this.broadcastService.broadcast(projectId, {
          type: 'plan.step',
          stepId: step.id,
          status: 'done',
          description: step.type === 'generate' ? `${step.description} (queued — generating in background)` : step.description,
        });
      } catch (error) {
        this.logger.error(`Failed to execute step ${step.id}`, error);
        this.broadcastService.broadcast(projectId, {
          type: 'plan.step',
          stepId: step.id,
          status: 'error',
          description: `Failed: ${error.message}`,
        });
        hasError = true;
        // Stop execution on error
        break;
      }
    }

    // Persist snapshot after synchronous steps
    await this.coreRegistry.persist(projectId);

    // Send completion summary to chat
    if (hasError) {
      this.broadcastService.broadcast(projectId, {
        type: 'chat.response',
        message: `❌ I encountered an error while executing the plan.`,
      });
    }

    this.broadcastService.broadcast(projectId, {
      type: 'plan.complete',
      planId: plan.id,
    });
  }
}
