import { Injectable } from '@nestjs/common';
import { EditingSkill, ProjectContext } from '../base-skill';
import { Command } from '@openvideo/core';
import { nanoid } from 'nanoid';

@Injectable()
export class AutoCaptionSkill implements EditingSkill {
  name = 'auto-caption';
  description = 'Automatically transcribes all spoken audio and adds animated caption clips to the video.';
  tags = ['captions', 'text', 'accessibility'];
  isAsync = true; // Requires transcription

  resolve(context: ProjectContext): Command[] {
    const commands: Command[] = [];
    const { videoClipIds, audioClipIds } = context;
    
    const targetClips = [...videoClipIds, ...audioClipIds];
    
    if (targetClips.length === 0) return commands;

    // In a real implementation, we'd trigger a background transcription job.
    // For now, simulate adding a caption clip for the first clip.
    commands.push({
      id: nanoid(),
      type: 'clip.add',
      payload: {
        type: 'Caption',
        text: 'Hello world, this is an auto-caption.',
        mediaId: targetClips[0],
        display: { from: 0, to: 3000000 },
      },
      meta: { source: 'agent' },
    });

    return commands;
  }
}
