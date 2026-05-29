import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class TransitionEditingSkill implements EditingSkill {
  name = "transition-editing";
  description =
    "Learn how to add and modify transition clips to bridge two adjacent clips seamlessly.";
  tags = ["transition", "fade", "slide", "duration", "wipe"];
  isAsync = false;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    throw new Error(
      'transition-editing is an instructional skill. Please use `type: "command"` steps directly as documented in the skill.',
    );
  }
}
