import { AnyClip, IDisplay, ITrim, IClipTimingInput } from "../types";
import { generateId } from "./id";
import { CoreConfig } from "../config";
import { normalizeClip } from "./normalize";

const DEFAULT_DURATION = 5_000_000; // 5 seconds in microseconds

const getDisplay = (display?: Partial<IDisplay>, duration: number = DEFAULT_DURATION): IDisplay => {
  if (!display) return { from: 0, to: duration };
  const from = display.from ?? 0;
  const to = display.to ?? from + duration;
  return { from, to };
};

const getTrim = (trim?: Partial<ITrim>, duration: number = DEFAULT_DURATION): ITrim => {
  if (!trim) return { from: 0, to: duration };
  const from = trim.from ?? 0;
  const to = trim.to ?? duration;
  return { from, to };
};

export const loadClip = async (
  payload: Omit<Partial<AnyClip>, "timing"> & { type: string; timing?: IClipTimingInput },
  options: {
    canvasSize: { width: number; height: number };
    objectFit?: "contain" | "cover";
  },
): Promise<AnyClip> => {
  const { canvasSize, objectFit } = options;

  // 1. Resolve Dimensions and Duration (Async if needed)
  let width = payload.width;
  let height = payload.height;
  let duration = payload.duration;

  if (payload.src) {
    if (payload.type === "Image" && (objectFit || !width || !height)) {
      const dims = CoreConfig.metadataProvider
        ? await CoreConfig.metadataProvider.getImageMetadata(payload.src)
        : null;

      if (dims?.width && dims?.height) {
        if (objectFit) {
          const fitScale = canvasSize.width / dims.width;
          const fitScaleY = canvasSize.height / dims.height;
          const scale =
            objectFit === "cover" ? Math.max(fitScale, fitScaleY) : Math.min(fitScale, fitScaleY);

          width = dims.width * scale;
          height = dims.height * scale;
        } else {
          width = width ?? dims.width;
          height = height ?? dims.height;
        }
      }
    } else if (payload.type === "Video") {
      const meta = CoreConfig.metadataProvider
        ? await CoreConfig.metadataProvider.getVideoMetadata(payload.src)
        : null;

      if (meta?.width && meta?.height) {
        if (objectFit) {
          const fitScale = canvasSize.width / meta.width;
          const fitScaleY = canvasSize.height / meta.height;
          const scale =
            objectFit === "cover" ? Math.max(fitScale, fitScaleY) : Math.min(fitScale, fitScaleY);

          width = meta.width * scale;
          height = meta.height * scale;
        } else {
          width = width ?? meta.width;
          height = height ?? meta.height;
        }
        if (!duration) {
          duration = meta.duration;
        }
      }
    } else if (payload.type === "Audio" && !duration) {
      const meta = CoreConfig.metadataProvider
        ? await CoreConfig.metadataProvider.getAudioMetadata(payload.src)
        : null;

      if (meta?.duration) {
        duration = meta.duration;
      }
    }
  }

  if (payload.type === "Text") {
    const style = payload.style || {};
    const needsMetadata =
      !width || !height || !style.fontSize || !style.fontFamily || !style.fontUrl;

    if (needsMetadata) {
      const textMeta = CoreConfig.metadataProvider
        ? await CoreConfig.metadataProvider.getTextMetadata(payload)
        : null;

      if (textMeta) {
        width = width ?? textMeta.width;
        height = height ?? textMeta.height;
        if (textMeta.fontSize && !payload.style?.fontSize) {
          payload.style = { ...(payload.style || {}), fontSize: textMeta.fontSize };
        }
        if (textMeta.fontFamily && !payload.style?.fontFamily) {
          payload.style = { ...(payload.style || {}), fontFamily: textMeta.fontFamily };
        }
        if (textMeta.fontUrl && !payload.style?.fontUrl) {
          payload.style = { ...(payload.style || {}), fontUrl: textMeta.fontUrl };
        }
      }
    }
  }

  // Fallbacks
  width = width ?? (payload.type === "Audio" ? 0 : 600);
  height = height ?? (payload.type === "Audio" ? 0 : 400);
  duration = duration ?? DEFAULT_DURATION;

  // 2. Centering logic
  const left = payload.left ?? (canvasSize.width - width) / 2;
  const top = payload.top ?? (canvasSize.height - height) / 2;

  const playbackRate = payload.playbackRate ?? payload.timing?.playbackRate ?? 1;
  const trim = getTrim(payload.trim || payload.timing?.trim, duration);
  const display = getDisplay(payload.display || payload.timing?.display, trim.to - trim.from);
  const timing = {
    display,
    trim,
    duration: trim.to - trim.from,
    playbackRate,
  };

  // Clone payload and delete legacy root properties to keep clip object clean
  const cleanPayload = { ...payload };
  delete cleanPayload.display;
  delete cleanPayload.trim;
  delete cleanPayload.duration;
  delete cleanPayload.playbackRate;

  const baseClip = {
    ...cleanPayload,
    id: payload.id ?? generateId(),
    type: payload.type,
    name: payload.name ?? payload.type,
    timing,
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
      color: "#00FF00",
      similarity: 0.1,
      spill: 0,
    },
    locked: payload.locked ?? false,
    effects: payload.effects ?? [],
    animations: payload.animations ?? [],
    colorAdjustment: payload.colorAdjustment ?? {
      enabled: false,
      type: "basic",
      basic: {},
      hsl: {},
      curves: {},
    },
  } as unknown as AnyClip;

  if (payload.type === "Caption") {
    const captionClip = baseClip as any;
    captionClip.mediaId = payload.mediaId ?? "";
    captionClip.wordsPerLine = payload.wordsPerLine ?? "multiple";
    captionClip.caption = payload.caption ?? {
      words: [],
      colors: {
        appeared: "#ffffff",
        active: "#ffffff",
        activeFill: "#FF5700",
        background: "",
        keyword: "#ffffff",
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
        fontFamily: "Inter",
        fontWeight: "400",
        fontStyle: "normal",
        color: "#ffffff",
        align: "center",
        fontUrl: "",
        wordWrapWidth: canvasSize.width * 0.8,
        wordWrap: true,
      };
    }
  }

  return normalizeClip(baseClip);
};
