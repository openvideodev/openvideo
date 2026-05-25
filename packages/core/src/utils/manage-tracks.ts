import { ITrack, AnyClip } from "../types";
import { generateId } from "./id";

export interface AddClipOptions {
  trackId?: string;
  trackIndex?: number;
  isNewTrack?: boolean;
  objectFit?: "contain" | "cover";
}

export interface TrackManagementResult {
  tracks: ITrack[];
}

const ACCEPTS_MAP: Record<string, string[]> = {
  Text: ["text", "caption"],
  Image: ["image", "video"],
  Video: ["video", "image"],
  Audio: ["audio"],
  Caption: ["caption", "text"],
  Effect: ["effect"],
  Transition: ["transition"],
};

/**
 * Ensures a clip is placed on a compatible track.
 * If trackId is provided, it uses it.
 * If not, it finds the first track of the same type or creates a new one.
 */
export const manageTracks = (
  tracks: ITrack[],
  clip: AnyClip,
  allClips: Record<string, AnyClip>,
  options?: AddClipOptions,
): TrackManagementResult => {
  let nextTracks = [...tracks];
  const { trackId, trackIndex, isNewTrack } = options || {};
  let targetTrackId = trackId;

  // Handle transition clips by placing them directly on their parent clip's track
  if (clip.type === "Transition") {
    const parentClipId = (clip as any).fromClipId || (clip as any).toClipId;
    if (parentClipId) {
      const parentTrack = nextTracks.find((t) => t.clipIds.includes(parentClipId));
      if (parentTrack) {
        targetTrackId = parentTrack.id;
      }
    }
  }

  if (!targetTrackId) {
    if (isNewTrack) {
      const existingType = clip.type.toLowerCase();
      const newTrack: ITrack = {
        id: generateId(),
        name: `${clip.type} Track`,
        type: existingType,
        clipIds: [clip.id],
        accepts: ACCEPTS_MAP[clip.type] || [existingType],
      };

      if (typeof trackIndex === "number") {
        nextTracks.splice(trackIndex, 0, newTrack);
      } else {
        nextTracks.push(newTrack);
      }
      targetTrackId = newTrack.id;
    } else if (typeof trackIndex === "number" && nextTracks[trackIndex]) {
      // Force specific track if compatible
      const targetTrack = nextTracks[trackIndex];
      const accepts = targetTrack.accepts || [targetTrack.type];
      const clipTypeLower = clip.type.toLowerCase();

      if (
        accepts.includes(clipTypeLower) ||
        (ACCEPTS_MAP[clip.type] && ACCEPTS_MAP[clip.type].some((a) => accepts.includes(a)))
      ) {
        targetTrackId = targetTrack.id;
      }
    }
  }

  if (!targetTrackId) {
    // For Effects, we always want a new track to avoid overlapping filters affecting the same range
    if (clip.type === "Effect") {
      const newTrack: ITrack = {
        id: generateId(),
        name: `Effect Track ${tracks.filter((t) => t.type === "effect").length + 1}`,
        type: "effect",
        clipIds: [clip.id],
        accepts: ["effect"],
      };
      nextTracks.push(newTrack);
      targetTrackId = newTrack.id;
    } else {
      // Find a track of the same type that DOES NOT overlap with the new clip
      const existingType = clip.type.toLowerCase();
      const compatibleTrack = tracks.find((t) => {
        const isCorrectType = t.type === existingType || t.type === clip.type;
        if (!isCorrectType) return false;

        // Check for overlaps with existing clips on this track
        const hasOverlap = t.clipIds.some((id) => {
          const existingClip = allClips[id];
          if (!existingClip) return false;

          const clipDisplay = clip.timing?.display || clip.display;
          const existingDisplay = existingClip.timing?.display || existingClip.display;
          if (!clipDisplay || !existingDisplay) return false;

          return !(
            clipDisplay.to <= existingDisplay.from || clipDisplay.from >= existingDisplay.to
          );
        });

        return !hasOverlap;
      });

      if (compatibleTrack) {
        targetTrackId = compatibleTrack.id;
      } else {
        // Create new track if no compatible non-overlapping track found
        const newTrack: ITrack = {
          id: generateId(),
          name: `${clip.type} Track`,
          type: existingType,
          clipIds: [clip.id],
          accepts: ACCEPTS_MAP[clip.type] || [existingType],
        };
        nextTracks.push(newTrack);
        targetTrackId = newTrack.id;
      }
    }
  }

  // Add clip ID to the target track if not already there, and append 'transition' to accepts if applicable
  nextTracks = nextTracks.map((t) => {
    if (t.id === targetTrackId) {
      const nextClipIds = t.clipIds.includes(clip.id) ? t.clipIds : [...t.clipIds, clip.id];
      let nextAccepts = t.accepts || [t.type];

      if (clip.type === "Transition" && !nextAccepts.includes("transition")) {
        nextAccepts = [...nextAccepts, "transition"];
      }

      return {
        ...t,
        clipIds: nextClipIds,
        accepts: nextAccepts,
      };
    }
    return t;
  });

  return { tracks: nextTracks };
};
