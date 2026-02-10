import { AnimationFactory, animationRegistry } from "./registry";
import { KeyframeAnimation } from "./keyframe-animation";
import { GsapAnimation } from "./gsap-animation";

// Animation Presets

function normalizeParams(params: any): any {
  if (params && params.presetParams) {
    return { ...params.presetParams, ...params };
  }
  return params;
}

export const pulse: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const factor = Math.max(opts.duration / 1e6, 1);
  const defaultMirror = normalized?.mirror || 0;
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, iterCount: factor * 3, easing },
      "pulse",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, mirror: defaultMirror },
      "25%": { scale: 0.9, mirror: defaultMirror },
      "50%": { scale: 1, mirror: defaultMirror },
      "75%": { scale: 0.9, mirror: defaultMirror },
      "100%": { scale: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
      iterCount: factor * 3,
    },
    "pulse",
  );
};

export const fadeIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  // If params has keyframes, use them as-is (allows UI persistence)
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "fadeIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { opacity: defaultOpacity, scale: 0.9, mirror: defaultMirror },
      "100%": { opacity: 1, scale: 1, mirror: defaultMirror },
    },
    { ...opts, easing },
    "fadeIn",
  );
};

export const fadeOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeInQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "fadeOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { opacity: 1, mirror: defaultMirror },
      "100%": { opacity: defaultOpacity, mirror: defaultMirror },
    },
    { ...opts, easing },
    "fadeOut",
  );
};

export const slideIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  // If params has keyframes, use them as-is
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeOutCubic";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "slideIn");
  }
  const config = normalized || { direction: "left" };
  const dist = config.distance || 300;
  const frames: any = {
    "100%": { x: 0, y: 0, opacity: 1, mirror: defaultMirror },
  };

  if (config.direction === "left")
    frames["0%"] = { x: -dist, opacity: defaultOpacity, mirror: defaultMirror };
  else if (config.direction === "right")
    frames["0%"] = { x: dist, opacity: defaultOpacity, mirror: defaultMirror };
  else if (config.direction === "top")
    frames["0%"] = { y: -dist, opacity: defaultOpacity, mirror: defaultMirror };
  else if (config.direction === "bottom")
    frames["0%"] = { y: dist, opacity: defaultOpacity, mirror: defaultMirror };
  else
    frames["0%"] = { x: -dist, opacity: defaultOpacity, mirror: defaultMirror }; // Default left

  const anim = new KeyframeAnimation(frames, { ...opts, easing }, "slideIn");
  (anim as any).presetParams = params;
  return anim;
};

export const slideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  // If params has keyframes, use them as-is
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeInCubic";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "slideOut");
  }
  const config = normalized || { direction: "left" };
  const dist = config.distance || 300;
  const frames: any = {
    "0%": { x: 0, y: 0, opacity: 1, mirror: defaultMirror },
  };

  if (config.direction === "left")
    frames["100%"] = {
      x: -dist,
      opacity: defaultOpacity,
      mirror: defaultMirror,
    };
  else if (config.direction === "right")
    frames["100%"] = {
      x: dist,
      opacity: defaultOpacity,
      mirror: defaultMirror,
    };
  else if (config.direction === "top")
    frames["100%"] = {
      y: -dist,
      opacity: defaultOpacity,
      mirror: defaultMirror,
    };
  else if (config.direction === "bottom")
    frames["100%"] = {
      y: dist,
      opacity: defaultOpacity,
      mirror: defaultMirror,
    };
  else
    frames["100%"] = {
      x: -dist,
      opacity: defaultOpacity,
      mirror: defaultMirror,
    }; // Default left

  const anim = new KeyframeAnimation(frames, { ...opts, easing }, "slideOut");
  (anim as any).presetParams = params;
  return anim;
};

export const zoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const defaultScale = normalized?.scale || 0;
  const easing = normalized?.easing || opts.easing || "easeOutBack";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomIn");
  }
  return new KeyframeAnimation(
    {
      "0%": {
        scale: defaultScale,
        opacity: defaultOpacity,
        mirror: defaultMirror,
      },
      "100%": { scale: 1, opacity: 1, mirror: defaultMirror },
    },
    { ...opts, easing },
    "zoomIn",
  );
};

export const zoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const defaultScale = normalized?.scale || 0;
  const easing = normalized?.easing || opts.easing || "easeInBack";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, opacity: 1, mirror: defaultMirror },
      "100%": {
        scale: defaultScale,
        opacity: defaultOpacity,
        mirror: defaultMirror,
      },
    },
    { ...opts, easing },
    "zoomOut",
  );
};

export const blurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "blurIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 20, opacity: defaultOpacity, mirror: defaultMirror },
      "100%": { blur: 0, opacity: 1, mirror: defaultMirror },
    },
    { ...opts, easing },
    "blurIn",
  );
};

export const blurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultOpacity = normalized?.opacity || 0;
  const easing = normalized?.easing || opts.easing || "easeInQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "blurOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 0, opacity: 1, mirror: defaultMirror },
      "100%": { blur: 20, opacity: defaultOpacity, mirror: defaultMirror },
    },
    { ...opts, easing },
    "blurOut",
  );
};

export const charFadeIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0, scale: 0.5 },
      to: { alpha: 1, scale: 1 },
      stagger: normalized?.stagger ?? 0.05,
    },
    {
      ...opts,
      easing: normalized?.easing || opts.easing || "back.out",
    },
    "charFadeIn",
  );
};

export const charSlideUp: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0, y: 50 },
      to: { alpha: 1, y: 0 },
      stagger: normalized?.stagger ?? 0.05,
    },
    {
      ...opts,
      easing: normalized?.easing || opts.easing || "power2.out",
    },
    "charSlideUp",
  );
};

export const charTypewriter: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  return new GsapAnimation(
    {
      type: "character",
      from: { alpha: 0 },
      to: { alpha: 1, duration: 0.001 },
      stagger: normalized?.stagger ?? 0.05,
    },
    {
      ...opts,
      easing: normalized?.easing || opts.easing || "none",
    },
    "charTypewriter",
  );
};

//custom presets in
export const blurSlideRightIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideRightIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 5, x: 100, mirror: 1 },
      "100%": { blur: 0, x: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "blurSlideRightIn",
  );
};

export const wobbleZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "wobbleZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.2, angle: -5, mirror: 1 },
      "32%": { scale: 1, angle: 0, mirror: 1 },
      "64%": { scale: 1.2, angle: -5, mirror: 1 },
      "100%": { scale: 1, angle: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "wobbleZoomIn",
  );
};

export const spinZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spinZoomIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 5, angle: 45, scale: 2, mirror: 1 },
      "100%": { blur: 0, angle: 0, scale: 1, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "spinZoomIn",
  );
};

export const blurSlideLeftIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideLeftIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -200, blur: 10, mirror: 1 },
      "100%": { x: 0, blur: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "blurSlideLeftIn",
  );
};

export const blurSlideRightStrongIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideRightStrongIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 200, blur: 10, mirror: 1 },
      "100%": { x: 0, blur: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "blurSlideRightStrongIn",
  );
};

export const cinematicZoomSlideIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicZoomSlideIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0.6, blur: 30, x: 200, mirror: 1 },
      "30%": { scale: 0.8, blur: 20, x: 50, mirror: 1 },
      "60%": { scale: 0.9, blur: 10, x: 0, mirror: 1 },
      "100%": { scale: 1, blur: 0, x: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "cinematicZoomSlideIn",
  );
};

export const elasticTwistIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "elasticTwistIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.4, blur: 20, angle: 10, mirror: 1 },
      "40%": { scale: 1, blur: 0, angle: 0, mirror: 1 },
      "60%": { scale: 1.3, blur: 0, angle: -10, mirror: 1 },
      "100%": { scale: 1, blur: 0, angle: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "elasticTwistIn",
  );
};

export const spinFadeIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spinFadeIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { blur: 40, angle: 80, mirror: 1 },
      "100%": { blur: 0, angle: 0, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "spinFadeIn",
  );
};

export const flashZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, brightness: 3, mirror: 1 },
      "40%": { scale: 1, brightness: 3, mirror: 1 },
      "80%": { scale: 1.5, brightness: 3, mirror: 1 },
      "100%": { scale: 1, brightness: 1, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "flashZoomIn",
  );
};

//custom presets out
export const tiltSlideRightOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltSlideRightOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, x: 0, mirror: 1 },
      "70%": { angle: 7, x: 0, mirror: 1 },
      "100%": { angle: 10, x: 200, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "tiltSlideRightOut",
  );
};

export const tiltZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, scale: 1, mirror: 1 },
      "100%": { angle: -10, scale: 1.2, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "tiltZoomOut",
  );
};

export const glitchSlideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "glitchSlideOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0, mirror: 1 },
      "30%": { x: 100, angle: -5, mirror: 1 },
      "70%": { x: 100, angle: -20, mirror: 1 },
      "100%": { x: -100, angle: -20, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "glitchSlideOut",
  );
};

export const dropBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, blur: 0, mirror: 1 },
      "100%": { y: 200, blur: 20, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "dropBlurOut",
  );
};

export const fallZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, scale: 1, mirror: 1 },
      "100%": { y: 250, scale: 1.5, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "fallZoomOut",
  );
};

export const zoomSpinOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomSpinOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, angle: 0, mirror: 1 },
      "100%": { scale: 2, angle: 10, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "zoomSpinOut",
  );
};

export const dramaticSpinSlideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dramaticSpinSlideOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0, blur: 0, mirror: 1 },
      "40%": { x: -200, angle: 10, blur: 5, mirror: 1 },
      "100%": { x: -200, angle: 60, blur: 20, mirror: 1 },
    },
    {
      ...opts,
      easing,
    },
    "dramaticSpinSlideOut",
  );
};

//presets special

export const slideRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -200, angle: -15, mirror: defaultMirror },
      "100%": { x: 0, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideRotateIn",
  );
};

export const slideRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0, mirror: defaultMirror },
      "100%": { x: -200, angle: -15, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideRotateOut",
  );
};

export const slideBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 250, blur: 20, mirror: defaultMirror },
      "100%": { x: 0, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideBlurIn",
  );
};

export const slideBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, blur: 0, mirror: defaultMirror },
      "100%": { x: 250, blur: 20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideBlurOut",
  );
};

export const zoomRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.4, angle: 20, mirror: defaultMirror },
      "100%": { scale: 1, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomRotateIn",
  );
};

export const zoomRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, angle: 0, mirror: defaultMirror },
      "100%": { scale: 1.4, angle: 20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomRotateOut",
  );
};

export const zoomBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomBlurIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.6, blur: 30, mirror: defaultMirror },
      "100%": { scale: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomBlurIn",
  );
};

export const zoomBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, blur: 0, mirror: defaultMirror },
      "100%": { scale: 1.6, blur: 30, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomBlurOut",
  );
};

export const slideZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -300, scale: 0.7, mirror: defaultMirror },
      "100%": { x: 0, scale: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideZoomIn",
  );
};

export const slideZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, scale: 1, mirror: defaultMirror },
      "100%": { x: -300, scale: 0.7, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideZoomOut",
  );
};

export const verticalBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "verticalBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 200, blur: 25, mirror: defaultMirror },
      "100%": { y: 0, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "verticalBlurIn",
  );
};

export const verticalBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "verticalBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, blur: 0, mirror: defaultMirror },
      "100%": { y: 200, blur: 25, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "verticalBlurOut",
  );
};

export const rotateBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 45, blur: 20, mirror: defaultMirror },
      "100%": { angle: 0, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "rotateBlurIn",
  );
};

export const rotateBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, blur: 0, mirror: defaultMirror },
      "100%": { angle: 45, blur: 20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "rotateBlurOut",
  );
};

export const cinematicSlideZoomBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicSlideZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 300, scale: 0.6, blur: 40, mirror: defaultMirror },
      "100%": { x: 0, scale: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "cinematicSlideZoomBlurIn",
  );
};

export const cinematicSlideZoomBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicSlideZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, scale: 1, blur: 0, mirror: defaultMirror },
      "100%": { x: 300, scale: 0.6, blur: 40, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "cinematicSlideZoomBlurOut",
  );
};

export const brightnessZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.3, brightness: 3, mirror: defaultMirror },
      "100%": { scale: 1, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "brightnessZoomIn",
  );
};

export const brightnessZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, brightness: 1, mirror: defaultMirror },
      "100%": { scale: 1.3, brightness: 3, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "brightnessZoomOut",
  );
};

export const brightnessSlideIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessSlideIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -200, brightness: 0.3, mirror: defaultMirror },
      "100%": { x: 0, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "brightnessSlideIn",
  );
};

export const brightnessSlideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessSlideOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, brightness: 1, mirror: defaultMirror },
      "100%": { x: -200, brightness: 0.3, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "brightnessSlideOut",
  );
};

export const tiltZoomBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: -10, scale: 1.4, blur: 20, mirror: defaultMirror },
      "100%": { angle: 0, scale: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "tiltZoomBlurIn",
  );
};

export const tiltZoomBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, scale: 1, blur: 0, mirror: defaultMirror },
      "100%": { angle: -10, scale: 1.4, blur: 20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "tiltZoomBlurOut",
  );
};

export const dropRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: -250, angle: 15, mirror: defaultMirror },
      "100%": { y: 0, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "dropRotateIn",
  );
};

export const dropRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, angle: 0, mirror: defaultMirror },
      "100%": { y: -250, angle: 15, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "dropRotateOut",
  );
};

export const spiralIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spiralIn");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0.5, angle: 90, blur: 30, mirror: defaultMirror },
      "100%": { scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "spiralIn",
  );
};

export const spiralOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spiralOut");
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
      "100%": { scale: 0.5, angle: 90, blur: 30, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "spiralOut",
  );
};

export const flashSlideIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashSlideIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 150, brightness: 4, mirror: defaultMirror },
      "100%": { x: 0, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "flashSlideIn",
  );
};

export const flashSlideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashSlideOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, brightness: 1, mirror: defaultMirror },
      "100%": { x: 150, brightness: 4, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "flashSlideOut",
  );
};

export const heavyCinematicIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "heavyCinematicIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": {
        x: -300,
        scale: 0.5,
        angle: -20,
        blur: 50,
        mirror: defaultMirror,
      },
      "100%": { x: 0, scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "heavyCinematicIn",
  );
};

export const heavyCinematicOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "heavyCinematicOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
      "100%": {
        x: -300,
        scale: 0.5,
        angle: -20,
        blur: 50,
        mirror: defaultMirror,
      },
    },
    {
      ...opts,
      easing,
    },
    "heavyCinematicOut",
  );
};

export const diagonalSlideRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalSlideRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -200, y: 150, angle: -20, mirror: defaultMirror },
      "100%": { x: 0, y: 0, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "diagonalSlideRotateIn",
  );
};

export const diagonalSlideRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalSlideRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, y: 0, angle: 0, mirror: defaultMirror },
      "100%": { x: -200, y: 150, angle: -20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "diagonalSlideRotateOut",
  );
};

export const diagonalBlurZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalBlurZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 150, y: -150, scale: 0.6, blur: 30, mirror: defaultMirror },
      "100%": { x: 0, y: 0, scale: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "diagonalBlurZoomIn",
  );
};

export const diagonalBlurZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalBlurZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, y: 0, scale: 1, blur: 0, mirror: defaultMirror },
      "100%": { x: 150, y: -150, scale: 0.6, blur: 30, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "diagonalBlurZoomOut",
  );
};

export const rotateBrightnessIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBrightnessIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 60, brightness: 0.2, mirror: defaultMirror },
      "100%": { angle: 0, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "rotateBrightnessIn",
  );
};

export const rotateBrightnessOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBrightnessOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { angle: 0, brightness: 1, mirror: defaultMirror },
      "100%": { angle: 60, brightness: 0.2, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "rotateBrightnessOut",
  );
};

export const zoomBrightnessBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBrightnessBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.8, brightness: 3, blur: 25, mirror: defaultMirror },
      "100%": { scale: 1, brightness: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomBrightnessBlurIn",
  );
};

export const zoomBrightnessBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBrightnessBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, brightness: 1, blur: 0, mirror: defaultMirror },
      "100%": { scale: 1.8, brightness: 3, blur: 25, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "zoomBrightnessBlurOut",
  );
};

export const slideUpRotateZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideUpRotateZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 250, angle: -15, scale: 0.8, mirror: defaultMirror },
      "100%": { y: 0, angle: 0, scale: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideUpRotateZoomIn",
  );
};

export const slideUpRotateZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideUpRotateZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, angle: 0, scale: 1, mirror: defaultMirror },
      "100%": { y: 250, angle: -15, scale: 0.8, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "slideUpRotateZoomOut",
  );
};

export const fallBlurRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallBlurRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: -300, blur: 40, angle: 25, mirror: defaultMirror },
      "100%": { y: 0, blur: 0, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "fallBlurRotateIn",
  );
};

export const fallBlurRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallBlurRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, blur: 0, angle: 0, mirror: defaultMirror },
      "100%": { y: -300, blur: 40, angle: 25, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "fallBlurRotateOut",
  );
};

export const sideStretchZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "sideStretchZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 300, scale: 1.6, mirror: defaultMirror },
      "100%": { x: 0, scale: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "sideStretchZoomIn",
  );
};

export const sideStretchZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "sideStretchZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, scale: 1, mirror: defaultMirror },
      "100%": { x: 300, scale: 1.6, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "sideStretchZoomOut",
  );
};

export const darkSlideBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "darkSlideBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: -250, blur: 35, brightness: 0.3, mirror: defaultMirror },
      "100%": { x: 0, blur: 0, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "darkSlideBlurIn",
  );
};

export const darkSlideBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "darkSlideBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, blur: 0, brightness: 1, mirror: defaultMirror },
      "100%": { x: -250, blur: 35, brightness: 0.3, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "darkSlideBlurOut",
  );
};

export const liftZoomRotateIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "liftZoomRotateIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 200, scale: 0.7, angle: 12, mirror: defaultMirror },
      "100%": { y: 0, scale: 1, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "liftZoomRotateIn",
  );
};

export const liftZoomRotateOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "liftZoomRotateOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, scale: 1, angle: 0, mirror: defaultMirror },
      "100%": { y: 200, scale: 0.7, angle: 12, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "liftZoomRotateOut",
  );
};

export const overexposedZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "overexposedZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1.4, brightness: 4, mirror: defaultMirror },
      "100%": { scale: 1, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "overexposedZoomIn",
  );
};

export const overexposedZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "overexposedZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, brightness: 1, mirror: defaultMirror },
      "100%": { scale: 1.4, brightness: 4, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "overexposedZoomOut",
  );
};

export const pushDownZoomBlurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "pushDownZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: -180, scale: 1.5, blur: 20, mirror: defaultMirror },
      "100%": { y: 0, scale: 1, blur: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "pushDownZoomBlurIn",
  );
};

export const pushDownZoomBlurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "pushDownZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { y: 0, scale: 1, blur: 0, mirror: defaultMirror },
      "100%": { y: -180, scale: 1.5, blur: 20, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "pushDownZoomBlurOut",
  );
};

export const twistSlideBrightnessIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "twistSlideBrightnessIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 200, angle: 25, brightness: 0.4, mirror: defaultMirror },
      "100%": { x: 0, angle: 0, brightness: 1, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "twistSlideBrightnessIn",
  );
};

export const twistSlideBrightnessOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "twistSlideBrightnessOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, angle: 0, brightness: 1, mirror: defaultMirror },
      "100%": { x: 200, angle: 25, brightness: 0.4, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "twistSlideBrightnessOut",
  );
};

export const collapseRotateZoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "collapseRotateZoomIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 0.4, angle: -45, mirror: defaultMirror },
      "100%": { scale: 1, angle: 0, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "collapseRotateZoomIn",
  );
};

export const collapseRotateZoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "collapseRotateZoomOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { scale: 1, angle: 0, mirror: defaultMirror },
      "100%": { scale: 0.4, angle: -45, mirror: defaultMirror },
    },
    {
      ...opts,
      easing,
    },
    "collapseRotateZoomOut",
  );
};

export const ultraCinematicIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "ultraCinematicIn",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": {
        x: 400,
        y: 200,
        scale: 0.5,
        blur: 60,
        angle: 30,
        mirror: defaultMirror,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 1,
        blur: 0,
        angle: 0,
        mirror: defaultMirror,
      },
    },
    {
      ...opts,
      easing,
    },
    "ultraCinematicIn",
  );
};

export const ultraCinematicOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultMirror = normalized?.mirror || 0;
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "ultraCinematicOut",
    );
  }
  return new KeyframeAnimation(
    {
      "0%": { x: 0, y: 0, scale: 1, blur: 0, angle: 0, mirror: defaultMirror },
      "100%": {
        x: 400,
        y: 200,
        scale: 0.5,
        blur: 60,
        angle: 30,
        mirror: defaultMirror,
      },
    },
    {
      ...opts,
      easing,
    },
    "ultraCinematicOut",
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
//custom presets in
animationRegistry.register("blurSlideRightIn", blurSlideRightIn);
animationRegistry.register("wobbleZoomIn", wobbleZoomIn);
animationRegistry.register("spinZoomIn", spinZoomIn);
animationRegistry.register("blurSlideLeftIn", blurSlideLeftIn);
animationRegistry.register("blurSlideRightStrongIn", blurSlideRightStrongIn);
animationRegistry.register("cinematicZoomSlideIn", cinematicZoomSlideIn);
animationRegistry.register("elasticTwistIn", elasticTwistIn);
animationRegistry.register("spinFadeIn", spinFadeIn);
animationRegistry.register("flashZoomIn", flashZoomIn);
//custom presets out
animationRegistry.register("tiltSlideRightOut", tiltSlideRightOut);
animationRegistry.register("tiltZoomOut", tiltZoomOut);
animationRegistry.register("glitchSlideOut", glitchSlideOut);
animationRegistry.register("dropBlurOut", dropBlurOut);
animationRegistry.register("fallZoomOut", fallZoomOut);
animationRegistry.register("zoomSpinOut", zoomSpinOut);
animationRegistry.register("dramaticSpinSlideOut", dramaticSpinSlideOut);

//presets special
animationRegistry.register("slideRotateIn", slideRotateIn);
animationRegistry.register("slideRotateOut", slideRotateOut);
animationRegistry.register("slideBlurIn", slideBlurIn);
animationRegistry.register("slideBlurOut", slideBlurOut);
animationRegistry.register("zoomRotateIn", zoomRotateIn);
animationRegistry.register("zoomRotateOut", zoomRotateOut);
animationRegistry.register("zoomBlurIn", zoomBlurIn);
animationRegistry.register("zoomBlurOut", zoomBlurOut);
animationRegistry.register("slideZoomIn", slideZoomIn);
animationRegistry.register("slideZoomOut", slideZoomOut);
animationRegistry.register("verticalBlurIn", verticalBlurIn);
animationRegistry.register("verticalBlurOut", verticalBlurOut);
animationRegistry.register("rotateBlurIn", rotateBlurIn);
animationRegistry.register("rotateBlurOut", rotateBlurOut);
animationRegistry.register(
  "cinematicSlideZoomBlurIn",
  cinematicSlideZoomBlurIn,
);
animationRegistry.register(
  "cinematicSlideZoomBlurOut",
  cinematicSlideZoomBlurOut,
);
animationRegistry.register("brightnessZoomIn", brightnessZoomIn);
animationRegistry.register("brightnessZoomOut", brightnessZoomOut);
animationRegistry.register("brightnessSlideIn", brightnessSlideIn);
animationRegistry.register("brightnessSlideOut", brightnessSlideOut);
animationRegistry.register("tiltZoomBlurIn", tiltZoomBlurIn);
animationRegistry.register("tiltZoomBlurOut", tiltZoomBlurOut);
animationRegistry.register("dropRotateIn", dropRotateIn);
animationRegistry.register("dropRotateOut", dropRotateOut);
animationRegistry.register("spiralIn", spiralIn);
animationRegistry.register("spiralOut", spiralOut);
animationRegistry.register("flashSlideIn", flashSlideIn);
animationRegistry.register("flashSlideOut", flashSlideOut);
animationRegistry.register("heavyCinematicIn", heavyCinematicIn);
animationRegistry.register("heavyCinematicOut", heavyCinematicOut);
animationRegistry.register("diagonalSlideRotateIn", diagonalSlideRotateIn);
animationRegistry.register("diagonalSlideRotateOut", diagonalSlideRotateOut);
animationRegistry.register("diagonalBlurZoomIn", diagonalBlurZoomIn);
animationRegistry.register("diagonalBlurZoomOut", diagonalBlurZoomOut);
animationRegistry.register("rotateBrightnessIn", rotateBrightnessIn);
animationRegistry.register("rotateBrightnessOut", rotateBrightnessOut);
animationRegistry.register("zoomBrightnessBlurIn", zoomBrightnessBlurIn);
animationRegistry.register("zoomBrightnessBlurOut", zoomBrightnessBlurOut);
animationRegistry.register("slideUpRotateZoomIn", slideUpRotateZoomIn);
animationRegistry.register("slideUpRotateZoomOut", slideUpRotateZoomOut);
animationRegistry.register("fallBlurRotateIn", fallBlurRotateIn);
animationRegistry.register("fallBlurRotateOut", fallBlurRotateOut);
animationRegistry.register("sideStretchZoomIn", sideStretchZoomIn);
animationRegistry.register("sideStretchZoomOut", sideStretchZoomOut);
animationRegistry.register("darkSlideBlurIn", darkSlideBlurIn);
animationRegistry.register("darkSlideBlurOut", darkSlideBlurOut);
animationRegistry.register("liftZoomRotateIn", liftZoomRotateIn);
animationRegistry.register("liftZoomRotateOut", liftZoomRotateOut);
animationRegistry.register("overexposedZoomIn", overexposedZoomIn);
animationRegistry.register("overexposedZoomOut", overexposedZoomOut);
animationRegistry.register("pushDownZoomBlurIn", pushDownZoomBlurIn);
animationRegistry.register("pushDownZoomBlurOut", pushDownZoomBlurOut);
animationRegistry.register("twistSlideBrightnessIn", twistSlideBrightnessIn);
animationRegistry.register("twistSlideBrightnessOut", twistSlideBrightnessOut);
animationRegistry.register("collapseRotateZoomIn", collapseRotateZoomIn);
animationRegistry.register("collapseRotateZoomOut", collapseRotateZoomOut);
animationRegistry.register("ultraCinematicIn", ultraCinematicIn);
animationRegistry.register("ultraCinematicOut", ultraCinematicOut);

/**
 * Get the keyframe template for a preset animation
 * Useful for populating the animation editor UI
 */
export function getPresetTemplate(type: string, params?: any): any {
  const normalized = normalizeParams(params);
  const defaultMirror = normalized?.mirror || 0;
  const defaultScale = normalized?.scale || 0;
  const defaultOpacity = normalized?.opacity || 0;
  switch (type) {
    case "fadeIn":
      return {
        "0%": { opacity: defaultOpacity, scale: 0.9, mirror: defaultMirror },
        "100%": { opacity: 1, scale: 1, mirror: defaultMirror },
      };
    case "fadeOut":
      return {
        "0%": { opacity: 1, mirror: defaultMirror },
        "100%": { opacity: defaultOpacity, mirror: defaultMirror },
      };
    case "zoomIn":
      return {
        "0%": {
          scale: defaultScale,
          opacity: defaultOpacity,
          mirror: defaultMirror,
        },
        "100%": { scale: 1, opacity: 1, mirror: defaultMirror },
      };
    case "zoomOut":
      return {
        "0%": { scale: 1, opacity: 1, mirror: defaultMirror },
        "100%": {
          scale: defaultScale,
          opacity: defaultOpacity,
          mirror: defaultMirror,
        },
      };
    case "slideIn": {
      const direction = normalized?.direction || "left";
      const distance = normalized?.distance || 300;
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
          opacity: defaultOpacity,
          mirror: defaultMirror,
        },
        "100%": { x: 0, y: 0, opacity: 1, mirror: defaultMirror },
      };
    }
    case "slideOut": {
      const direction = normalized?.direction || "left";
      const distance = normalized?.distance || 300;
      return {
        "0%": { x: 0, y: 0, opacity: 1, mirror: defaultMirror },
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
          opacity: defaultOpacity,
          mirror: defaultMirror,
        },
      };
    }
    case "pulse":
      return {
        "0%": { scale: 1, mirror: defaultMirror },
        "25%": { scale: 0.9, mirror: defaultMirror },
        "50%": { scale: 1, mirror: defaultMirror },
        "75%": { scale: 0.9, mirror: defaultMirror },
        "100%": { scale: 1, mirror: defaultMirror },
      };
    case "blurIn":
      return {
        "0%": { blur: 20, opacity: defaultOpacity, mirror: defaultMirror },
        "100%": { blur: 0, opacity: 1, mirror: defaultMirror },
      };
    case "blurOut":
      return {
        "0%": { blur: 0, opacity: 1, mirror: defaultMirror },
        "100%": { blur: 20, opacity: defaultOpacity, mirror: defaultMirror },
      };
    case "blurSlideRightIn":
      return {
        "0%": { blur: 5, x: 100, mirror: defaultMirror },
        "100%": { blur: 0, x: 0, mirror: defaultMirror },
      };
    case "wobbleZoomIn":
      return {
        "0%": { scale: 1.2, angle: -5, mirror: defaultMirror },
        "32%": { scale: 1, angle: 0, mirror: defaultMirror },
        "64%": { scale: 1.2, angle: -5, mirror: defaultMirror },
        "100%": { scale: 1, angle: 0, mirror: defaultMirror },
      };
    case "spinZoomIn":
      return {
        "0%": { blur: 5, angle: 45, scale: 2, mirror: defaultMirror },
        "100%": { blur: 0, angle: 0, scale: 1, mirror: defaultMirror },
      };
    case "blurSlideLeftIn":
      return {
        "0%": { x: -200, blur: 10, mirror: defaultMirror },
        "100%": { x: 0, blur: 0, mirror: defaultMirror },
      };
    case "blurSlideRightStrongIn":
      return {
        "0%": { x: 200, blur: 10, mirror: defaultMirror },
        "100%": { x: 0, blur: 0, mirror: defaultMirror },
      };
    case "cinematicZoomSlideIn":
      return {
        "0%": { scale: 0.6, blur: 30, x: 200, mirror: defaultMirror },
        "30%": { scale: 0.8, blur: 20, x: 50, mirror: defaultMirror },
        "60%": { scale: 0.9, blur: 10, x: 0, mirror: defaultMirror },
        "100%": { scale: 1, blur: 0, x: 0, mirror: defaultMirror },
      };
    case "elasticTwistIn":
      return {
        "0%": { scale: 1.4, blur: 20, angle: 10, mirror: defaultMirror },
        "40%": { scale: 1, blur: 0, angle: 0, mirror: defaultMirror },
        "60%": { scale: 1.3, blur: 0, angle: -10, mirror: defaultMirror },
        "100%": { scale: 1, blur: 0, angle: 0, mirror: defaultMirror },
      };
    case "spinFadeIn":
      return {
        "0%": { blur: 40, angle: 80, mirror: defaultMirror },
        "100%": { blur: 0, angle: 0, mirror: defaultMirror },
      };
    case "flashZoomIn":
      return {
        "0%": { scale: 1, brightness: 3, mirror: defaultMirror },
        "40%": { scale: 1, brightness: 3, mirror: defaultMirror },
        "80%": { scale: 1.5, brightness: 3, mirror: defaultMirror },
        "100%": { scale: 1, brightness: 1, mirror: defaultMirror },
      };
    case "tiltSlideRightOut":
      return {
        "0%": { angle: 0, x: 0, mirror: defaultMirror },
        "70%": { angle: 7, x: 0, mirror: defaultMirror },
        "100%": { angle: 10, x: 200, mirror: defaultMirror },
      };
    case "tiltZoomOut":
      return {
        "0%": { angle: 0, scale: 1, mirror: defaultMirror },
        "100%": { angle: -10, scale: 1.2, mirror: defaultMirror },
      };
    case "glitchSlideOut":
      return {
        "0%": { x: 0, angle: 0, mirror: defaultMirror },
        "30%": { x: 100, angle: -5, mirror: defaultMirror },
        "70%": { x: 100, angle: -20, mirror: defaultMirror },
        "100%": { x: -100, angle: -20, mirror: defaultMirror },
      };
    case "dropBlurOut":
      return {
        "0%": { y: 0, blur: 0, mirror: defaultMirror },
        "100%": { y: 200, blur: 20, mirror: defaultMirror },
      };
    case "fallZoomOut":
      return {
        "0%": { y: 0, scale: 1, mirror: defaultMirror },
        "100%": { y: 250, scale: 1.5, mirror: defaultMirror },
      };
    case "zoomSpinOut":
      return {
        "0%": { scale: 1, angle: 0, mirror: defaultMirror },
        "100%": { scale: 2, angle: 10, mirror: defaultMirror },
      };
    case "dramaticSpinSlideOut":
      return {
        "0%": { x: 0, angle: 0, blur: 0, mirror: defaultMirror },
        "40%": { x: -200, angle: 10, blur: 5, mirror: defaultMirror },
        "100%": { x: -200, angle: 60, blur: 20, mirror: defaultMirror },
      };
    case "slideRotateIn":
      return {
        "0%": { x: -200, angle: -15, mirror: defaultMirror },
        "100%": { x: 0, angle: 0, mirror: defaultMirror },
      };
    case "slideRotateOut":
      return {
        "0%": { x: 0, angle: 0, mirror: defaultMirror },
        "100%": { x: -200, angle: -15, mirror: defaultMirror },
      };
    case "slideBlurIn":
      return {
        "0%": { x: 250, blur: 20, mirror: defaultMirror },
        "100%": { x: 0, blur: 0, mirror: defaultMirror },
      };
    case "slideBlurOut":
      return {
        "0%": { x: 0, blur: 0, mirror: defaultMirror },
        "100%": { x: 250, blur: 20, mirror: defaultMirror },
      };
    case "zoomRotateIn":
      return {
        "0%": { scale: 1.4, angle: 20, mirror: defaultMirror },
        "100%": { scale: 1, angle: 0, mirror: defaultMirror },
      };
    case "zoomRotateOut":
      return {
        "0%": { scale: 1, angle: 0, mirror: defaultMirror },
        "100%": { scale: 1.4, angle: 20, mirror: defaultMirror },
      };
    case "zoomBlurIn":
      return {
        "0%": { scale: 1.6, blur: 30, mirror: defaultMirror },
        "100%": { scale: 1, blur: 0, mirror: defaultMirror },
      };
    case "zoomBlurOut":
      return {
        "0%": { scale: 1, blur: 0, mirror: defaultMirror },
        "100%": { scale: 1.6, blur: 30, mirror: defaultMirror },
      };
    case "slideZoomIn":
      return {
        "0%": { x: -300, scale: 0.7, mirror: defaultMirror },
        "100%": { x: 0, scale: 1, mirror: defaultMirror },
      };
    case "slideZoomOut":
      return {
        "0%": { x: 0, scale: 1, mirror: defaultMirror },
        "100%": { x: -300, scale: 0.7, mirror: defaultMirror },
      };
    case "verticalBlurIn":
      return {
        "0%": { y: 200, blur: 25, mirror: defaultMirror },
        "100%": { y: 0, blur: 0, mirror: defaultMirror },
      };
    case "verticalBlurOut":
      return {
        "0%": { y: 0, blur: 0, mirror: defaultMirror },
        "100%": { y: 200, blur: 25, mirror: defaultMirror },
      };
    case "rotateBlurIn":
      return {
        "0%": { angle: 45, blur: 20, mirror: defaultMirror },
        "100%": { angle: 0, blur: 0, mirror: defaultMirror },
      };
    case "rotateBlurOut":
      return {
        "0%": { angle: 0, blur: 0, mirror: defaultMirror },
        "100%": { angle: 45, blur: 20, mirror: defaultMirror },
      };

    case "cinematicSlideZoomBlurIn":
      return {
        "0%": { x: 300, scale: 0.6, blur: 40, mirror: defaultMirror },
        "100%": { x: 0, scale: 1, blur: 0, mirror: defaultMirror },
      };
    case "cinematicSlideZoomBlurOut":
      return {
        "0%": { x: 0, scale: 1, blur: 0, mirror: defaultMirror },
        "100%": { x: 300, scale: 0.6, blur: 40, mirror: defaultMirror },
      };
    case "brightnessZoomIn":
      return {
        "0%": { scale: 1.3, brightness: 3, mirror: defaultMirror },
        "100%": { scale: 1, brightness: 1, mirror: defaultMirror },
      };
    case "brightnessZoomOut":
      return {
        "0%": { scale: 1, brightness: 1, mirror: defaultMirror },
        "100%": { scale: 1.3, brightness: 3, mirror: defaultMirror },
      };

    case "brightnessSlideIn":
      return {
        "0%": { x: -200, brightness: 0.3, mirror: defaultMirror },
        "100%": { x: 0, brightness: 1, mirror: defaultMirror },
      };
    case "brightnessSlideOut":
      return {
        "0%": { x: 0, brightness: 1, mirror: defaultMirror },
        "100%": { x: -200, brightness: 0.3, mirror: defaultMirror },
      };

    case "tiltZoomBlurIn":
      return {
        "0%": { angle: -10, scale: 1.4, blur: 20, mirror: defaultMirror },
        "100%": { angle: 0, scale: 1, blur: 0, mirror: defaultMirror },
      };
    case "tiltZoomBlurOut":
      return {
        "0%": { angle: 0, scale: 1, blur: 0, mirror: defaultMirror },
        "100%": { angle: -10, scale: 1.4, blur: 20, mirror: defaultMirror },
      };
    case "dropRotateIn":
      return {
        "0%": { y: -250, angle: 15, mirror: defaultMirror },
        "100%": { y: 0, angle: 0, mirror: defaultMirror },
      };
    case "dropRotateOut":
      return {
        "0%": { y: 0, angle: 0, mirror: defaultMirror },
        "100%": { y: -250, angle: 15, mirror: defaultMirror },
      };
    case "spiralIn":
      return {
        "0%": { scale: 0.5, angle: 90, blur: 30, mirror: defaultMirror },
        "100%": { scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
      };
    case "spiralOut":
      return {
        "0%": { scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
        "100%": { scale: 0.5, angle: 90, blur: 30, mirror: defaultMirror },
      };
    case "flashSlideIn":
      return {
        "0%": { x: 150, brightness: 4, mirror: defaultMirror },
        "100%": { x: 0, brightness: 1, mirror: defaultMirror },
      };
    case "flashSlideOut":
      return {
        "0%": { x: 0, brightness: 1, mirror: defaultMirror },
        "100%": { x: 150, brightness: 4, mirror: defaultMirror },
      };
    case "heavyCinematicIn":
      return {
        "0%": {
          x: -300,
          scale: 0.5,
          angle: -20,
          blur: 50,
          mirror: defaultMirror,
        },
        "100%": { x: 0, scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
      };
    case "heavyCinematicOut":
      return {
        "0%": { x: 0, scale: 1, angle: 0, blur: 0, mirror: defaultMirror },
        "100%": {
          x: -300,
          scale: 0.5,
          angle: -20,
          blur: 50,
          mirror: defaultMirror,
        },
      };
    case "diagonalSlideRotateIn":
      return {
        "0%": { x: -200, y: 150, angle: -20, mirror: defaultMirror },
        "100%": { x: 0, y: 0, angle: 0, mirror: defaultMirror },
      };
    case "diagonalSlideRotateOut":
      return {
        "0%": { x: 0, y: 0, angle: 0, mirror: defaultMirror },
        "100%": { x: -200, y: 150, angle: -20, mirror: defaultMirror },
      };
    case "diagonalBlurZoomIn":
      return {
        "0%": { x: 150, y: -150, scale: 0.6, blur: 30, mirror: defaultMirror },
        "100%": { x: 0, y: 0, scale: 1, blur: 0, mirror: defaultMirror },
      };
    case "diagonalBlurZoomOut":
      return {
        "0%": { x: 0, y: 0, scale: 1, blur: 0, mirror: defaultMirror },
        "100%": {
          x: 150,
          y: -150,
          scale: 0.6,
          blur: 30,
          mirror: defaultMirror,
        },
      };
    case "rotateBrightnessIn":
      return {
        "0%": { angle: 60, brightness: 0.2, mirror: defaultMirror },
        "100%": { angle: 0, brightness: 1, mirror: defaultMirror },
      };
    case "rotateBrightnessOut":
      return {
        "0%": { angle: 0, brightness: 1, mirror: defaultMirror },
        "100%": { angle: 60, brightness: 0.2, mirror: defaultMirror },
      };

    case "zoomBrightnessBlurIn":
      return {
        "0%": { scale: 1.8, brightness: 3, blur: 25, mirror: defaultMirror },
        "100%": { scale: 1, brightness: 1, blur: 0, mirror: defaultMirror },
      };
    case "zoomBrightnessBlurOut":
      return {
        "0%": { scale: 1, brightness: 1, blur: 0, mirror: defaultMirror },
        "100%": { scale: 1.8, brightness: 3, blur: 25, mirror: defaultMirror },
      };
    case "slideUpRotateZoomIn":
      return {
        "0%": { y: 250, angle: -15, scale: 0.8, mirror: defaultMirror },
        "100%": { y: 0, angle: 0, scale: 1, mirror: defaultMirror },
      };
    case "slideUpRotateZoomOut":
      return {
        "0%": { y: 0, angle: 0, scale: 1, mirror: defaultMirror },
        "100%": { y: 250, angle: -15, scale: 0.8, mirror: defaultMirror },
      };
    case "fallBlurRotateIn":
      return {
        "0%": { y: -300, blur: 40, angle: 25, mirror: defaultMirror },
        "100%": { y: 0, blur: 0, angle: 0, mirror: defaultMirror },
      };
    case "fallBlurRotateOut":
      return {
        "0%": { y: 0, blur: 0, angle: 0, mirror: defaultMirror },
        "100%": { y: -300, blur: 40, angle: 25, mirror: defaultMirror },
      };
    case "sideStretchZoomIn":
      return {
        "0%": { x: 300, scale: 1.6, mirror: defaultMirror },
        "100%": { x: 0, scale: 1, mirror: defaultMirror },
      };
    case "sideStretchZoomOut":
      return {
        "0%": { x: 0, scale: 1, mirror: defaultMirror },
        "100%": { x: 300, scale: 1.6, mirror: defaultMirror },
      };
    case "darkSlideBlurIn":
      return {
        "0%": { x: -250, blur: 35, brightness: 0.3, mirror: defaultMirror },
        "100%": { x: 0, blur: 0, brightness: 1, mirror: defaultMirror },
      };
    case "darkSlideBlurOut":
      return {
        "0%": { x: 0, blur: 0, brightness: 1, mirror: defaultMirror },
        "100%": { x: -250, blur: 35, brightness: 0.3, mirror: defaultMirror },
      };
    case "liftZoomRotateIn":
      return {
        "0%": { y: 200, scale: 0.7, angle: 12, mirror: defaultMirror },
        "100%": { y: 0, scale: 1, angle: 0, mirror: defaultMirror },
      };
    case "liftZoomRotateOut":
      return {
        "0%": { y: 0, scale: 1, angle: 0, mirror: defaultMirror },
        "100%": { y: 200, scale: 0.7, angle: 12, mirror: defaultMirror },
      };
    case "overexposedZoomIn":
      return {
        "0%": { scale: 1.4, brightness: 4, mirror: defaultMirror },
        "100%": { scale: 1, brightness: 1, mirror: defaultMirror },
      };
    case "overexposedZoomOut":
      return {
        "0%": { scale: 1, brightness: 1, mirror: defaultMirror },
        "100%": { scale: 1.4, brightness: 4, mirror: defaultMirror },
      };

    case "driftRotateBlurIn":
      return {
        "0%": { x: 120, angle: -30, blur: 25, mirror: defaultMirror },
        "100%": { x: 0, angle: 0, blur: 0, mirror: defaultMirror },
      };
    case "driftRotateBlurOut":
      return {
        "0%": { x: 0, angle: 0, blur: 0, mirror: defaultMirror },
        "100%": { x: 120, angle: -30, blur: 25, mirror: defaultMirror },
      };
    case "pushDownZoomBlurIn":
      return {
        "0%": { y: -180, scale: 1.5, blur: 20, mirror: defaultMirror },
        "100%": { y: 0, scale: 1, blur: 0, mirror: defaultMirror },
      };
    case "pushDownZoomBlurOut":
      return {
        "0%": { y: 0, scale: 1, blur: 0, mirror: defaultMirror },
        "100%": { y: -180, scale: 1.5, blur: 20, mirror: defaultMirror },
      };

    case "twistSlideBrightnessIn":
      return {
        "0%": { x: 200, angle: 25, brightness: 0.4, mirror: defaultMirror },
        "100%": { x: 0, angle: 0, brightness: 1, mirror: defaultMirror },
      };
    case "twistSlideBrightnessOut":
      return {
        "0%": { x: 0, angle: 0, brightness: 1, mirror: defaultMirror },
        "100%": { x: 200, angle: 25, brightness: 0.4, mirror: defaultMirror },
      };

    case "collapseRotateZoomIn":
      return {
        "0%": { scale: 0.4, angle: -45, mirror: defaultMirror },
        "100%": { scale: 1, angle: 0, mirror: defaultMirror },
      };
    case "collapseRotateZoomOut":
      return {
        "0%": { scale: 1, angle: 0, mirror: defaultMirror },
        "100%": { scale: 0.4, angle: -45, mirror: defaultMirror },
      };
    case "ultraCinematicIn":
      return {
        "0%": {
          x: 400,
          y: 200,
          scale: 0.5,
          blur: 60,
          angle: 30,
          mirror: defaultMirror,
        },
        "100%": {
          x: 0,
          y: 0,
          scale: 1,
          blur: 0,
          angle: 0,
          mirror: defaultMirror,
        },
      };
    case "ultraCinematicOut":
      return {
        "0%": {
          x: 0,
          y: 0,
          scale: 1,
          blur: 0,
          angle: 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: 400,
          y: 200,
          scale: 0.5,
          blur: 60,
          angle: 30,
          mirror: defaultMirror,
        },
      };
    case "custom":
    default:
      return {
        "0%": {},
        "100%": {},
      };
  }
}
