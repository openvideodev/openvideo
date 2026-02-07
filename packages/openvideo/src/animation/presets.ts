import { AnimationFactory, animationRegistry } from "./registry";
import { KeyframeAnimation } from "./keyframe-animation";
import { GsapAnimation } from "./gsap-animation";

// Animation Presets

// Actually, let's fix the logic in KeyframeAnimation getTransform for multipliers.
// In the implementation plan, I said: "Animation Layer: Active animations calculate additive offsets (e.g., xOffset: +50px, scaleMultiplier: 1.2x)".
// So opacity should be a multiplier or additive?
// If it's a multiplier, base 1.0 * 0.0 = 0.
// If it's fadeIn, progress 0 should be multiplier 0, progress 1 should be multiplier 1.

export const pulse: AnimationFactory = (opts, params) => {
  const factor = Math.max(opts.duration / 1e6, 1);
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(
      params,
      { ...opts, iterCount: factor * 3 },
      "pulse",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0.9 },
      "50%": { scale: 1 },
      "100%": { scale: 0.9 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
      iterCount: factor * 3,
    },
    "pulse",
  );
};

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

export const blurIn: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "blurIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 20, opacity: 0 },
      "100%": { blur: 0, opacity: 1 },
    },
    { ...opts, easing: opts.easing || "easeOutQuad" },
    "blurIn",
  );
};

export const blurOut: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "blurOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 0, opacity: 1 },
      "100%": { blur: 20, opacity: 0 },
    },
    { ...opts, easing: opts.easing || "easeInQuad" },
    "blurOut",
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

//custom presets in
export const customInPreset1: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset1");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 5, x: 100 },
      "100%": { blur: 0, x: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset1",
  );
};

export const customInPreset2: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset2");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.2, angle: -5 },
      "32%": { scale: 1, angle: 0 },
      "64%": { scale: 1.2, angle: -5 },
      "100%": { scale: 1, angle: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset2",
  );
};

export const customInPreset3: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset3");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 5, angle: 45, scale: 2 },
      "100%": { blur: 0, angle: 0, scale: 1 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset3",
  );
};

export const customInPreset4: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset4");
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -200, blur: 10 },
      "100%": { x: 0, blur: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset4",
  );
};

export const customInPreset5: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset5");
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 200, blur: 10 },
      "100%": { x: 0, blur: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset5",
  );
};

export const customInPreset6: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset6");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0.6, blur: 30, x: 200 },
      "30%": { scale: 0.8, blur: 20, x: 50 },
      "60%": { scale: 0.9, blur: 10, x: 0 },
      "100%": { scale: 1, blur: 0, x: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset6",
  );
};

export const customInPreset7: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset7");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.4, blur: 20, angle: 10 },
      "40%": { scale: 1, blur: 0, angle: 0 },
      "60%": { scale: 1.3, blur: 0, angle: -10 },
      "100%": { scale: 1, blur: 0, angle: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset7",
  );
};

export const customInPreset8: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset8");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 40, angle: 80 },
      "100%": { blur: 0, angle: 0 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset8",
  );
};

export const customInPreset9: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customInPreset9");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, brightness: 3 },
      "40%": { scale: 1, brightness: 3 },
      "80%": { scale: 1.5, brightness: 3 },
      "100%": { scale: 1, brightness: 1 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customInPreset9",
  );
};

//custom presets out
export const customOutPreset1: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset1");
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, x: 0 },
      "70%": { angle: 7, x: 0 },
      "100%": { angle: 10, x: 200 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset1",
  );
};

export const customOutPreset2: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset2");
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, scale: 1 },
      "100%": { angle: -10, scale: 1.2 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset2",
  );
};

export const customOutPreset3: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset3");
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0 },
      "30%": { x: 100, angle: -5 },
      "70%": { x: 100, angle: -20 },
      "100%": { x: -100, angle: -20 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset3",
  );
};

export const customOutPreset4: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset4");
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, blur: 0 },
      "100%": { y: 200, blur: 20 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset4",
  );
};

export const customOutPreset5: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset5");
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, scale: 1 },
      "100%": { y: 250, scale: 1.5 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset5",
  );
};

export const customOutPreset6: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset6");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, angle: 0 },
      "100%": { scale: 2, angle: 10 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset6",
  );
};

export const customOutPreset7: AnimationFactory = (opts, params) => {
  if (params && (params["0%"] || params["100%"])) {
    return new KeyframeAnimation(params, opts, "customOutPreset7");
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0, blur: 0 },
      "40%": { x: -200, angle: 10, blur: 5 },
      "100%": { x: -200, angle: 60, blur: 20 },
    },
    {
      ...opts,
      easing: opts.easing || "easeOutQuad",
    },
    "customOutPreset7",
  );
};

// Register them
animationRegistry.register("fadeIn", fadeIn);
animationRegistry.register("fadeOut", fadeOut);
animationRegistry.register("slideIn", slideIn);
animationRegistry.register("slideOut", slideOut);
animationRegistry.register("zoomIn", zoomIn);
animationRegistry.register("zoomOut", zoomOut);
animationRegistry.register("charTypewriter", charTypewriter);
animationRegistry.register("pulse", pulse);
animationRegistry.register("blurIn", blurIn);
animationRegistry.register("blurOut", blurOut);
animationRegistry.register("customInPreset1", customInPreset1);
animationRegistry.register("customInPreset2", customInPreset2);
animationRegistry.register("customInPreset3", customInPreset3);
animationRegistry.register("customInPreset4", customInPreset4);
animationRegistry.register("customInPreset5", customInPreset5);
animationRegistry.register("customInPreset6", customInPreset6);
animationRegistry.register("customInPreset7", customInPreset7);
animationRegistry.register("customInPreset8", customInPreset8);
animationRegistry.register("customInPreset9", customInPreset9);
animationRegistry.register("customOutPreset1", customOutPreset1);
animationRegistry.register("customOutPreset2", customOutPreset2);
animationRegistry.register("customOutPreset3", customOutPreset3);
animationRegistry.register("customOutPreset4", customOutPreset4);
animationRegistry.register("customOutPreset5", customOutPreset5);
animationRegistry.register("customOutPreset6", customOutPreset6);
animationRegistry.register("customOutPreset7", customOutPreset7);

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
    case "pulse":
      return {
        "0%": { scale: 0.9 },
        "50%": { scale: 1 },
        "100%": { scale: 0.9 },
      };
    case "blurIn":
      return {
        "0%": { blur: 20, opacity: 0 },
        "100%": { blur: 0, opacity: 1 },
      };
    case "blurOut":
      return {
        "0%": { blur: 0, opacity: 1 },
        "100%": { blur: 20, opacity: 0 },
      };
    case "customInPreset1":
      return {
        "0%": { blur: 5, x: 100 },
        "100%": { blur: 0, x: 0 },
      };
    case "customInPreset2":
      return {
        "0%": { scale: 1.2, angle: -5 },
        "32%": { scale: 1, angle: 0 },
        "64%": { scale: 1.2, angle: -5 },
        "100%": { scale: 1, angle: 0 },
      };
    case "customInPreset3":
      return {
        "0%": { blur: 5, angle: 45, scale: 2 },
        "100%": { blur: 0, angle: 0, scale: 1 },
      };
    case "customInPreset4":
      return {
        "0%": { x: -200, blur: 10 },
        "100%": { x: 0, blur: 0 },
      };
    case "customInPreset5":
      return {
        "0%": { x: 200, blur: 10 },
        "100%": { x: 0, blur: 0 },
      };
    case "customInPreset6":
      return {
        "0%": { scale: 1, blur: 30, x: 200 },
        "30%": { scale: 1.2, blur: 20, x: 50 },
        "60%": { scale: 1.3, blur: 10, x: 0 },
        "100%": { scale: 1.4, blur: 0, x: 0 },
      };
    case "customInPreset7":
      return {
        "0%": { scale: 1.4, blur: 20, angle: 10 },
        "40%": { scale: 1, blur: 0, angle: 0 },
        "60%": { scale: 1.3, blur: 0, angle: -10 },
        "100%": { scale: 1, blur: 0, angle: 0 },
      };
    case "customInPreset8":
      return {
        "0%": { blur: 40, angle: 80 },
        "100%": { blur: 0, angle: 0 },
      };
    case "customInPreset9":
      return {
        "0%": { scale: 1, brightness: 3 },
        "40%": { scale: 1, brightness: 3 },
        "80%": { scale: 1.5, brightness: 3 },
        "100%": { scale: 1, brightness: 1 },
      };
    case "customOutPreset1":
      return {
        "0%": { angle: 0, x: 0 },
        "70%": { angle: 7, x: 0 },
        "100%": { angle: 10, x: 200 },
      };
    case "customOutPreset2":
      return {
        "0%": { angle: 0, scale: 1 },
        "100%": { angle: -10, scale: 1.2 },
      };
    case "customOutPreset3":
      return {
        "0%": { x: 0, angle: 0 },
        "30%": { x: 100, angle: -5 },
        "70%": { x: 100, angle: -20 },
        "100%": { x: -100, angle: -20 },
      };
    case "customOutPreset4":
      return {
        "0%": { y: 0, blur: 0 },
        "100%": { y: 200, blur: 20 },
      };
    case "customOutPreset5":
      return {
        "0%": { y: 0, scale: 1 },
        "100%": { y: 250, scale: 1.5 },
      };
    case "customOutPreset6":
      return {
        "0%": { scale: 1, angle: 0 },
        "100%": { scale: 2, angle: 10 },
      };
    case "customOutPreset7":
      return {
        "0%": { x: 0, angle: 0, blur: 0 },
        "40%": { x: -200, angle: 10, blur: 5 },
        "100%": { x: -200, angle: 60, blur: 20 },
      };
    case "custom":
    default:
      return {
        "0%": {},
        "100%": {},
      };
  }
}
