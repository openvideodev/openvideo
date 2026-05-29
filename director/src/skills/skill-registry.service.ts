import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "./base-skill";
import type { IProject, ITrack } from "@openvideo/core";
import { CinematicSkill } from "./library/cinematic.skill";
import { AutoCaptionSkill } from "./library/auto-caption.skill";
import { BasicEditingSkill } from "./library/basic-editing.skill";
import { MediaGenerationSkill } from "./library/media-generation.skill";
import { TransitionEditingSkill } from "./library/transition-editing.skill";
import { EffectEditingSkill } from "./library/effect-editing.skill";
import { ProjectSettingsSkill } from "./library/project-settings.skill";
import { AnimationEditingSkill } from "./library/animation-editing.skill";
import { CompositionSkill } from "./library/composition.skill";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SkillRegistryService implements OnModuleInit {
  private readonly logger = new Logger(SkillRegistryService.name);
  private skills = new Map<string, EditingSkill>();
  private skillDocs = new Map<string, string>();

  constructor(
    private cinematic: CinematicSkill,
    private autoCaption: AutoCaptionSkill,
    private basicEditing: BasicEditingSkill,
    private mediaGeneration: MediaGenerationSkill,
    private transitionEditing: TransitionEditingSkill,
    private effectEditing: EffectEditingSkill,
    private projectSettings: ProjectSettingsSkill,
    private animationEditing: AnimationEditingSkill,
    private composition: CompositionSkill,
  ) {
    this.register(this.cinematic);
    this.register(this.autoCaption);
    this.register(this.basicEditing);
    this.register(this.mediaGeneration);
    this.register(this.transitionEditing);
    this.register(this.effectEditing);
    this.register(this.projectSettings);
    this.register(this.animationEditing);
    this.register(this.composition);
  }

  onModuleInit() {
    this.loadSkillDocs();
  }

  private register(skill: EditingSkill) {
    this.skills.set(skill.name, skill);
    this.logger.log(`Registered skill: ${skill.name}`);
  }

  private loadSkillDocs() {
    const isDev = process.env.NODE_ENV !== "production";
    const baseDir = isDev ? path.join(process.cwd(), "src") : path.join(process.cwd(), "dist/src");
    const libraryPath = path.join(baseDir, "skills", "library");

    this.skills.forEach((skill) => {
      const skillPath = path.join(libraryPath, skill.name, "SKILL.md");
      if (fs.existsSync(skillPath)) {
        let doc = fs.readFileSync(skillPath, "utf8");
        if (skill.enrichDoc) {
          doc = skill.enrichDoc(doc);
        }
        this.skillDocs.set(skill.name, doc);
        this.logger.debug(`Loaded documentation for skill: ${skill.name}`);
      } else {
        this.logger.warn(`No SKILL.md found for skill: ${skill.name} at ${skillPath}`);
      }
    });
  }

  resolve(name: string): EditingSkill | undefined {
    return this.skills.get(name);
  }

  getSkillDocumentation(name: string): string | undefined {
    return this.skillDocs.get(name);
  }

  listForPrompt(): string {
    return Array.from(this.skills.values())
      .map(
        (s) =>
          `- **${s.name}**: ${s.description} (Use tool: read_skill_documentation("${s.name}") for details)`,
      )
      .join("\n");
  }

  buildContext(snapshot: IProject): ProjectContext {
    const allClipIds = Object.keys(snapshot.clips);
    const videoClipIds = allClipIds.filter((id) => snapshot.clips[id].type === "Video");
    const audioClipIds = allClipIds.filter((id) => snapshot.clips[id].type === "Audio");
    const trackIds = snapshot.tracks.map((t: ITrack) => t.id);
    const firstVideoClipId = videoClipIds.length > 0 ? videoClipIds[0] : null;

    return {
      project: snapshot,
      allClipIds,
      videoClipIds,
      audioClipIds,
      trackIds,
      firstVideoClipId,
    };
  }
}
