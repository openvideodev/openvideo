import { fontManager } from '@openvideo/engine-pixi';
import { duplicateClip, splitClip, trimClip } from './action-handlers';
import { core, projectStore } from '@/lib/project';
import { nanoid } from '@openvideo/core';
import { generateCaptionClips } from '@/lib/caption-generator';

export const handleAddClip = async (input: any) => {
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

  const type =
    assetType ||
    (action === 'add_text'
      ? 'Text'
      : action === 'add_image'
        ? 'Image'
        : action === 'add_video'
          ? 'Video'
          : action === 'add_audio'
            ? 'Audio'
            : 'Video');

  const clip: any = {
    id: targetId || `clip_${Date.now()}`,
    type,
    name: text || prompt || `${type} clip`,
    display: {
      from: from * 1000000,
      to: to * 1000000,
    },
    duration: (to - from) * 1000000,
    style: {},
  };

  if (width) clip.width = width;
  if (height) clip.height = height;
  if (left !== undefined) clip.left = left;
  if (top !== undefined) clip.top = top;

  if (type === 'Video' && prompt) {
    clip.src =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
  } else if (type === 'Image' && prompt) {
    clip.src = 'https://picsum.photos/800/600';
  } else if (type === 'Text' && (text || input.text)) {
    clip.text = text || input.text;
    clip.style = {
      fontSize: 100,
      fill: '#ffffff',
      fontFamily: 'Inter',
    };
  } else if (type === 'Audio' && prompt) {
    clip.src =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
  }

  await core.clip.add(clip);
};

export const handleUpdateClip = async (input: any) => {
  const {
    left,
    top,
    width,
    height,
    start,
    targetId,
    clipId,
    fontSize,
    fontFamily,
    fill,
    opacity,
    volume,
    playbackRate,
  } = input;
  const id = targetId || clipId;
  if (!id) return;

  const updates: any = {};
  if (left !== undefined) updates.left = left;
  if (top !== undefined) updates.top = top;
  if (width !== undefined) updates.width = width;
  if (height !== undefined) updates.height = height;
  if (start !== undefined)
    updates.display = { ...updates.display, from: start * 1000000 };

  // Style updates
  const styleUpdates: any = {};
  if (fontSize !== undefined) styleUpdates.fontSize = fontSize;
  if (fontFamily !== undefined) styleUpdates.fontFamily = fontFamily;
  if (fill !== undefined) styleUpdates.fill = fill;
  if (opacity !== undefined) styleUpdates.opacity = opacity;

  if (Object.keys(styleUpdates).length > 0) {
    updates.style = styleUpdates;
  }

  if (volume !== undefined) updates.volume = volume;
  if (playbackRate !== undefined) updates.playbackRate = playbackRate;

  core.clip.update(id, updates);
};

export const handleRemoveClip = async (input: any) => {
  const id = input.targetId || input.clipId;
  if (id) {
    core.clip.remove([id]);
  }
};

export const handleSplitClip = async (input: any) => {
  const id = input.targetId || input.clipId;
  const splitTime =
    input.time || projectStore.getState().currentTime / 1_000_000;
  const clip = projectStore.getState().clips[id];

  if (clip && splitTime) {
    await splitClip(id, splitTime);
  }
};

export const handleTrimClip = async (input: any) => {
  const id = input.targetId || input.clipId;
  const clip = projectStore.getState().clips[id];
  if (clip) {
    await trimClip(id, { from: input.trimFrom, to: 0 }, { from: 0, to: 0 });
  }
};

export const handleAddTransition = async (input: any) => {
  const { fromId, toId, transitionType } = input;
  if (fromId && toId && transitionType) {
    await core.clip.add({
      type: 'transition',
      name: transitionType || 'GridFlip',
      duration: 2_000_000,
      metadata: { fromId, toId },
    } as any);
  }
};

export const handleAddEffect = async (input: any) => {
  const from = input.from ?? 0;
  const to = input.to ? (input.to - from < 1 ? 1 : input.to) : from + 5;

  await core.clip.add({
    type: 'effect',
    name: input.effectName,
    display: {
      from: from * 1_000_000,
      to: to * 1_000_000,
    },
    duration: (to - from) * 1_000_000,
  });
};

export const handleDuplicateClip = async (input: any) => {
  const id = input.targetId || input.clipId;
  const clip = projectStore.getState().clips[id];
  if (clip) {
    await duplicateClip(id);
  }
};

export const handleSearchAndAddMedia = async (input: any) => {
  const { query, type, targetId, from: fromTime } = input;
  const from = fromTime ?? projectStore.getState().currentTime / 1_000_000;
  try {
    const response = await fetch(
      `/api/pexels?query=${encodeURIComponent(query)}&type=${type || 'video'}`
    );
    const data = await response.json();

    let src = '';
    if (type === 'image') {
      src = data.photos?.[0]?.src?.large;
    } else {
      src = data.videos?.[0]?.video_files?.[0]?.link;
    }

    if (src) {
      await core.clip.add({
        type: type || 'video',
        src,
        display: {
          from: from * 1000000,
          to: (from + 5) * 1000000,
        },
        duration: 5000000,
      });
    }
  } catch (error) {
    console.error('Failed to search and add media:', error);
  }
};

export const handleGenerateVoiceover = async (input: any) => {
  const { text, voiceId, targetId, from: fromTime } = input;
  const from = fromTime ?? projectStore.getState().currentTime / 1_000_000;

  try {
    const response = await fetch('/api/elevenlabs/voiceover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });
    const data = await response.json();

    if (data.url) {
      await core.clip.add({
        type: 'audio',
        src: data.url,
        display: {
          from: from * 1000000,
          to: (from + 5) * 1000000, // Default 5s if unknown
        },
        duration: 5000000,
      });
    }
  } catch (error) {
    console.error('Failed to generate voiceover:', error);
  }
};

export const handleSeekToTime = async (input: any) => {
  const { time } = input;
  core.seek(time * 1000000);
};

export const handleGenerateCaptions = async (input: any) => {
  const { clipIds } = input;
  const clips = projectStore.getState().clips;
  const targetIds =
    clipIds ||
    Object.keys(clips).filter(
      (id) => clips[id].type === 'Video' || clips[id].type === 'Audio'
    );

  try {
    const fontName = 'Bangers-Regular';
    const fontUrl =
      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf';

    await fontManager.addFont({ name: fontName, url: fontUrl });

    const clipsToAdd: any[] = [];

    for (const id of targetIds) {
      const clip = clips[id];
      if (!clip || !clip.src) continue;

      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clip.src }),
        });
        const data = await response.json();
        const words = data.results?.main?.words || data.words || [];

        if (words.length > 0) {
          const captionClipsJSON = await generateCaptionClips({
            videoWidth: projectStore.getState().settings.width,
            videoHeight: projectStore.getState().settings.height,
            words,
          });

          for (const json of captionClipsJSON) {
            clipsToAdd.push({
              ...json,
              mediaId: clip.id,
              display: {
                from: json.display.from + clip.display.from,
                to: json.display.to + clip.display.from,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Failed to generate captions for clip ${id}:`, error);
      }
    }

    if (clipsToAdd.length > 0) {
      await core.addClips(clipsToAdd);
    }
  } catch (error) {
    console.error('Failed to generate captions:', error);
  }
};
