import { useState, useEffect } from "react";
import { engine } from "@/lib/project";
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

  useEffect(() => {
    if (!clipId) return;

    const handleTransforming = (data: { id: string; updates: any }) => {
      if (data.id === clipId) {
        setEphemeralUpdates(data.updates);
      }
    };

    const handleUpdated = (data: { clip: any } | any) => {
      // Check if it's the right clip
      const id = data.clip?.id || data.id;
      if (id === clipId) {
        setEphemeralUpdates(null); // Clear ephemeral state when finalized
      }
    };

    engine.on("clip:transforming", handleTransforming);
    engine.on("clip:updated", handleUpdated);

    return () => {
      engine.off("clip:transforming", handleTransforming);
      engine.off("clip:updated", handleUpdated);
    };
  }, [clipId]);

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
    }
  };
}
