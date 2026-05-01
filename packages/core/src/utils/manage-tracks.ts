import { ITrack, AnyClip } from "../types";
import { generateId } from "./id";

export interface AddClipOptions {
  trackId?: string;
  trackIndex?: number;
  isNewTrack?: boolean;
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
  options?: AddClipOptions
): TrackManagementResult => {
  let nextTracks = [...tracks];
  const { trackId, trackIndex, isNewTrack } = options || {};
  let targetTrackId = trackId;

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

    if (accepts.includes(clipTypeLower) || (ACCEPTS_MAP[clip.type] && ACCEPTS_MAP[clip.type].some(a => accepts.includes(a)))) {
      targetTrackId = targetTrack.id;
    }
  }

  if (!targetTrackId) {
    // For Effects, we usually want a new track every time to avoid overlapping filters
    if (clip.type === "Effect") {
      const newTrack: ITrack = {
        id: "track_" + generateId(),
        name: `Effect Track ${tracks.filter((t) => t.type === "effect").length + 1}`,
        type: "effect",
        clipIds: [clip.id],
        accepts: ["effect"],
      };
      nextTracks.push(newTrack);
      targetTrackId = newTrack.id;
    } else {
      // Find first track of same type
      const existingType = clip.type.toLowerCase();
      const existingTrack = tracks.find(
        (t) => t.type === existingType || t.type === clip.type
      );

      if (existingTrack) {
        targetTrackId = existingTrack.id;
      } else {
        // Create new track
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

  // Add clip ID to the target track if not already there (and not newly created)
  nextTracks = nextTracks.map((t) => {
    if (t.id === targetTrackId && !t.clipIds.includes(clip.id)) {
      return { ...t, clipIds: [...t.clipIds, clip.id] };
    }
    return t;
  });

  return { tracks: nextTracks };
};
