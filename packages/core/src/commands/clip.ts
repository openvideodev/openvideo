import { CommandHandler, Patch } from './types';
import { AnyClip } from '../types';
import { manageTracks } from '../utils/manage-tracks';

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
  const { tracks: nextTracks } = manageTracks(state.tracks, clip, { trackId });

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
