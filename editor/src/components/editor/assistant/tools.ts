import { usePlaybackStore } from '@/stores/playback-store';
import { Video, Image, Text, Audio, Studio, Effect } from 'openvideo';
import { duplicateClip, splitClip, trimClip } from './action-handlers';
import { useTimelineStore } from '@/stores/timeline-store';

export const handleAddClip = async (input: any, studio: Studio) => {
  const {
    text,
    prompt,
    assetType,
    targetId,
    duration,
    width,
    height,
    left,
    top,
    action,
  } = input;
  const from = input.from ?? 0;
  const to = input.to ? (input.to - from < 1 ? 1 : input.to) : from + 5;

  let clip;
  const type =
    assetType ||
    (action === 'add_text'
      ? 'text'
      : action === 'add_image'
        ? 'image'
        : action === 'add_video'
          ? 'video'
          : action === 'add_audio'
            ? 'audio'
            : 'video');

  if (type === 'video' && prompt) {
    console.log('video prompt: ', prompt);
    const url =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
    clip = await Video.fromUrl(url);
  } else if (type === 'image' && prompt) {
    console.log('image prompt: ', prompt);
    const url = 'https://picsum.photos/800/600';
    clip = await Image.fromUrl(url);
  } else if (type === 'text' && (text || input.text)) {
    clip = new Text(text || input.text, {
      fontSize: 100,
      fill: '#ffffff',
      fontFamily: 'Inter',
    });
  } else if (type === 'audio' && prompt) {
    console.log('audio prompt: ', prompt);
    const url =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
    clip = await Audio.fromUrl(url);
  }

  if (clip) {
    if (targetId) (clip as any).id = targetId;
    if (width) clip.width = width;
    if (height) clip.height = height;
    if (left !== undefined) clip.left = left;
    if (top !== undefined) clip.top = top;
    if (duration) clip.duration = duration * 1000000;

    // Apply display timing (convert to microseconds)
    clip.update({
      duration: (to - from) * 1000000,
      display: {
        from: from * 1000000,
        to: to * 1000000,
      },
    });

    studio.addClip(clip);
  }
};

export const handleUpdateClip = async (input: any, studio: Studio) => {
  const { left, top, width, height, start, targetId, clipId } = input;
  const id = targetId || clipId;
  if (!id) return;

  const updates: any = {};
  if (left !== undefined) updates.left = left;
  if (top !== undefined) updates.top = top;
  if (width !== undefined) updates.width = width;
  if (height !== undefined) updates.height = height;
  if (start !== undefined)
    updates.display = { ...updates.display, from: start * 1000000 };

  await studio.updateClip(id, updates);
};

export const handleRemoveClip = async (input: any, studio: Studio) => {
  const id = input.targetId || input.clipId;
  const clip = studio.getClipById(id);
  if (clip) {
    console.log('delete clip:', clip);
    await studio.removeClip(id);
  }
};

export const handleSplitClip = async (input: any, studio: Studio) => {
  const id = input.targetId || input.clipId;
  const splitTime = input.time || usePlaybackStore.getState().currentTime;
  const clip = studio.getClipById(id);
  if (clip && splitTime) {
    await splitClip(
      id,
      splitTime,
      studio,
      useTimelineStore,
      useTimelineStore.getState().updateClip
    );
  } else if (splitTime) {
    await studio.splitSelected(splitTime * 1_000_000);
  }
};

export const handleTrimClip = async (input: any, studio: Studio) => {
  const id = input.targetId || input.clipId;
  const clip = studio.getClipById(id);
  if (clip) {
    await trimClip(
      id,
      { from: input.trimFrom, to: 0 }, // This handler expects timeline and display, need to check logic
      { from: 0, to: 0 },
      studio,
      useTimelineStore.getState().updateClip
    );
  } else {
    await studio.trimSelected(input.trimFrom);
  }
};

export const handleAddTransition = async (input: any, studio: Studio) => {
  const { fromId, toId, transitionType } = input;
  if (fromId && toId && transitionType) {
    await studio.addTransition(
      transitionType || 'GridFlip',
      2_000_000,
      fromId,
      toId
    );
  }
};

export const handleAddEffect = async (input: any, studio: Studio) => {
  const from = input.from ?? 0;
  const to = input.to ? (input.to - from < 1 ? 1 : input.to) : from + 5;

  const effectClip = new Effect(input.effectName);

  // Default positioning (5 seconds)
  effectClip.display.from = from * 1_000_000;
  effectClip.duration = (to - from) * 1_000_000;
  effectClip.display.to = to * 1_000_000;

  // In a real scenario, we might want to attach this effect to the targetId
  // For now, we just add it to the timeline as requested by the tool
  await studio.addClip(effectClip);
};

export const handleDuplicateClip = async (input: any, studio: Studio) => {
  const id = input.targetId || input.clipId;
  const clip = studio.getClipById(id);
  if (clip) {
    console.log('duplicate clip:', clip);
    await duplicateClip(id, studio, useTimelineStore);
  } else {
    await studio.duplicateSelected();
  }
};
