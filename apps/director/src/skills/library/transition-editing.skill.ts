import { Injectable } from "@nestjs/common";
import { EditingSkill, ProjectContext } from "../base-skill";
import { Command } from "@openvideo/core";
import { nanoid } from "nanoid";

@Injectable()
export class TransitionEditingSkill implements EditingSkill {
  name = "transition-editing";
  description =
    "Learn how to add and modify transition clips to bridge two adjacent clips seamlessly.";
  tags = ["transition", "fade", "slide", "duration", "wipe"];
  isAsync = false;

  resolve(context: ProjectContext, params?: Record<string, any>): Command[] {
    const commands: Command[] = [];
    const transitionKey = params?.transitionKey || "fade";
    const durationMs = params?.durationMs || 800;
    const durationUs = durationMs * 1000;

    const { project } = context;
    if (!project || !project.tracks) return commands;

    // Filter tracks to find Video/Image tracks
    const videoTracks = project.tracks.filter(
      (t) => t.type === "video" || t.type === "image" || t.type === "Video" || t.type === "Image",
    );

    for (const track of videoTracks) {
      if (!track.clipIds || track.clipIds.length < 2) continue;

      // Map track.clipIds to their actual Clip objects
      const clips = track.clipIds
        .map((id) => project.clips[id])
        .filter((c) => c && (c.type === "Video" || c.type === "Image"));

      // Sort clips by their starting display time
      clips.sort((a, b) => (a.timing?.display?.from || 0) - (b.timing?.display?.from || 0));

      // Add transitions between consecutive video/image clips
      for (let i = 0; i < clips.length - 1; i++) {
        const fromClip = clips[i];
        const toClip = clips[i + 1];

        // Check if there is already a transition connecting these two clips to avoid duplicate commands
        const existingTransition = Object.values(project.clips).find(
          (c) =>
            c.type === "Transition" && c.fromClipId === fromClip.id && c.toClipId === toClip.id,
        );

        if (existingTransition) continue;

        commands.push({
          id: nanoid(),
          type: "clip.add",
          payload: {
            clip: {
              type: "Transition",
              transitionKey,
              fromClipId: fromClip.id,
              toClipId: toClip.id,
              timing: {
                duration: durationUs,
              },
            },
          },
          meta: { source: "agent" },
        });
      }
    }

    return commands;
  }
}
