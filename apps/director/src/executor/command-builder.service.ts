import { Injectable, Logger } from "@nestjs/common";
import { Plan, PlanStep } from "../types/plan.types";
import { loadClip } from "@openvideo/core";
import type { Command } from "@openvideo/core";
import { SkillRegistryService } from "../skills/skill-registry.service";
import { CoreRegistryService } from "../core/core-registry.service";

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
  async buildCommandsForStep(spaceId: string, step: PlanStep): Promise<Command[]> {
    if (step.command) {
      this.logger.debug(`Processing command: ${JSON.stringify(step.command)}`);
      if (step.command.type === "clip.add" && step.command.payload?.clip) {
        const core = await this.coreRegistry.get(spaceId);
        const state = core.getSnapshot();
        const clip = step.command.payload.clip;

        let objectFit =
          step.command.payload.options?.objectFit ||
          step.command.payload.objectFit ||
          clip.objectFit;

        if (!objectFit && (clip.type === "Image" || clip.type === "Video")) {
          objectFit = "contain";
        }

        this.logger.log(`Adding clip in server with objectFit: ${objectFit}`);

        step.command.payload.clip = await loadClip(clip, {
          canvasSize: { width: state.settings.width, height: state.settings.height },
          objectFit,
        });
      }
      return [step.command];
    }

    if (step.type === "skill" && step.skillName) {
      const skill = this.skillRegistry.resolve(step.skillName);
      if (!skill) {
        this.logger.error(`Skill not found: ${step.skillName}`);
        throw new Error(`Skill ${step.skillName} not found.`);
      }

      // We need the space context
      const core = await this.coreRegistry.get(spaceId);
      const snapshot = core.getSnapshot();
      const context = this.skillRegistry.buildContext(snapshot);

      return await skill.resolve(context, step.skillParams);
    }

    if (step.type === "generate") {
      // Generators are handled via async jobs, not built directly into core commands upfront.
      // They return empty here and ExecutorService dispatches to queues.
      return [];
    }

    return [];
  }
}
