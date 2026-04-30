import { ITrack } from "@designcombo/types";

export function findRelativePosition(
  arr: number[],
  referenceValue: number,
  targetValue: number
): number | null {
  const referenceIndex = arr.indexOf(referenceValue);
  const targetIndex = arr.indexOf(targetValue);

  // If either value is not found in the array, return null
  if (referenceIndex === -1 || targetIndex === -1) {
    return null;
  }

  // Return the difference in their indices
  return targetIndex - referenceIndex;
}

// Function to create a new array based on refTrack and newTracks
export function createCombinedTracksArray(
  refTrack: ITrack,
  newTracks: (ITrack & { tempIndex: number })[]
): ITrack[] {
  // Sort newTracks based on tempIndex
  const sortedNewTracks = newTracks.sort((a, b) => a.tempIndex - b.tempIndex);

  // Create an array to hold the final result
  const combinedTracks: ITrack[] = [];

  // Iterate through sorted new tracks and add them in order
  for (const track of sortedNewTracks) {
    if (track.tempIndex < 0) {
      combinedTracks.push(track); // Add tracks with negative tempIndex before refTrack
    }
  }

  // Add the refTrack in the middle
  combinedTracks.push(refTrack);

  // Add tracks with non-negative tempIndex after refTrack
  for (const track of sortedNewTracks) {
    if (track.tempIndex >= 0) {
      combinedTracks.push(track); // Add tracks with zero or positive tempIndex after refTrack
    }
  }

  return combinedTracks;
}
