import { Patch } from "../commands/types";
import { set, unset } from "lodash-es";

/**
 * Applies a list of patches to an object.
 * Note: This currently assumes a flat-ish state for simplicity as per requirements,
 * but uses lodash for path support.
 */
export const applyPatches = (state: any, patches: Patch[]) => {
  let clonedClips = false;
  let clonedTracks = false;
  let clonedSettings = false;
  let clonedSelectedIds = false;

  patches.forEach((patch) => {
    // Remove leading slash if present for lodash path compatibility
    const cleanPath = patch.path.startsWith("/") ? patch.path.slice(1) : patch.path;
    const firstSegment = cleanPath.split("/")[0];

    if (firstSegment === "clips" && !clonedClips && state.clips) {
      state.clips = { ...state.clips };
      clonedClips = true;
    }
    if (firstSegment === "tracks" && !clonedTracks && state.tracks) {
      state.tracks = [...state.tracks];
      clonedTracks = true;
    }
    if (firstSegment === "settings" && !clonedSettings && state.settings) {
      state.settings = { ...state.settings };
      clonedSettings = true;
    }
    if (firstSegment === "selectedIds" && !clonedSelectedIds && state.selectedIds) {
      state.selectedIds = [...state.selectedIds];
      clonedSelectedIds = true;
    }

    const lodashPath = cleanPath.replace(/\//g, ".");

    switch (patch.op) {
      case "add":
      case "update":
        set(state, lodashPath, patch.value);
        break;
      case "remove":
        unset(state, lodashPath);
        break;
    }
  });
};

/**
 * Inverts a list of patches to create undo patches.
 */
export const invertPatches = (patches: Patch[]): Patch[] => {
  return [...patches].reverse().map((patch) => {
    switch (patch.op) {
      case "add":
        return { op: "remove", path: patch.path };
      case "update":
        return {
          op: "update",
          path: patch.path,
          value: patch.oldValue,
          oldValue: patch.value,
        };
      case "remove":
        return { op: "add", path: patch.path, value: patch.oldValue };
      default:
        throw new Error(`Unknown patch operation: ${patch.op}`);
    }
  });
};
