import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";

@Injectable()
export class EffectEditingSkill implements EditingSkill {
  name = "effect-editing";
  description =
    "Learn how to add, modify, and remove visual effects on timeline clips for video ads, promos, and motivational videos. Includes fadeIn, fadeOut, vignette, glitch, color grading, motion, and more.";
  tags = [
    "effect",
    "filter",
    "fadeIn",
    "fadeOut",
    "fade",
    "vignette",
    "glitch",
    "cinematic",
    "color",
    "hdr",
    "sepia",
    "grayscale",
    "duotone",
    "promo",
    "social",
    "motion",
    "zoom",
    "blur",
    "reveal",
    "hype",
    "energy",
    "distort",
    "chromatic",
  ];
  isAsync = false;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    throw new Error(
      'effect-editing is an instructional skill. Please use `type: "command"` steps directly as documented in the skill.',
    );
  }
}
