import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command, ANIMATION_PRESETS, GSAP_PRESETS } from "@openvideo/core";

@Injectable()
export class AnimationEditingSkill implements EditingSkill {
  name = "animation-editing";
  description =
    "Learn how to apply entrance, exit, and combo animations to any clip — using named presets or fully custom keyframes. Supports clip-level keyframe animations and text/caption stagger animations (letter-by-letter, word-by-word).";
  tags = [
    "animation",
    "keyframes",
    "stagger",
    "text",
    "word",
    "character",
    "letter",
    "slide",
    "fade",
    "zoom",
    "blur",
    "combo",
    "entrance",
    "exit",
    "in",
    "out",
    "motion",
    "rotate",
    "scale",
    "bounce",
    "typewriter",
    "intro",
    "outro",
    "animate",
  ];
  isAsync = false;

  enrichDoc(doc: string): string {
    const presetJson = JSON.stringify(ANIMATION_PRESETS, null, 2);
    const gsapJson = JSON.stringify(GSAP_PRESETS, null, 2);
    return (
      doc +
      `\n\n---\n\n## Live Preset Data (source of truth from @openvideo/core)\n\n` +
      `The following JSON is the exact keyframe data for every named preset. ` +
      `Use these values directly in \`params\` when applying a named preset, or adjust them as needed for custom animations.\n\n` +
      `### ANIMATION_PRESETS\n\n\`\`\`json\n${presetJson}\n\`\`\`\n\n` +
      `### GSAP_PRESETS\n\n\`\`\`json\n${gsapJson}\n\`\`\`\n`
    );
  }

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    throw new Error(
      'animation-editing is an instructional skill. Please use `type: "command"` steps with `clip.update` directly as documented in the skill.',
    );
  }
}
