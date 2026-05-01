import { ITrack, AnyClip } from "../types";
import { generateId } from "./id";

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
};

/**
 * Ensures a clip is placed on a compatible track.
 * If trackId is provided, it uses it.
 * If not, it finds the first track of the same type or creates a new one.
 */
export const manageTracks = (
  tracks: ITrack[],
  clip: AnyClip,
  trackId?: string
): TrackManagementResult => {
  let nextTracks = [...tracks];
  let targetTrackId = trackId;

  if (!targetTrackId) {
    // For Effects, we usually want a new track every time to avoid overlapping filters
    // unless explicitly specified.
    if (clip.type === "Effect") {
       const newTrack: ITrack = {
        id: "track_" + generateId(),
        name: `Effect Track ${tracks.filter(t => t.type === "effect").length + 1}`,
        type: "effect",
        clipIds: [clip.id],
        accepts: ["effect"],
      };
      nextTracks.push(newTrack);
      targetTrackId = newTrack.id;
    } else {
      // Find first track of same type
      const existingTrack = tracks.find((t) => t.type === clip.type.toLowerCase() || t.type === clip.type);
      if (existingTrack) {
        targetTrackId = existingTrack.id;
      } else {
        // Create new track
        const newTrack: ITrack = {
          id: generateId(),
          name: `${clip.type} Track`,
          type: clip.type.toLowerCase(), // Timeline expects lowercase for logic
          clipIds: [clip.id],
          accepts: ACCEPTS_MAP[clip.type] || [clip.type.toLowerCase()],
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
