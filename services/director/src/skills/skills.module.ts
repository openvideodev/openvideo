import { Module } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { CinematicSkill } from './library/cinematic.skill';
import { SocialClipSkill } from './library/social-clip.skill';
import { AutoCaptionSkill } from './library/auto-caption.skill';
import { HighlightReelSkill } from './library/highlight-reel.skill';
import { PodcastEditSkill } from './library/podcast-edit.skill';

import { BasicEditingSkill } from './library/basic-editing.skill';

@Module({
  providers: [
    SkillRegistryService,
    CinematicSkill,
    SocialClipSkill,
    AutoCaptionSkill,
    HighlightReelSkill,
    PodcastEditSkill,
    BasicEditingSkill,
  ],
  exports: [SkillRegistryService],
})
export class SkillsModule {}
