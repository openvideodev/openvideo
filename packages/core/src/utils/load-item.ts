import { AnyClip, IDisplay, ITrim } from '../types';
import { generateId } from './id';

const DEFAULT_DURATION = 5_000_000; // 5 seconds in microseconds

const getDisplay = (
  display?: Partial<IDisplay>,
  duration: number = DEFAULT_DURATION
): IDisplay => {
  if (!display) return { from: 0, to: duration };
  const from = display.from ?? 0;
  const to = display.to ?? from + duration;
  return { from, to };
};

const getTrim = (
  trim?: Partial<ITrim>,
  duration: number = DEFAULT_DURATION
): ITrim => {
  if (!trim) return { from: 0, to: duration };
  const from = trim.from ?? 0;
  const to = trim.to ?? duration;
  return { from, to };
};

/**
 * Helper to get image dimensions in browser
 */
const getImageDimensions = (
  src: string
): Promise<{ width: number; height: number } | null> => {
  if (typeof window === 'undefined' || typeof Image === 'undefined')
    return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Helper to get video metadata in browser
 */
const getVideoMetadata = (
  src: string
): Promise<{ width: number; height: number; duration: number } | null> => {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return Promise.resolve(null);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.floor(video.duration * 1_000_000),
      });
    };
    video.onerror = () => resolve(null);
    video.src = src;
  });
};

/**
 * Helper to get audio duration in browser
 */
const getAudioMetadata = (
  src: string
): Promise<{ duration: number } | null> => {
  if (typeof window === 'undefined' || typeof Audio === 'undefined')
    return Promise.resolve(null);

  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve({
        duration: Math.floor(audio.duration * 1_000_000),
      });
    };
    audio.onerror = () => resolve(null);
    audio.src = src;
  });
};

export const loadClip = async (
  payload: Partial<AnyClip> & { type: string },
  options: { canvasSize: { width: number; height: number } }
): Promise<AnyClip> => {
  console.log('LOAD CLIP');
  const { canvasSize } = options;

  // 1. Resolve Dimensions and Duration (Async if needed)
  let width = payload.width;
  let height = payload.height;
  let duration = payload.duration;

  if (payload.src) {
    if (payload.type === 'Image' && (!width || !height)) {
      const dims = await getImageDimensions(payload.src);
      if (dims) {
        const scale = Math.min(
          canvasSize.width / dims.width,
          canvasSize.height / dims.height,
          1
        );
        width = dims.width * scale;
        height = dims.height * scale;
      }
    } else if (payload.type === 'Video') {
      const meta = await getVideoMetadata(payload.src);
      if (meta) {
        if (!width || !height) {
          const scale = Math.min(
            canvasSize.width / meta.width,
            canvasSize.height / meta.height,
            1
          );
          width = meta.width * scale;
          height = meta.height * scale;
        }
        if (!duration) {
          duration = meta.duration;
        }
      }
    } else if (payload.type === 'Audio' && !duration) {
      const meta = await getAudioMetadata(payload.src);
      if (meta) {
        duration = meta.duration;
      }
    }
  }

  // Fallbacks
  width = width ?? (payload.type === 'Audio' ? 0 : 600);
  height = height ?? (payload.type === 'Audio' ? 0 : 400);
  duration = duration ?? DEFAULT_DURATION;

  // 2. Centering logic
  const left = payload.left ?? 0;
  const top = payload.top ?? 0;

  const trim = getTrim(payload.trim, duration);
  const display = getDisplay(payload.display, trim.to - trim.from);

  const baseClip = {
    ...payload,
    id: payload.id ?? generateId(),
    type: payload.type,
    name: payload.name ?? payload.type,
    display,
    trim,
    duration: trim.to - trim.from,
    playbackRate: payload.playbackRate ?? 1,
    zIndex: payload.zIndex ?? 10,
    opacity: payload.opacity ?? 1,
    left,
    top,
    width,
    height,
    angle: payload.angle ?? 0,
    flip: payload.flip ?? { x: false, y: false },
    style: payload.style ?? {},
    chromaKey: payload.chromaKey ?? {
      enabled: false,
      color: '#00FF00',
      similarity: 0.1,
      spill: 0,
    },
    locked: payload.locked ?? false,
    effects: payload.effects ?? [],
    animations: payload.animations ?? [],
    colorAdjustment: payload.colorAdjustment ?? {
      enabled: false,
      type: 'basic',
      basic: {},
      hsl: {},
      curves: {},
    },
  } as AnyClip;
  console.log({
    baseClip,
    options,
    payload,
  });
  if (payload.type === 'Caption') {
    const captionClip = baseClip as any;
    captionClip.mediaId = payload.mediaId ?? '';
    captionClip.wordsPerLine = payload.wordsPerLine ?? 'multiple';
    captionClip.caption = payload.caption ?? {
      words: [],
      colors: {
        appeared: '#ffffff',
        active: '#ffffff',
        activeFill: '#FF5700',
        background: '',
        keyword: '#ffffff',
      },
      preserveKeywordColor: true,
      positioning: {
        videoWidth: canvasSize.width,
        videoHeight: canvasSize.height,
      },
    };
    if (!payload.style) {
      captionClip.style = {
        fontSize: 40,
        fontFamily: 'Inter',
        fontWeight: '400',
        fontStyle: 'normal',
        color: '#ffffff',
        align: 'center',
        fontUrl: '',
        wordWrapWidth: canvasSize.width * 0.8,
        wordWrap: true,
      };
    }
  }

  return baseClip;
};
