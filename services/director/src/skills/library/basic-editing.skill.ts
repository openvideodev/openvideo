import { Injectable } from '@nestjs/common';
import { EditingSkill, ProjectContext } from '../base-skill';
import { Command } from '@openvideo/core';

@Injectable()
export class BasicEditingSkill implements EditingSkill {
  name = 'basic-editing';
  description = 'Learn how to add, modify, and delete basic clips (Text, Image, Video, Audio) and adjust their properties (opacity, rotation, etc) using low-level commands.';
  tags = ['text', 'image', 'video', 'audio', 'properties', 'opacity', 'rotation', 'position'];
  isAsync = false;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    // This is purely an instructional skill.
    // The agent reads SKILL.md and outputs `type: "command"` steps directly.
    // So this resolve method should never actually be called by the agent via `type: "skill"`.
    // If it is, we just return an empty array or throw a helpful error.
    throw new Error('basic-editing is an instructional skill. Please use `type: "command"` steps directly as documented in the skill.');
  }
}
