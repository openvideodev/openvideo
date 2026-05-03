import { Injectable, Logger } from '@nestjs/common';
import { EditingSkill, ProjectContext } from './base-skill';
import { IProject } from '@openvideo/core';
import { CinematicSkill } from './library/cinematic.skill';
import { SocialClipSkill } from './library/social-clip.skill';
import { AutoCaptionSkill } from './library/auto-caption.skill';
import { HighlightReelSkill } from './library/highlight-reel.skill';
import { PodcastEditSkill } from './library/podcast-edit.skill';

@Injectable()
export class SkillRegistryService {
  private readonly logger = new Logger(SkillRegistryService.name);
  private skills = new Map<string, EditingSkill>();

  constructor(
    private cinematic: CinematicSkill,
    private socialClip: SocialClipSkill,
    private autoCaption: AutoCaptionSkill,
    private highlightReel: HighlightReelSkill,
    private podcastEdit: PodcastEditSkill,
  ) {
    this.register(this.cinematic);
    this.register(this.socialClip);
    this.register(this.autoCaption);
    this.register(this.highlightReel);
    this.register(this.podcastEdit);
  }

  register(skill: EditingSkill) {
    this.skills.set(skill.name, skill);
    this.logger.log(`Registered skill: ${skill.name}`);
  }

  resolve(name: string): EditingSkill | undefined {
    return this.skills.get(name);
  }

  listForPrompt(): string {
    return Array.from(this.skills.values())
      .map(
        (s) =>
          `- **${s.name}**: ${s.description} (Tags: ${s.tags.join(', ')}, Async: ${s.isAsync})`
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
