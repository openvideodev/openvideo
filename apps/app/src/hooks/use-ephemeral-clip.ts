import { useState, useEffect } from "react";
import { core } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";
import { IClip } from "@/types/timeline";

/**
 * A hook that provides a real-time "ephemeral" version of a clip during interaction.
 * It listens to engine-level events without requiring a full store update.
 *
 * @param clipId The ID of the clip to track
 * @param baseClip The persistent clip data from the project store
 * @returns The merged clip (base + ephemeral updates)
 */
export function useEphemeralClip(clipId: string, baseClip: any) {
  const [ephemeralUpdates, setEphemeralUpdates] = useState<any>(null);

  const studio = useStudioStore((s) => s.studio);

  useEffect(() => {
    if (!clipId || !studio) return;

    const handleTransforming = (data: { clip: any; ephemeral?: any }) => {
      if (data.clip?.id === clipId) {
        // Use ephemeral payload if provided (has live transform values from Pixi)
        // Otherwise fall back to extracting from clip object
        const ephemeral = data.ephemeral || data.clip;
        const { left, top, width, height, angle, scaleX, scaleY } = ephemeral;
        setEphemeralUpdates({
          left,
          top,
          width,
          height,
          angle,
          scaleX,
          scaleY,
        });
      }
    };

    const handleUpdated = (patches: any[]) => {
      // Check if any patch affects our clip
      const hasClipUpdate = patches?.some((patch: any) => {
        // Match paths like /clips/clipId or /clips/clipId/property
        const path = patch.path || "";
        return path.startsWith(`/clips/${clipId}`);
      });
      if (hasClipUpdate) {
        setEphemeralUpdates(null);
      }
    };

    studio.on("clip:transforming", handleTransforming);
    // Listen to core for finalization since that's where the command ends up
    core.on("change", handleUpdated);

    return () => {
      studio.off("clip:transforming", handleTransforming);
      core.off("change", handleUpdated);
    };
  }, [clipId, studio]);

  // Reset ephemeral state if the base clip changes meaningfully (e.g. undo/redo or selection change)
  // This is a safety measure.
  useEffect(() => {
    setEphemeralUpdates(null);
  }, [clipId]);

  if (!ephemeralUpdates) return baseClip;

  return {
    ...baseClip,
    ...ephemeralUpdates,
    // Deep merge style if needed
    style: {
      ...(baseClip?.style || {}),
      ...(ephemeralUpdates?.style || {}),
    },
  };
}
