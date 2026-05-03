import { Injectable } from '@nestjs/common';
import { EditingSkill, ProjectContext } from '../base-skill';
import { Command } from '@openvideo/core';
import { nanoid } from 'nanoid';

@Injectable()
export class CinematicSkill implements EditingSkill {
  name = 'cinematic';
  description = 'Applies a cinematic look: adds a teal-orange color grade, a slow zoom-in effect, and crossfade transitions between all video clips.';
  tags = ['color', 'effects', 'transitions', 'style'];
  isAsync = false;

  resolve(context: ProjectContext): Command[] {
    const commands: Command[] = [];
    const { videoClipIds } = context;

    if (videoClipIds.length === 0) return commands;

    // Apply color grade and zoom to all video clips
    videoClipIds.forEach((clipId) => {
      commands.push({
        id: nanoid(),
        type: 'clip.add-effect',
        payload: {
          clipId,
          effect: {
            id: nanoid(),
            key: 'colorGrade',
            name: 'Teal & Orange',
            values: { intensity: 0.8 },
          },
        },
        meta: { source: 'agent' },
      });

      commands.push({
        id: nanoid(),
        type: 'clip.add-effect',
        payload: {
          clipId,
          effect: {
            id: nanoid(),
            key: 'zoom',
            name: 'Slow Zoom In',
            values: { speed: 0.05 },
          },
        },
        meta: { source: 'agent' },
      });
    });

    // Add crossfades between adjacent clips
    for (let i = 0; i < videoClipIds.length - 1; i++) {
      commands.push({
        id: nanoid(),
        type: 'clip.add',
        payload: {
          type: 'Transition',
          fromClipId: videoClipIds[i],
          toClipId: videoClipIds[i + 1],
          duration: 1000000, // 1 second
          transitionEffect: {
            id: nanoid(),
            key: 'crossfade',
            name: 'Crossfade',
          },
        },
        meta: { source: 'agent' },
      });
    }

    return commands;
  }
}
