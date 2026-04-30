import { MICROSECONDS_PER_SECOND, PIXELS_PER_SECOND } from "../constants/constants";
import { IClip } from "@designcombo/types";
import { OBJECT_TYPE_TRANSITION } from "../constants/objects";

export function timeUsToUnits(
  timeUs: number,
  zoom = 1,
  playbackRate = 1
): number {
  return ((timeUs / MICROSECONDS_PER_SECOND) * PIXELS_PER_SECOND * zoom) / playbackRate;
}

export function unitsToTimeUs(
  units: number,
  zoom = 1,
  playbackRate = 1
): number {
  return (units / (PIXELS_PER_SECOND * zoom)) * MICROSECONDS_PER_SECOND * playbackRate;
}

export function calculateTimelineWidth(
  totalLengthUs: number,
  zoom = 1
): number {
  return timeUsToUnits(totalLengthUs, zoom);
}

export const getDuration = (trackItems: Record<string, IClip>) =>
  Object.keys(trackItems).reduce((acc, id) => {
    const { display } = trackItems[id];
    return Math.max(acc, display?.to || 0);
  }, 0);

export const clipsToMap = (clips: IClip[]) =>
  clips.reduce(
    (acc, clip) => {
      acc[clip.id] = clip;
      return acc;
    },
    {} as Record<string, IClip>
  );

export const splitClips = (clips: IClip[]) => {
  const regular: IClip[] = [];
  const transitions: IClip[] = [];
  clips.forEach((clip) => {
    if (clip.type === OBJECT_TYPE_TRANSITION) transitions.push(clip);
    else regular.push(clip);
  });
  return { regular, transitions };
};
