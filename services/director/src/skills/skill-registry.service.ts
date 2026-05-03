import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EditingSkill, ProjectContext } from './base-skill';
import { IProject } from '@openvideo/core';
import { CinematicSkill } from './library/cinematic.skill';
import { SocialClipSkill } from './library/social-clip.skill';
import { AutoCaptionSkill } from './library/auto-caption.skill';
import { HighlightReelSkill } from './library/highlight-reel.skill';
import { PodcastEditSkill } from './library/podcast-edit.skill';
import { BasicEditingSkill } from './library/basic-editing.skill';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SkillRegistryService implements OnModuleInit {
  private readonly logger = new Logger(SkillRegistryService.name);
  private skills = new Map<string, EditingSkill>();
  private skillDocs = new Map<string, string>();

  constructor(
    private cinematic: CinematicSkill,
    private socialClip: SocialClipSkill,
    private autoCaption: AutoCaptionSkill,
    private highlightReel: HighlightReelSkill,
    private podcastEdit: PodcastEditSkill,
    private basicEditing: BasicEditingSkill,
  ) {
    this.register(this.cinematic);
    this.register(this.socialClip);
    this.register(this.autoCaption);
    this.register(this.highlightReel);
    this.register(this.podcastEdit);
    this.register(this.basicEditing);
  }

  onModuleInit() {
    this.loadSkillDocs();
  }

  private register(skill: EditingSkill) {
    this.skills.set(skill.name, skill);
    this.logger.log(`Registered skill: ${skill.name}`);
  }

  private loadSkillDocs() {
    const isDev = process.env.NODE_ENV !== 'production';
    const baseDir = isDev ? path.join(process.cwd(), 'src') : path.join(process.cwd(), 'dist/src');
    const libraryPath = path.join(baseDir, 'skills', 'library');
    
    this.skills.forEach((skill) => {
      const skillPath = path.join(libraryPath, skill.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const doc = fs.readFileSync(skillPath, 'utf8');
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
          `- **${s.name}**: ${s.description} (Use tool: read_skill_documentation("${s.name}") for details)`
      )
      .join('\n');
  }

  buildContext(snapshot: IProject): ProjectContext {
    const allClipIds = Object.keys(snapshot.clips);
    const videoClipIds = allClipIds.filter((id) => snapshot.clips[id].type === 'Video');
    const audioClipIds = allClipIds.filter((id) => snapshot.clips[id].type === 'Audio');
    const trackIds = snapshot.tracks.map((t) => t.id);
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
