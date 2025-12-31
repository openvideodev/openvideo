import updatedData from './updated.json';
import { ITimelineTrack, IClip } from '@/types/timeline';

// Directly importing local JSON and transforming to Store format
const rawData = updatedData;

export function loadStudioData() {
  const clips: Record<string, IClip> = {};

  // Create Clips Map
  // rawData.clips.forEach((c: any) => {
  //   clips[c.id] = c as IClip;
  // });

  // Create Tracks List with Clip IDs
  // const tracks: ITimelineTrack[] = rawData.tracks.map((t: any) => ({
  //   id: t.id,
  //   name: t.name,
  //   type: t.type,
  //   clipIds: t.clipIds || [],
  //   muted: false,
  // }));

  const tracks: ITimelineTrack[] = [];
  // Ensure clipIds in tracks actually exist in clips map (Optional validation)
  tracks.forEach((track) => {
    track.clipIds = track.clipIds.filter((id) => clips[id] !== undefined);
  });

  return { tracks, clips };
}

export const { tracks, clips } = loadStudioData();
