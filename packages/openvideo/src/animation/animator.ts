import type { IAnimation, EasingType } from "../types/animation";

interface AnimationOffset {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  rotation: number;
}

export const EasingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounceIn: (t) => {
    return 1 - EasingFunctions.bounceOut(1 - t);
  },
  bounceOut: (t) => {
    let t2 = t;
    if (t2 < 1 / 2.75) {
      return 7.5625 * t2 * t2;
    } else if (t2 < 2 / 2.75) {
      return 7.5625 * (t2 -= 1.5 / 2.75) * t2 + 0.75;
    } else if (t2 < 2.5 / 2.75) {
      return 7.5625 * (t2 -= 2.25 / 2.75) * t2 + 0.9375;
    } else {
      return 7.5625 * (t2 -= 2.625 / 2.75) * t2 + 0.984375;
    }
  },
};

/**
 * Calculate the transformation offset for a specific time and animation
 */
export function getAnimationOffset(
  animation: IAnimation,
  clipTimeMs: number, // Current time inside the clip in ms
  clipTotalDurationMs: number, // Total duration of the clip in ms (for 'out' animations)
  elementWidth: number,
  elementHeight: number,
): AnimationOffset {
  const result: AnimationOffset = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    rotation: 0,
  };

  const { type, duration, delay, easing, params } = animation;
  const easeFn = EasingFunctions[easing] || EasingFunctions.linear;

  let progress = 0;
  let isInAnimation = false;

  // Determine if it's an IN or OUT animation
  if (type.endsWith("In")) {
    isInAnimation = true;
    // IN animation: starts at 0 (or delay) and goes to duration
    const startTime = delay;
    const endTime = startTime + duration;

    if (clipTimeMs < startTime) {
      progress = 0;
    } else if (clipTimeMs > endTime) {
      progress = 1;
    } else {
      progress = (clipTimeMs - startTime) / duration;
    }
  } else {
    // OUT animation: starts at (Total - duration - delay) and goes to Total - delay?
    // Usually "Out" means covering the LAST part of the clip.
    // Let's assume params are relative to END of clip for Out animations.
    // Or we stick to standard: duration is duration, but we check if we are in the end zone.
    const endTime = clipTotalDurationMs - delay;
    const startTime = endTime - duration;

    if (clipTimeMs < startTime) {
      progress = 0;
    } else if (clipTimeMs > endTime) {
      progress = 1;
    } else {
      progress = (clipTimeMs - startTime) / duration;
    }
  }

  const eased = easeFn(progress);

  // Apply specific logic based on type
  if (type === "slideIn") {
    // Start from offset, end at 0
    // Factor goes from 1 (full offset) to 0 (no offset)
    const factor = 1 - eased;
    applySlide(result, params, factor, elementWidth, elementHeight);
  } else if (type === "slideOut") {
    // Start from 0, end at offset
    // Factor goes from 0 to 1
    const factor = eased;
    applySlide(result, params, factor, elementWidth, elementHeight);
  } else if (type === "fadeIn") {
    // 0 to 1
    result.alpha = eased;
  } else if (type === "fadeOut") {
    // 1 to 0
    result.alpha = 1 - eased;
  } else if (type === "scaleIn") {
    // 0 to 1 (or zoomScale to 1)
    const startScale = params.zoomScale ?? 0;
    const currentScale = startScale + (1 - startScale) * eased;
    result.scaleX = currentScale;
    result.scaleY = currentScale;
  } else if (type === "scaleOut") {
    // 1 to 0 (or 1 to zoomScale)
    const endScale = params.zoomScale ?? 0;
    const currentScale = 1 + (endScale - 1) * eased;
    result.scaleX = currentScale;
    result.scaleY = currentScale;
  } else if (type === "wipeIn") {
    // Simplified wipe (alpha + slight translation maybe? or mask?)
    // Real wipe needs masking, for now simulate with clip/opacity
    // This might be better handled closer to the renderer with a mask
    result.alpha = eased;
  }

  return result;
}

function applySlide(
  result: AnimationOffset,
  params: IAnimation["params"],
  factor: number, // 1 = full offset (start of In), 0 = no offset
  w: number,
  h: number,
) {
  const { direction = "left", distance = 0.5 } = params;
  let distPx = 0;

  // If distance <= 1, treat as percentage of dimension
  // If > 1, treat as pixels
  if (distance <= 1) {
    if (direction === "left" || direction === "right") distPx = w * distance;
    else distPx = h * distance;
  } else {
    distPx = distance;
  }

  if (direction === "left") {
    // Slide In from Left: starts at -dist, moves to 0
    // Factor 1 => x = -dist
    result.x = -distPx * factor;
  } else if (direction === "right") {
    // Slide In from Right: starts at +dist, moves to 0
    result.x = distPx * factor;
  } else if (direction === "top") {
    // From top
    result.y = -distPx * factor;
  } else if (direction === "bottom") {
    // From bottom
    result.y = distPx * factor;
  }
}
