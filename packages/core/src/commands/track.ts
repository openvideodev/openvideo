import { CommandHandler, Patch } from './types';
import { ITrack } from '../types';
import { nanoid } from 'nanoid';

export const addTrackHandler: CommandHandler<Partial<ITrack>> = (
  state,
  command
) => {
  const payload = command.payload;
  const newTrack: ITrack = {
    id: payload?.id || 'track_' + nanoid(10),
    name: payload?.name || 'Track ' + (state.tracks.length + 1),
    type: payload?.type || 'Video',
    clipIds: payload?.clipIds || [],
    accepts: payload?.accepts,
  };

  return [
    {
      op: 'update',
      path: '/tracks',
      value: [newTrack, ...state.tracks],
      oldValue: state.tracks,
    },
  ];
};

export const removeTrackHandler: CommandHandler<{ id: string }> = (
  state,
  command
) => {
  const { id } = command.payload;
  const track = state.tracks.find((t) => t.id === id);
  if (!track) return [];

  const patches: Patch[] = [];

  // Track removal involves removing its clips too
  track.clipIds.forEach((clipId) => {
    patches.push({
      op: 'remove',
      path: `/clips/${clipId}`,
      oldValue: state.clips[clipId],
    });
  });

  patches.push({
    op: 'update',
    path: '/tracks',
    value: state.tracks.filter((t) => t.id !== id),
    oldValue: state.tracks,
  });

  return patches;
};

export const moveTrackHandler: CommandHandler<{
  id: string;
  newIndex: number;
}> = (state, command) => {
  const { id, newIndex } = command.payload;
  const currentIndex = state.tracks.findIndex((t) => t.id === id);
  if (currentIndex === -1) return [];

  const newTracks = [...state.tracks];
  const [movedTrack] = newTracks.splice(currentIndex, 1);
  newTracks.splice(newIndex, 0, movedTrack);

  return [
    {
      op: 'update',
      path: '/tracks',
      value: newTracks,
      oldValue: state.tracks,
    },
  ];
};
