import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class ProjectSettingsSkill implements EditingSkill {
  name = "project-settings";
  description =
    "Learn how to change project-level settings: canvas size (aspect ratio presets), background color, and frame rate.";
  tags = [
    "settings",
    "aspect-ratio",
    "canvas",
    "resolution",
    "background",
    "color",
    "fps",
    "vertical",
    "horizontal",
    "square",
    "portrait",
    "landscape",
    "9:16",
    "16:9",
    "1:1",
    "4:5",
    "4:3",
  ];
  isAsync = false;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    throw new Error(
      'project-settings is an instructional skill. Please use `type: "command"` steps with `project.updateSettings` directly as documented in the skill.',
    );
  }
}
