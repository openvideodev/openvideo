import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class CompositionSkill implements EditingSkill {
  name = "composition";
  description =
    "Auto-compose a complete video from a topic prompt: semantically finds matching asset segments, arranges them on the timeline, and queues AI-generated background music and sound effects via ElevenLabs.";
  tags = ["composition", "auto-edit", "music", "sound-effects", "semantic", "topic"];
  isAsync = true;

  resolve(_context: ProjectContext, _params?: Record<string, any>): Command[] {
    throw new Error(
      "composition is an instructional skill. The agent must output tool calls and generate/command steps directly as documented in the SKILL.md.",
    );
  }
}
