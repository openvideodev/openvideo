import { core, projectStore } from '@/lib/project';
import { nanoid } from '@openvideo/core';

export const duplicateClip = async (clipId: string) => {
  const state = projectStore.getState();
  const originalClip = state.clips[clipId];
  if (!originalClip) return;

  const track = state.tracks.find((t: any) => t.clipIds.includes(clipId));
  if (!track) return;

  const newClipId = nanoid();
  const newClip = {
    ...originalClip,
    id: newClipId,
  };

  const newTrackId = 'track_' + nanoid(10);
  const newTrackName = `${track.name} (Copy)`;

  core.batch([
    {
      id: nanoid(),
      type: 'track.add',
      payload: { id: newTrackId, name: newTrackName, type: track.type },
    },
    {
      id: nanoid(),
      type: 'clip.add',
      payload: { clip: newClip, trackId: newTrackId },
    },
  ] as any[]);

  return newClipId;
};

export const deleteClip = async (clipId: string) => {
  core.clip.remove([clipId]);
};

export const splitClip = async (clipId: string, splitTime: number) => {
  const splitTimeUs = splitTime * 1000000;
  const state = projectStore.getState();
  const clip = state.clips[clipId];

  if (!clip) return;

  const splitOffset = splitTimeUs - clip.display.from;
  const playbackRate = clip.playbackRate || 1;
  const splitOffsetInSource = splitOffset * playbackRate;

  const updates: any = {
    duration: splitOffset,
    display: {
      from: clip.display.from,
      to: splitTimeUs,
    },
  };

  if (clip.trim) {
    updates.trim = {
      from: clip.trim.from,
      to: clip.trim.from + splitOffsetInSource,
    };
  }

  const splitClipUpdateCommand = {
    id: nanoid(),
    type: 'clip.update',
    payload: { id: clipId, updates },
  };

  const newClipId = nanoid();
  const newClip = {
    ...clip,
    id: newClipId,
    display: {
      from: splitTimeUs,
      to: clip.display.to,
    },
    duration: clip.duration - splitOffset,
  };

  if (newClip.trim) {
    newClip.trim = {
      from: newClip.trim.from + splitOffsetInSource,
      to: newClip.trim.to,
    };
  }

  const track = state.tracks.find((t: any) => t.clipIds.includes(clipId));
  if (track) {
    core.batch([
      splitClipUpdateCommand,
      {
        id: nanoid(),
        type: 'clip.add',
        payload: { clip: newClip, trackId: track.id },
      },
    ] as any[]);
  }

  return newClip.id;
};

export const trimClip = async (
  clipId: string,
  timeline: { from: number; to: number }, // seconds
  display: { from: number; to: number } // seconds
) => {
  const state = projectStore.getState();
  const currentClip = state.clips[clipId];
  if (!currentClip) return;

  const playbackRate = currentClip.playbackRate || 1;

  const currentTrimFromUs = currentClip.trim?.from ?? 0;
  const currentTrimToUs = currentClip.trim?.to ?? currentClip.duration;

  const newTrimFromUs =
    timeline.from !== undefined ? timeline.from * 1000000 : currentTrimFromUs;
  const newTrimToUs =
    timeline.to !== undefined ? timeline.to * 1000000 : currentTrimToUs;

  const newSourceDurationUs = newTrimToUs - newTrimFromUs;
  const newDurationUs = newSourceDurationUs / playbackRate;

  const newDisplayFromUs =
    display.from !== undefined
      ? display.from * 1000000
      : currentClip.display.from;
  const newDisplayToUs = newDisplayFromUs + newDurationUs;

  const updates: any = {
    duration: newDurationUs,
    display: {
      from: newDisplayFromUs,
      to: newDisplayToUs,
    },
    trim: {
      from: newTrimFromUs,
      to: newTrimToUs,
    },
  };

  core.clip.update(clipId, updates);
};

export const applyEffectClip = async (
  name: string,
  timeline: { from: number; to: number }
) => {
  const from = timeline.from * 1000000;
  const to = timeline.to * 1000000;
  const duration = to - from;

  await core.clip.add({
    type: 'Effect',
    name,
    duration,
    display: { from, to },
  });
};
