import { CommandHandler, Patch } from "./types";
import { ICaptionColors, ICaptionStyle } from "../types";
import { normalizeClipStyle } from "../utils/normalize";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a full clip update patch, merging only the changed fields.
 * Keeps all other clip fields intact.
 */
function buildClipPatch(state: any, id: string, merge: (clip: any) => any): Patch | null {
  const clip = state.clips[id];
  if (!clip || clip.type !== "Caption") return null;
  return {
    op: "update",
    path: `/clips/${id}`,
    value: merge(clip),
    oldValue: clip,
  };
}

/** Deep-merge two plain objects (non-array). */
function merge<T extends object>(base: T, patch: Partial<T>): T {
  const result: any = { ...base };
  for (const key in patch) {
    const v = patch[key as keyof T];
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = merge(result[key], v as any);
    } else {
      result[key] = v;
    }
  }
  return result;
}

// ─── caption.setStyle ─────────────────────────────────────────────────────────

/**
 * Apply a partial style update to one or more caption clips.
 *
 * Payload:
 *   ids    — clip IDs to update (pass multiple to broadcast)
 *   style  — partial ICaptionStyle delta
 */
export const setCaptionStyleHandler: CommandHandler<{
  ids: string[];
  style: Partial<ICaptionStyle>;
}> = (state, command) => {
  const { ids, style } = command.payload;
  const patches: Patch[] = [];

  for (const id of ids) {
    const patch = buildClipPatch(state, id, (clip) => ({
      ...clip,
      style: normalizeClipStyle(merge(clip.style ?? {}, style), "Caption"),
    }));
    if (patch) patches.push(patch);
  }

  return patches;
};

// ─── caption.setColors ────────────────────────────────────────────────────────

/**
 * Apply a partial color update to one or more caption clips.
 * Colors live in `caption.colors` — this handler targets exactly that path.
 *
 * Payload:
 *   ids    — clip IDs to update
 *   colors — partial ICaptionColors delta
 */
export const setCaptionColorsHandler: CommandHandler<{
  ids: string[];
  colors: Partial<ICaptionColors>;
}> = (state, command) => {
  const { ids, colors } = command.payload;
  const patches: Patch[] = [];

  for (const id of ids) {
    const patch = buildClipPatch(state, id, (clip) => ({
      ...clip,
      caption: {
        ...(clip.caption ?? {}),
        colors: merge(clip.caption?.colors ?? {}, colors),
      },
    }));
    if (patch) patches.push(patch);
  }

  return patches;
};

// ─── caption.setVerticalPosition ─────────────────────────────────────────────

/**
 * Move caption clip(s) to a vertical position slot.
 * Updates `top` on each clip based on the clip's own height and the video height.
 *
 * Payload:
 *   ids         — clip IDs to reposition
 *   position    — 'top' | 'center' | 'bottom'
 *   videoHeight — canvas height in px (used to calculate top)
 *   padding     — edge padding in px (default: 80)
 */
export const setCaptionVerticalPositionHandler: CommandHandler<{
  ids: string[];
  position: "top" | "center" | "bottom";
  videoHeight: number;
  padding?: number;
}> = (state, command) => {
  const { ids, position, videoHeight, padding = 80 } = command.payload;
  const patches: Patch[] = [];

  for (const id of ids) {
    const clip = state.clips[id];
    if (!clip || clip.type !== "Caption") continue;

    const clipHeight = clip.transform?.height ?? 0;
    let newY: number;

    if (position === "top") {
      newY = padding;
    } else if (position === "center") {
      newY = (videoHeight - clipHeight) / 2;
    } else {
      newY = videoHeight - clipHeight - padding;
    }

    patches.push({
      op: "update",
      path: `/clips/${id}`,
      value: {
        ...clip,
        transform: {
          ...(clip.transform ?? {}),
          y: newY,
        },
      },
      oldValue: clip,
    });
  }

  return patches;
};
