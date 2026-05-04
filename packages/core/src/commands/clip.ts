import { CommandHandler, Patch } from './types';
import { AnyClip } from '../types';
import { manageTracks } from '../utils/manage-tracks';
import { generateId } from '../utils/id';

export const addClipHandler: CommandHandler<{
  clip: AnyClip;
  trackId?: string;
}> = (state, command) => {
  const { clip, trackId } = command.payload;
  const patches: Patch[] = [];

  // Add clip to the clips record
  patches.push({
    op: 'add',
    path: `/clips/${clip.id}`,
    value: clip,
  });

  // Manage tracks (add clip to track)
  const { tracks: nextTracks } = manageTracks(state.tracks, clip, state.clips, { trackId });
  console.log("ADD CLIP", {nextTracks, clip})
  // Since tracks is an array, we might want to replace the whole thing or do specific updates.
  // Replacing the whole tracks array is safer for now given our simple patch system.
  patches.push({
    op: 'update',
    path: '/tracks',
    value: nextTracks,
    oldValue: state.tracks,
  });

  return patches;
};

export const updateClipHandler: CommandHandler<{
  id: string;
  updates: Partial<AnyClip>;
}> = (state, command) => {
  const { id, updates } = command.payload;
  const clip = state.clips[id];
  if (!clip) return [];

  const patches: Patch[] = [];
  const updatedClip = { ...clip, ...updates } as AnyClip;

  if (updates.display) {
    updatedClip.duration = updates.display.to - updates.display.from;
  }

  patches.push({
    op: 'update',
    path: `/clips/${id}`,
    value: updatedClip,
    oldValue: clip,
  });

  return patches;
};

export const removeClipsHandler: CommandHandler<{ ids: string[] }> = (
  state,
  command
) => {
  const { ids } = command.payload;
  const patches: Patch[] = [];

  ids.forEach((id) => {
    patches.push({
      op: 'remove',
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
    (track) => track.clipIds.length > 0 || track.static === true
  );

  patches.push({
    op: 'update',
    path: '/tracks',
    value: nextTracks,
    oldValue: state.tracks,
  });

  // Also handle selection cleanup
  const nextSelectedIds = state.selectedIds.filter((id) => !ids.includes(id));
  if (nextSelectedIds.length !== state.selectedIds.length) {
    patches.push({
      op: 'update',
      path: '/selectedIds',
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

  if (
    time <= clip.display.from ||
    (clip.display.to > 0 && time >= clip.display.to)
  ) {
    return [];
  }

  const patches: Patch[] = [];
  const splitOffset = time - clip.display.from;
  const playbackRate = clip.playbackRate || 1;
  const splitOffsetInSource = splitOffset * playbackRate;

  // 1. Update original clip (Left Part)
  const leftClip = {
    ...clip,
    duration: splitOffset,
    display: {
      ...clip.display,
      to: time,
    },
  };

  if (clip.trim) {
    leftClip.trim = {
      ...clip.trim,
      to: clip.trim.from + splitOffsetInSource,
    };
  }

  patches.push({
    op: 'update',
    path: `/clips/${id}`,
    value: leftClip,
    oldValue: clip,
  });

  // 2. Create new clip (Right Part)
  const newClipId = generateId();
  const rightClip: AnyClip = {
    ...clip,
    id: newClipId,
    display: {
      ...clip.display,
      from: time,
    },
    duration: clip.duration - splitOffset,
  };

  console.log('split', {
    leftClip,
    rightClip,
    splitOffsetInSource,
    playbackRate,
    splitOffset,
    time,
    clip,
  });

  if (clip.trim) {
    rightClip.trim = {
      ...clip.trim,
      from: clip.trim.from + splitOffsetInSource,
    };
  }

  patches.push({
    op: 'add',
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
      t.id === track.id ? { ...t, clipIds: nextClipIds } : t
    );

    patches.push({
      op: 'update',
      path: '/tracks',
      value: nextTracks,
      oldValue: state.tracks,
    });
  }

  // 4. Update selection
  patches.push({
    op: 'update',
    path: '/selectedIds',
    value: [newClipId],
    oldValue: state.selectedIds,
  });

  return patches;
};
