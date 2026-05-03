import { Injectable, Logger } from '@nestjs/common';
import { Plan, PlanStep } from '../types/plan.types';
import { Command, loadClip } from '@openvideo/core';
import { SkillRegistryService } from '../skills/skill-registry.service';
import { CoreRegistryService } from '../core/core-registry.service';

@Injectable()
export class CommandBuilderService {
  private readonly logger = new Logger(CommandBuilderService.name);

  constructor(
    private skillRegistry: SkillRegistryService,
    private coreRegistry: CoreRegistryService,
  ) {}

  /**
   * Resolves a plan step into a list of atomic commands.
   * If it's a skill step, it invokes the skill's resolve method.
   * If it's a command step, it returns the single command.
   */
  async buildCommandsForStep(projectId: string, step: PlanStep): Promise<Command[]> {
    if (step.command) {
      this.logger.debug(`Processing command: ${JSON.stringify(step.command)}`);
      if (step.command.type === 'clip.add' && step.command.payload?.clip) {
        const core = await this.coreRegistry.get(projectId);
        const state = core.getSnapshot();
        step.command.payload.clip = await loadClip(step.command.payload.clip, {
          canvasSize: { width: state.settings.width, height: state.settings.height }
        });
      }
      return [step.command];
    }

    if (step.type === 'skill' && step.skillName) {
      const skill = this.skillRegistry.resolve(step.skillName);
      if (!skill) {
        this.logger.error(`Skill not found: ${step.skillName}`);
        throw new Error(`Skill ${step.skillName} not found.`);
      }

      // We need the project context
      const core = await this.coreRegistry.get(projectId);
      const snapshot = core.getSnapshot();
      const context = this.skillRegistry.buildContext(snapshot);

      return skill.resolve(context, step.skillParams);
    }

    if (step.type === 'generate') {
      // Generators are handled via async jobs, not built directly into core commands upfront.
      // They return empty here and ExecutorService dispatches to queues.
      return [];
    }

    return [];
  }
}
