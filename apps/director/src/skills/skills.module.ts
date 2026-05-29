import { Module } from "@nestjs/common";
import { SkillRegistryService } from "./skill-registry.service";
import { CinematicSkill } from "./library/cinematic.skill";
import { AutoCaptionSkill } from "./library/auto-caption.skill";
import { BasicEditingSkill } from "./library/basic-editing.skill";
import { MediaGenerationSkill } from "./library/media-generation.skill";
import { TransitionEditingSkill } from "./library/transition-editing.skill";
import { EffectEditingSkill } from "./library/effect-editing.skill";
import { ProjectSettingsSkill } from "./library/project-settings.skill";
import { AnimationEditingSkill } from "./library/animation-editing.skill";
import { CompositionSkill } from "./library/composition.skill";

@Module({
  providers: [
    SkillRegistryService,
    CinematicSkill,
    AutoCaptionSkill,
    BasicEditingSkill,
    MediaGenerationSkill,
    TransitionEditingSkill,
    EffectEditingSkill,
    ProjectSettingsSkill,
    AnimationEditingSkill,
    CompositionSkill,
  ],
  exports: [SkillRegistryService],
})
export class SkillsModule {}
