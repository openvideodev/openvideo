import { AnimationFactory, animationRegistry } from "./registry";
import { KeyframeAnimation } from "./keyframe-animation";
import { GsapAnimation } from "./gsap-animation";

// Animation Presets

// Actually, let's fix the logic in KeyframeAnimation getTransform for multipliers.
// In the implementation plan, I said: "Animation Layer: Active animations calculate additive offsets (e.g., xOffset: +50px, scaleMultiplier: 1.2x)".
// So opacity should be a multiplier or additive?
// If it's a multiplier, base 1.0 * 0.0 = 0.
// If it's fadeIn, progress 0 should be multiplier 0, progress 1 should be multiplier 1.

export const fadeIn: AnimationFactory = (opts, params) => {
  // If params has keyframes, use them as-is (allows UI persistence)
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "fadeIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { opacity: 0, scale: 0.9 },
      "100%": { opacity: 1, scale: 1 },
    },
    { ...opts, easing: opts.easing || "easeOutQuad" },
    "fadeIn",
  );
};

export const fadeOut: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "fadeOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { opacity: 1 },
      "100%": { opacity: 0 },
    },
    { ...opts, easing: opts.easing || "easeInQuad" },
    "fadeOut",
  );
};

export const slideIn: AnimationFactory = (opts, params) => {
  // If params has keyframes, use them as-is
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "slideIn");
  }
  const config = params || { direction: "left" };
  const dist = config.distance || 300;
  const frames: any = {
    "100%": { x: 0, y: 0, opacity: 1 },
  };

  if (config.direction === "left") frames["0%"] = { x: -dist, opacity: 0 };
  else if (config.direction === "right") frames["0%"] = { x: dist, opacity: 0 };
  else if (config.direction === "top") frames["0%"] = { y: -dist, opacity: 0 };
  else if (config.direction === "bottom")
    frames["0%"] = { y: dist, opacity: 0 };
  else frames["0%"] = { x: -dist, opacity: 0 }; // Default left

  const anim = new KeyframeAnimation(
    frames,
    { ...opts, easing: opts.easing || "easeOutCubic" },
    "slideIn",
  );
  (anim as any).presetParams = params;
  return anim;
};

export const slideOut: AnimationFactory = (opts, params) => {
  // If params has keyframes, use them as-is
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "slideOut");
  }
  const config = params || { direction: "left" };
  const dist = config.distance || 300;
  const frames: any = {
    "0%": { x: 0, y: 0, opacity: 1 },
  };

  if (config.direction === "left") frames["100%"] = { x: -dist, opacity: 0 };
  else if (config.direction === "right")
    frames["100%"] = { x: dist, opacity: 0 };
  else if (config.direction === "top")
    frames["100%"] = { y: -dist, opacity: 0 };
  else if (config.direction === "bottom")
    frames["100%"] = { y: dist, opacity: 0 };
  else frames["100%"] = { x: -dist, opacity: 0 }; // Default left

  const anim = new KeyframeAnimation(
    frames,
    { ...opts, easing: opts.easing || "easeInCubic" },
    "slideOut",
  );
  (anim as any).presetParams = params;
  return anim;
};

export const zoomIn: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "zoomIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0, opacity: 0 },
      "100%": { scale: 1, opacity: 1 },
    },
    { ...opts, easing: opts.easing || "easeOutBack" },
    "zoomIn",
  );
};

export const zoomOut: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "zoomOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, opacity: 1 },
      "100%": { scale: 0, opacity: 0 },
    },
    { ...opts, easing: opts.easing || "easeInBack" },
    "zoomOut",
  );
};

export const charFadeIn: AnimationFactory = (opts, params) => {
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0, scale: 0.5 },
      to: { alpha: 1, scale: 1 },
      stagger: params?.stagger ?? 0.05,
    },
    { ...opts, easing: opts.easing || "back.out" },
    "charFadeIn",
  );
};

export const charSlideUp: AnimationFactory = (opts, params) => {
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0, y: 50 },
      to: { alpha: 1, y: 0 },
      stagger: params?.stagger ?? 0.05,
    },
    { ...opts, easing: opts.easing || "power2.out" },
    "charSlideUp",
  );
};

export const charTypewriter: AnimationFactory = (opts, params) => {
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0 },
      to: { alpha: 1, duration: 0.001 },
      stagger: params?.stagger ?? 0.05,
    },
    { ...opts, easing: opts.easing || "none" },
    "charTypewriter",
  );
};

// Register them
animationRegistry.register("fadeIn", fadeIn);
animationRegistry.register("fadeOut", fadeOut);
animationRegistry.register("slideIn", slideIn);
animationRegistry.register("slideOut", slideOut);
animationRegistry.register("zoomIn", zoomIn);
animationRegistry.register("zoomOut", zoomOut);
animationRegistry.register("charFadeIn", charFadeIn);
animationRegistry.register("charSlideUp", charSlideUp);
animationRegistry.register("charTypewriter", charTypewriter);

/**
 * Get the keyframe template for a preset animation
 * Useful for populating the animation editor UI
 */
export function getPresetTemplate(type: string, params?: any): any {
  switch (type) {
    case "fadeIn":
      return {
        "0%": { opacity: 0, scale: 0.9 },
        "100%": { opacity: 1, scale: 1 },
      };
    case "fadeOut":
      return {
        "0%": { opacity: 1 },
        "100%": { opacity: 0 },
      };
    case "zoomIn":
      return {
        "0%": { scale: 0, opacity: 0 },
        "100%": { scale: 1, opacity: 1 },
      };
    case "zoomOut":
      return {
        "0%": { scale: 1, opacity: 1 },
        "100%": { scale: 0, opacity: 0 },
      };
    case "slideIn": {
      const direction = params?.direction || "left";
      const distance = params?.distance || 300;
      return {
        "0%": {
          x:
            direction === "left"
              ? -distance
              : direction === "right"
                ? distance
                : 0,
          y:
            direction === "top"
              ? -distance
              : direction === "bottom"
                ? distance
                : 0,
          opacity: 0,
        },
        "100%": { x: 0, y: 0, opacity: 1 },
      };
    }
    case "slideOut": {
      const direction = params?.direction || "left";
      const distance = params?.distance || 300;
      return {
        "0%": { x: 0, y: 0, opacity: 1 },
        "100%": {
          x:
            direction === "left"
              ? -distance
              : direction === "right"
                ? distance
                : 0,
          y:
            direction === "top"
              ? -distance
              : direction === "bottom"
                ? distance
                : 0,
          opacity: 0,
        },
      };
    }
    case "custom":
    default:
      return {
        "0%": {},
        "100%": {},
      };
  }
}
