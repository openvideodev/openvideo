import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Plan } from '../types/plan.types';
import { CoreRegistryService } from '../core/core-registry.service';
import { CommandBuilderService } from './command-builder.service';
import { BroadcastService } from '../broadcast/broadcast.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    private coreRegistry: CoreRegistryService,
    private commandBuilder: CommandBuilderService,
    private broadcastService: BroadcastService,
    @InjectQueue('generate-audio') private generateAudioQueue: Queue,
    @InjectQueue('generate-image') private generateImageQueue: Queue,
  ) {}

  /**
   * Executes a plan step by step.
   */
  async executePlan(projectId: string, plan: Plan): Promise<void> {
    this.logger.log(`Executing plan ${plan.id} for project ${projectId}`);
    
    const core = await this.coreRegistry.get(projectId);

    for (const step of plan.steps) {
      this.broadcastService.broadcast(projectId, {
        type: 'plan.step',
        stepId: step.id,
        status: 'running',
        description: step.description,
      });

      try {
        if (step.type === 'generate') {
          // Dispatch to job queue, execution is async
          if (step.jobType === 'generate-audio') {
            await this.generateAudioQueue.add('generate', { projectId, planId: plan.id, stepId: step.id, params: step.jobParams });
          } else if (step.jobType === 'generate-image') {
            await this.generateImageQueue.add('generate', { projectId, planId: plan.id, stepId: step.id, params: step.jobParams });
          }
        } else {
          // Synchronous execution (commands, synchronous skills)
          const commands = await this.commandBuilder.buildCommandsForStep(projectId, step);
          if (commands.length > 0) {
            core.batch(commands);
          }

          this.broadcastService.broadcast(projectId, {
            type: 'plan.step',
            stepId: step.id,
            status: 'done',
            description: step.description,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to execute step ${step.id}`, error);
        this.broadcastService.broadcast(projectId, {
          type: 'plan.step',
          stepId: step.id,
          status: 'error',
          description: `Failed: ${error.message}`,
        });
        // Stop execution on error
        break;
      }
    }

    // Persist snapshot after synchronous steps
    await this.coreRegistry.persist(projectId);

    this.broadcastService.broadcast(projectId, {
      type: 'plan.complete',
      planId: plan.id,
    });
  }
}
