import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class PodcastEditSkill implements EditingSkill {
  name = "podcast-edit";
  description =
    "Optimizes a podcast or interview recording by automatically removing silent regions and switching camera angles based on who is speaking.";
  tags = ["podcast", "silence-removal", "multi-cam"];
  isAsync = true;

  resolve(context: ProjectContext): Command[] {
    const commands: Command[] = [];
    // Requires audio analysis job for silence detection
    return commands;
  }
}
