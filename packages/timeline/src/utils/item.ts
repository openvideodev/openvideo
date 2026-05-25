import { ITimelineTrack } from "../timeline";

// Function to remove specified items from the tracks array
export function removeItemsFromTrack(
  tracks: ITimelineTrack[],
  itemsToRemove: string[],
): ITimelineTrack[] {
  return tracks.map((track) => ({
    ...track,
    clipIds: track.clipIds.filter((item: string) => !itemsToRemove.includes(item)),
  }));
}
