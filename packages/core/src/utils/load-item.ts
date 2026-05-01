import { AnyClip, IDisplay, ITrim } from "../types";
import { generateId } from "./id";

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

export const loadClip = (
  payload: Partial<AnyClip> & { type: string },
  options: { canvasSize: { width: number; height: number } }
): AnyClip => {
  const { canvasSize } = options;
  
  // Basic centering logic for headless or initial placement
  const width = payload.width ?? 600;
  const height = payload.height ?? 124;
  const left = payload.left ?? (canvasSize.width - width) / 2;
  const top = payload.top ?? (canvasSize.height - height) / 2;

  const trim = getTrim(payload.trim, payload.duration || DEFAULT_DURATION);
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
    flip: payload.flip ?? null,
    style: payload.style ?? {},
  } as AnyClip;

  return baseClip;
};
