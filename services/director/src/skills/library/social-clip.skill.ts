import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";
import { nanoid } from "nanoid";

@Injectable()
export class SocialClipSkill implements EditingSkill {
  name = "social-clip";
  description =
    "Converts a horizontal video to a vertical format suitable for TikTok/Reels/Shorts. Center-crops the video and adds auto-captions.";
  tags = ["format", "social", "crop", "vertical"];
  isAsync = true; // Auto-captioning usually requires transcription

  resolve(context: ProjectContext): Command[] {
    const commands: Command[] = [];

    // Change project settings to vertical
    commands.push({
      id: nanoid(),
      type: "project.update-settings",
      payload: {
        width: 1080,
        height: 1920,
      },
      meta: { source: "agent" },
    });

    const { videoClipIds, project } = context;

    // Apply center crop to fit the vertical screen
    videoClipIds.forEach((clipId) => {
      const clip = project.clips[clipId];
      if (!clip) return;

      const width = clip.transform?.width ?? 0;
      const height = clip.transform?.height ?? 0;

      // Calculate scale to cover vertical format
      // Standard video is 1920x1080, we want 1080x1920.
      // So we must scale up to cover the height.
      const scaleToCover = 1920 / 1080;

      commands.push({
        id: nanoid(),
        type: "clip.update",
        payload: {
          id: clipId,
          updates: {
            transform: {
              width: width * scaleToCover,
              height: height * scaleToCover,
              x: 1080 / 2, // Center
              y: 1920 / 2, // Center
            },
          },
        },
        meta: { source: "agent" },
      });
    });

    // A real implementation would enqueue a transcription job here
    // For now we just add a placeholder caption clip
    if (videoClipIds.length > 0) {
      commands.push({
        id: nanoid(),
        type: "clip.add",
        payload: {
          type: "Caption",
          text: "Auto-generated captions will appear here",
          mediaId: videoClipIds[0],
          timing: {
            display: { from: 0, to: 5000000 }, // 5s placeholder
          },
        },
        meta: { source: "agent" },
      });
    }

    return commands;
  }
}
