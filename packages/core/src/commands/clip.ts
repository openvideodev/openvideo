import { CommandHandler, Patch } from "./types";
import { AnyClip } from "../types";
import { manageTracks } from "../utils/manage-tracks";
import { generateId } from "../utils/id";
import { redistributeCaptionWords } from "../utils/caption-utils";
import { normalizeClip, normalizeClipStyle } from "../utils/normalize";

export const addClipHandler: CommandHandler<{
  clip: AnyClip;
  trackId?: string;
}> = (state, command) => {
  const { clip, trackId } = command.payload;
  const patches: Patch[] = [];

  // Clone clip and delete legacy root properties to keep clip object clean
  const cleanClip = { ...clip };
  delete cleanClip.display;
  delete cleanClip.trim;
  delete cleanClip.duration;
  delete cleanClip.playbackRate;

  // Add clip to the clips record
  patches.push({
    op: "add",
    path: `/clips/${clip.id}`,
    value: cleanClip,
  });

  // Manage tracks (add clip to track)
  const { tracks: nextTracks } = manageTracks(state.tracks, clip, state.clips, { trackId });
  // Since tracks is an array, we might want to replace the whole thing or do specific updates.
  // Replacing the whole tracks array is safer for now given our simple patch system.
  patches.push({
    op: "update",
    path: "/tracks",
    value: nextTracks,
    oldValue: state.tracks,
  });

  return patches;
};

export const updateClipHandler: CommandHandler<
  { id: string; updates: Partial<AnyClip> } | { id: string; updates: Partial<AnyClip> }[]
> = (state, command) => {
  const updates = Array.isArray(command.payload) ? command.payload : [command.payload];

  const patches: Patch[] = [];

  for (const { id, updates: clipUpdates } of updates) {
    const clip = state.clips[id];
    if (!clip) continue;

    // Generic deep merge for nested objects (like style, caption, timing, transform)
    const deepMerge = (target: any, source: any) => {
      if (!source) return target;
      if (!target) return source;
      const result = { ...target };
      for (const key in source) {
        const v = source[key];
        if (
          v !== null &&
          typeof v === "object" &&
          !Array.isArray(v) &&
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          result[key] = deepMerge(result[key], v);
        } else {
          result[key] = v;
        }
      }
      return result;
    };

    // Pre-normalize updates if they contain legacy flat transform/style fields
    const flatTransformProps = [
      "left",
      "top",
      "width",
      "height",
      "angle",
      "zIndex",
      "opacity",
      "flip",
    ];
    const hasFlatTransform = flatTransformProps.some(
      (prop) => (clipUpdates as any)[prop] !== undefined,
    );

    let normalizedUpdates = { ...clipUpdates };

    if (hasFlatTransform || normalizedUpdates.transform) {
      const currentTransform = clip.transform || {};
      const transformUpdates: any = { ...currentTransform };

      if (normalizedUpdates.transform) {
        Object.assign(transformUpdates, normalizedUpdates.transform);
      }

      if ((clipUpdates as any).left !== undefined) transformUpdates.x = (clipUpdates as any).left;
      if ((clipUpdates as any).top !== undefined) transformUpdates.y = (clipUpdates as any).top;
      if ((clipUpdates as any).width !== undefined)
        transformUpdates.width = (clipUpdates as any).width;
      if ((clipUpdates as any).height !== undefined)
        transformUpdates.height = (clipUpdates as any).height;
      if ((clipUpdates as any).angle !== undefined)
        transformUpdates.angle = (clipUpdates as any).angle;
      if ((clipUpdates as any).zIndex !== undefined)
        transformUpdates.zIndex = (clipUpdates as any).zIndex;
      if ((clipUpdates as any).opacity !== undefined)
        transformUpdates.opacity = (clipUpdates as any).opacity;
      if ((clipUpdates as any).flip !== undefined)
        transformUpdates.flip = (clipUpdates as any).flip;

      normalizedUpdates.transform = transformUpdates;

      // Clean up flat properties
      flatTransformProps.forEach((prop) => {
        delete (normalizedUpdates as any)[prop];
      });
    }

    if (normalizedUpdates.style) {
      normalizedUpdates.style = normalizeClipStyle(normalizedUpdates.style, clip.type);
    }

    let updatedClip: any = { ...clip };

    // Apply updates
    for (const key in normalizedUpdates) {
      if (key === "style" || key === "caption" || key === "timing" || key === "transform") {
        updatedClip[key] = deepMerge(clip[key] || {}, (normalizedUpdates as any)[key]);
      } else {
        updatedClip[key] = (normalizedUpdates as any)[key];
      }
    }

    // Special handling for Caption clips: when text is updated, redistribute words
    if (
      updatedClip.type === "Caption" &&
      clipUpdates.text !== undefined &&
      clipUpdates.words === undefined
    ) {
      const currentWords = updatedClip.caption?.words || [];
      const durationUs =
        updatedClip.timing?.duration ||
        (updatedClip.timing?.display?.to || 0) - (updatedClip.timing?.display?.from || 0) ||
        0;
      const redistributedWords = redistributeCaptionWords(
        clipUpdates.text,
        currentWords,
        durationUs,
      );

      if (!updatedClip.caption) updatedClip.caption = {};
      updatedClip.caption.words = redistributedWords;
    }

    // Ensure we delete all legacy flat fields from the root and normalize the final state
    updatedClip = normalizeClip(updatedClip);

    patches.push({
      op: "update",
      path: `/clips/${id}`,
      value: updatedClip,
      oldValue: clip,
    });
  }

  return patches;
};

export const duplicateClipsHandler: CommandHandler<{ ids: string[] }> = (state, command) => {
  const { ids } = command.payload;
  const patches: Patch[] = [];
  const nextTracks = [...state.tracks];
  const newIds: string[] = [];

  // Map to keep track of new tracks created during this duplication
  // Key: originalTrackId, Value: newTrack object
  const trackMapping = new Map<string, any>();

  for (const id of ids) {
    const clip = state.clips[id];
    if (!clip) continue;

    const newId = generateId();
    const newClip = normalizeClip({ ...clip, id: newId });
    newIds.push(newId);

    // 1. Add the new clip to the clips record
    patches.push({
      op: "add",
      path: `/clips/${newId}`,
      value: newClip,
    });

    // 2. Find original track and handle track placement
    const originalTrack = state.tracks.find((t) => t.clipIds.includes(id));
    if (originalTrack) {
      let targetTrack = trackMapping.get(originalTrack.id);

      if (!targetTrack) {
        // Create a new track for duplicates from this original track
        const newTrackId = `track_${generateId()}`;
        targetTrack = {
          id: newTrackId,
          name: `${originalTrack.name} (Copy)`,
          type: originalTrack.type,
          clipIds: [newId],
          accepts: originalTrack.accepts || [originalTrack.type],
        };
        trackMapping.set(originalTrack.id, targetTrack);
        // Prepend the new track (top-most in some UIs, or just next to it)
        nextTracks.unshift(targetTrack);
      } else {
        // Add clip to the already created track for this group
        targetTrack.clipIds.push(newId);
      }
    }
  }

  // 3. Update the tracks array
  patches.push({
    op: "update",
    path: "/tracks",
    value: nextTracks,
    oldValue: state.tracks,
  });

  // 4. Update selection to the new duplicates
  patches.push({
    op: "update",
    path: "/selectedIds",
    value: newIds,
    oldValue: state.selectedIds,
  });

  return patches;
};

export const removeClipsHandler: CommandHandler<{ ids: string[] }> = (state, command) => {
  const { ids } = command.payload;
  const patches: Patch[] = [];

  ids.forEach((id) => {
    patches.push({
      op: "remove",
      path: `/clips/${id}`,
      oldValue: state.clips[id],
    });
  });

  const tracksAfterClipRemoval = state.tracks.map((track) => ({
    ...track,
    clipIds: track.clipIds.filter((id) => !ids.includes(id)),
  }));

  // Auto-remove empty tracks unless they are static
  const nextTracks = tracksAfterClipRemoval.filter(
    (track) => track.clipIds.length > 0 || track.static === true,
  );

  patches.push({
    op: "update",
    path: "/tracks",
    value: nextTracks,
    oldValue: state.tracks,
  });

  // Also handle selection cleanup
  const nextSelectedIds = state.selectedIds.filter((id) => !ids.includes(id));
  if (nextSelectedIds.length !== state.selectedIds.length) {
    patches.push({
      op: "update",
      path: "/selectedIds",
      value: nextSelectedIds,
      oldValue: state.selectedIds,
    });
  }

  return patches;
};

export const splitClipHandler: CommandHandler<{
  id: string;
  time: number;
}> = (state, command) => {
  const { id, time } = command.payload;
  const clip = state.clips[id];
  if (!clip || clip.locked) return [];

  const display = clip.timing?.display || clip.display;
  if (!display) return [];

  if (time <= display.from || (display.to > 0 && time >= display.to)) {
    return [];
  }

  const patches: Patch[] = [];
  const splitOffset = time - display.from;
  const playbackRate = clip.timing?.playbackRate || clip.playbackRate || 1;
  const splitOffsetInSource = splitOffset * playbackRate;

  // Ensure we have a valid timing block
  const timing = clip.timing || {
    display: { ...display },
    trim: clip.trim || { from: 0, to: 0 },
    duration: clip.duration || display.to - display.from,
    playbackRate,
  };

  // 1. Update original clip (Left Part)
  const leftClip = {
    ...clip,
    timing: {
      ...timing,
      duration: splitOffset,
      display: {
        ...timing.display,
        to: time,
      },
    },
  };

  const trim = timing.trim;
  if (trim) {
    leftClip.timing.trim = {
      ...trim,
      to: trim.from + splitOffsetInSource,
    };
  }

  // Ensure we delete all flat fields from the root
  delete (leftClip as any).display;
  delete (leftClip as any).trim;
  delete (leftClip as any).duration;
  delete (leftClip as any).playbackRate;

  patches.push({
    op: "update",
    path: `/clips/${id}`,
    value: leftClip,
    oldValue: clip,
  });

  // 2. Create new clip (Right Part)
  const newClipId = generateId();
  const rightClip: AnyClip = {
    ...clip,
    id: newClipId,
    timing: {
      ...timing,
      display: {
        ...timing.display,
        from: time,
      },
      duration: timing.duration - splitOffset,
    },
  };

  if (trim) {
    rightClip.timing.trim = {
      ...trim,
      from: trim.from + splitOffsetInSource,
    };
  }

  // Ensure we delete all flat fields from the root
  delete (rightClip as any).display;
  delete (rightClip as any).trim;
  delete (rightClip as any).duration;
  delete (rightClip as any).playbackRate;

  patches.push({
    op: "add",
    path: `/clips/${newClipId}`,
    value: rightClip,
  });

  // 3. Update track
  const track = state.tracks.find((t) => t.clipIds.includes(id));
  if (track) {
    const nextClipIds = [...track.clipIds];
    const index = nextClipIds.indexOf(id);
    nextClipIds.splice(index + 1, 0, newClipId);

    const nextTracks = state.tracks.map((t) =>
      t.id === track.id ? { ...t, clipIds: nextClipIds } : t,
    );

    patches.push({
      op: "update",
      path: "/tracks",
      value: nextTracks,
      oldValue: state.tracks,
    });
  }

  // 4. Update selection
  patches.push({
    op: "update",
    path: "/selectedIds",
    value: [newClipId],
    oldValue: state.selectedIds,
  });

  return patches;
};
