import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class MediaGenerationSkill implements EditingSkill {
  name = "media-generation";
  description =
    "Generate new image and video clips using AI models (Imagen 3 and Veo 3) based on text prompts.";
  tags = ["generate", "image", "video", "ai", "imagen", "veo"];
  isAsync = true;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    // This is an instructional skill. The agent will output `type: "generate"` steps directly.
    throw new Error(
      'media-generation is an instructional skill. Please use `type: "generate"` steps directly as documented in the skill.',
    );
  }
}
