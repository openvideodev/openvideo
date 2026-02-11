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
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultParams = getPresetTemplate("pulse", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, iterCount: factor * 3, easing },
      "pulse",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultParams = getPresetTemplate("fadeIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "fadeIn");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "fadeIn");
};

export const fadeOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeInQuad";
  const defaultParams = getPresetTemplate("fadeOut", params);

  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "fadeOut");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "fadeOut");
};

export const slideIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutCubic";
  const defaultParams = getPresetTemplate("slideIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "slideIn");
  }
  const anim = new KeyframeAnimation(
    defaultParams,
    { ...opts, easing },
    "slideIn",
  );
  (anim as any).presetParams = params;
  return anim;
};

export const slideOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeInCubic";
  const defaultParams = getPresetTemplate("slideOut", params);

  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "slideOut");
  }
  const anim = new KeyframeAnimation(
    defaultParams,
    { ...opts, easing },
    "slideOut",
  );
  (anim as any).presetParams = params;
  return anim;
};

export const zoomIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutBack";
  const defaultParams = getPresetTemplate("zoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomIn");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "zoomIn");
};

export const zoomOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeInBack";
  const defaultParams = getPresetTemplate("zoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomOut");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "zoomOut");
};

export const blurIn: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeOutQuad";
  const defaultParams = getPresetTemplate("blurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "blurIn");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "blurIn");
};

export const blurOut: AnimationFactory = (opts, params) => {
  const normalized = normalizeParams(params);
  const easing = normalized?.easing || opts.easing || "easeInQuad";
  const defaultParams = getPresetTemplate("blurOut", params);

  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "blurOut");
  }
  return new KeyframeAnimation(defaultParams, { ...opts, easing }, "blurOut");
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
  const defaultParams = getPresetTemplate("blurSlideRightIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideRightIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("wobbleZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "wobbleZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("spinZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spinZoomIn");
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("blurSlideLeftIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideLeftIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("blurSlideRightStrongIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "blurSlideRightStrongIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("cinematicZoomSlideIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicZoomSlideIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("elasticTwistIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "elasticTwistIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("spinFadeIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spinFadeIn");
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("flashZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("tiltSlideRightOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltSlideRightOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("tiltZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("glitchSlideOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "glitchSlideOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("dropBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("fallZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomSpinOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomSpinOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("dramaticSpinSlideOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dramaticSpinSlideOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "zoomBlurIn");
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("verticalBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "verticalBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("verticalBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "verticalBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("rotateBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("rotateBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("cinematicSlideZoomBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicSlideZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("cinematicSlideZoomBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "cinematicSlideZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("brightnessZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("brightnessZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("brightnessSlideIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessSlideIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("brightnessSlideOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "brightnessSlideOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("tiltZoomBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("tiltZoomBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "tiltZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("dropRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("dropRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "dropRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("spiralIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spiralIn");
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("spiralOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(normalized, { ...opts, easing }, "spiralOut");
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("flashSlideIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashSlideIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("flashSlideOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "flashSlideOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("heavyCinematicIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "heavyCinematicIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("heavyCinematicOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "heavyCinematicOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("diagonalSlideRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalSlideRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("diagonalSlideRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalSlideRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("diagonalBlurZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalBlurZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("diagonalBlurZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "diagonalBlurZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("rotateBrightnessIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBrightnessIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("rotateBrightnessOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "rotateBrightnessOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomBrightnessBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBrightnessBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("zoomBrightnessBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "zoomBrightnessBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideUpRotateZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideUpRotateZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("slideUpRotateZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "slideUpRotateZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("fallBlurRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallBlurRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("fallBlurRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "fallBlurRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("sideStretchZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "sideStretchZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("sideStretchZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "sideStretchZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("darkSlideBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "darkSlideBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("darkSlideBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "darkSlideBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("liftZoomRotateIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "liftZoomRotateIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("liftZoomRotateOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "liftZoomRotateOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("overexposedZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "overexposedZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("overexposedZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "overexposedZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("pushDownZoomBlurIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "pushDownZoomBlurIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("pushDownZoomBlurOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "pushDownZoomBlurOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("twistSlideBrightnessIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "twistSlideBrightnessIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("twistSlideBrightnessOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "twistSlideBrightnessOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("collapseRotateZoomIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "collapseRotateZoomIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("collapseRotateZoomOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "collapseRotateZoomOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("ultraCinematicIn", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "ultraCinematicIn",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const defaultParams = getPresetTemplate("ultraCinematicOut", params);
  if (normalized && (normalized["0%"] || normalized["100%"])) {
    return new KeyframeAnimation(
      normalized,
      { ...opts, easing },
      "ultraCinematicOut",
    );
  }
  return new KeyframeAnimation(
    defaultParams,
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
  const opacityInit = normalized?.opacityInit || null;
  const opacityEnd = normalized?.opacityEnd || null;
  const xPositionInit = normalized?.xPositionInit || null;
  const xPositionEnd = normalized?.xPositionEnd || null;
  const yPositionInit = normalized?.yPositionInit || null;
  const yPositionEnd = normalized?.yPositionEnd || null;
  const angleInit = normalized?.angleInit || null;
  const angleEnd = normalized?.angleEnd || null;
  const blurInit = normalized?.blurInit || null;
  const blurEnd = normalized?.blurEnd || null;
  const scaleInit = normalized?.scaleInit || null;
  const scaleEnd = normalized?.scaleEnd || null;
  const brightnessInit = normalized?.brightnessInit || null;
  const brightnessEnd = normalized?.brightnessEnd || null;

  switch (type) {
    case "fadeIn":
      return {
        "0%": { opacity: opacityInit ?? 0, scale: 0.9, mirror: defaultMirror },
        "100%": { opacity: opacityEnd ?? 1, scale: 1, mirror: defaultMirror },
      };
    case "fadeOut":
      return {
        "0%": { opacity: opacityInit ?? 1, mirror: defaultMirror },
        "100%": { opacity: opacityEnd ?? 0, mirror: defaultMirror },
      };
    case "zoomIn":
      return {
        "0%": {
          scale: scaleInit ?? 0,
          opacity: opacityInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          opacity: opacityEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "zoomOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          opacity: opacityInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 0,
          opacity: opacityEnd ?? 0,
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
                : (xPositionInit ?? 0),
          y:
            direction === "top"
              ? -distance
              : direction === "bottom"
                ? distance
                : (yPositionInit ?? 0),
          opacity: opacityInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          y: yPositionEnd ?? 0,
          opacity: opacityEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    }
    case "slideOut": {
      const direction = normalized?.direction || "left";
      const distance = normalized?.distance || 300;
      return {
        "0%": {
          x: xPositionInit ?? 0,
          y: yPositionInit ?? 0,
          opacity: opacityInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x:
            direction === "left"
              ? -distance
              : direction === "right"
                ? distance
                : (xPositionEnd ?? 0),
          y:
            direction === "top"
              ? -distance
              : direction === "bottom"
                ? distance
                : (yPositionEnd ?? 0),
          opacity: opacityEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    }
    case "pulse":
      return {
        "0%": { scale: scaleInit ?? 1, mirror: defaultMirror },
        "25%": { scale: scaleEnd ?? 0.9, mirror: defaultMirror },
        "50%": { scale: scaleInit ?? 1, mirror: defaultMirror },
        "75%": { scale: scaleEnd ?? 0.9, mirror: defaultMirror },
        "100%": { scale: scaleInit ?? 1, mirror: defaultMirror },
      };
    case "blurIn":
      return {
        "0%": {
          blur: blurInit ?? 20,
          opacity: opacityInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          blur: blurEnd ?? 0,
          opacity: opacityEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "blurOut":
      return {
        "0%": {
          blur: blurInit ?? 0,
          opacity: opacityInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          blur: blurEnd ?? 20,
          opacity: opacityEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "blurSlideRightIn":
      return {
        "0%": {
          blur: blurInit ?? 5,
          x: xPositionInit ?? 100,
          mirror: defaultMirror,
        },
        "100%": {
          blur: blurEnd ?? 0,
          x: xPositionEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "wobbleZoomIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.2,
          angle: angleInit ?? -5,
          mirror: defaultMirror,
        },
        "32%": {
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
        "64%": {
          scale: scaleInit ?? 1.2,
          angle: angleInit ?? -5,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "spinZoomIn":
      return {
        "0%": {
          blur: blurInit ?? 5,
          angle: angleInit ?? 45,
          scale: scaleInit ?? 2,
          mirror: defaultMirror,
        },
        "100%": {
          blur: blurEnd ?? 0,
          angle: angleEnd ?? 0,
          scale: scaleEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "blurSlideLeftIn":
      return {
        "0%": {
          x: xPositionInit ?? -200,
          blur: blurInit ?? 10,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "blurSlideRightStrongIn":
      return {
        "0%": {
          x: xPositionInit ?? 200,
          blur: blurInit ?? 10,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
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
        "0%": {
          blur: blurInit ?? 40,
          angle: angleInit ?? 80,
          mirror: defaultMirror,
        },
        "100%": {
          blur: blurEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
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
        "0%": {
          angle: angleInit ?? 0,
          scale: scaleInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? -10,
          scale: scaleEnd ?? 1.2,
          mirror: defaultMirror,
        },
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
        "0%": {
          y: yPositionInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 200,
          blur: blurEnd ?? 20,
          mirror: defaultMirror,
        },
      };
    case "fallZoomOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          scale: scaleInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 250,
          scale: scaleEnd ?? 1.5,
          mirror: defaultMirror,
        },
      };
    case "zoomSpinOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 2,
          angle: angleEnd ?? 10,
          mirror: defaultMirror,
        },
      };
    case "dramaticSpinSlideOut":
      return {
        "0%": { x: 0, angle: 0, blur: 0, mirror: defaultMirror },
        "40%": { x: -200, angle: 10, blur: 5, mirror: defaultMirror },
        "100%": { x: -200, angle: 60, blur: 20, mirror: defaultMirror },
      };
    case "slideRotateIn":
      return {
        "0%": {
          x: xPositionInit ?? -200,
          angle: angleInit ?? -15,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "slideRotateOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -200,
          angle: angleEnd ?? -15,
          mirror: defaultMirror,
        },
      };
    case "slideBlurIn":
      return {
        "0%": {
          x: xPositionInit ?? 250,
          blur: blurInit ?? 20,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "slideBlurOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 250,
          blur: blurEnd ?? 20,
          mirror: defaultMirror,
        },
      };
    case "zoomRotateIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.4,
          angle: angleInit ?? 20,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "zoomRotateOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1.4,
          angle: angleEnd ?? 20,
          mirror: defaultMirror,
        },
      };
    case "zoomBlurIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.6,
          blur: blurInit ?? 30,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "zoomBlurOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1.6,
          blur: blurEnd ?? 30,
          mirror: defaultMirror,
        },
      };
    case "slideZoomIn":
      return {
        "0%": {
          x: xPositionInit ?? -300,
          scale: scaleInit ?? 0.7,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "slideZoomOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          scale: scaleInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -300,
          scale: scaleEnd ?? 0.7,
          mirror: defaultMirror,
        },
      };
    case "verticalBlurIn":
      return {
        "0%": {
          y: yPositionInit ?? 200,
          blur: blurInit ?? 25,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "verticalBlurOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 200,
          blur: blurEnd ?? 25,
          mirror: defaultMirror,
        },
      };
    case "rotateBlurIn":
      return {
        "0%": {
          angle: angleInit ?? 45,
          blur: blurInit ?? 20,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "rotateBlurOut":
      return {
        "0%": {
          angle: angleInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? 45,
          blur: blurEnd ?? 20,
          mirror: defaultMirror,
        },
      };

    case "cinematicSlideZoomBlurIn":
      return {
        "0%": {
          x: xPositionInit ?? 300,
          scale: scaleInit ?? 0.6,
          blur: blurInit ?? 40,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "cinematicSlideZoomBlurOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 300,
          scale: scaleEnd ?? 0.6,
          blur: blurEnd ?? 40,
          mirror: defaultMirror,
        },
      };
    case "brightnessZoomIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.3,
          brightness: brightnessInit ?? 3,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "brightnessZoomOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1.3,
          brightness: brightnessEnd ?? 3,
          mirror: defaultMirror,
        },
      };

    case "brightnessSlideIn":
      return {
        "0%": {
          x: xPositionInit ?? -200,
          brightness: brightnessInit ?? 0.3,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "brightnessSlideOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -200,
          brightness: brightnessEnd ?? 0.3,
          mirror: defaultMirror,
        },
      };

    case "tiltZoomBlurIn":
      return {
        "0%": {
          angle: angleInit ?? -10,
          scale: scaleInit ?? 1.4,
          blur: blurInit ?? 20,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? 0,
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "tiltZoomBlurOut":
      return {
        "0%": {
          angle: angleInit ?? 0,
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? -10,
          scale: scaleEnd ?? 1.4,
          blur: blurEnd ?? 20,
          mirror: defaultMirror,
        },
      };
    case "dropRotateIn":
      return {
        "0%": {
          y: yPositionInit ?? -250,
          angle: angleInit ?? 15,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "dropRotateOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? -250,
          angle: angleEnd ?? 15,
          mirror: defaultMirror,
        },
      };
    case "spiralIn":
      return {
        "0%": {
          scale: scaleInit ?? 0.5,
          angle: angleInit ?? 90,
          blur: blurInit ?? 30,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "spiralOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 0.5,
          angle: angleEnd ?? 90,
          blur: blurEnd ?? 30,
          mirror: defaultMirror,
        },
      };
    case "flashSlideIn":
      return {
        "0%": {
          x: xPositionInit ?? 150,
          brightness: brightnessInit ?? 4,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "flashSlideOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 150,
          brightness: brightnessEnd ?? 4,
          mirror: defaultMirror,
        },
      };
    case "heavyCinematicIn":
      return {
        "0%": {
          x: xPositionInit ?? -300,
          scale: scaleInit ?? 0.5,
          angle: angleInit ?? -20,
          blur: blurInit ?? 50,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "heavyCinematicOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -300,
          scale: scaleEnd ?? 0.5,
          angle: angleEnd ?? -20,
          blur: blurEnd ?? 50,
          mirror: defaultMirror,
        },
      };
    case "diagonalSlideRotateIn":
      return {
        "0%": {
          x: xPositionInit ?? -200,
          y: yPositionInit ?? 150,
          angle: angleInit ?? -20,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          y: yPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "diagonalSlideRotateOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          y: yPositionInit ?? 0,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -200,
          y: yPositionEnd ?? 150,
          angle: angleEnd ?? -20,
          mirror: defaultMirror,
        },
      };
    case "diagonalBlurZoomIn":
      return {
        "0%": {
          x: xPositionInit ?? 150,
          y: yPositionInit ?? -150,
          scale: scaleInit ?? 0.6,
          blur: blurInit ?? 30,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          y: yPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "diagonalBlurZoomOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          y: yPositionInit ?? 0,
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 150,
          y: yPositionEnd ?? -150,
          scale: scaleEnd ?? 0.6,
          blur: blurEnd ?? 30,
          mirror: defaultMirror,
        },
      };
    case "rotateBrightnessIn":
      return {
        "0%": {
          angle: angleInit ?? 60,
          brightness: brightnessInit ?? 0.2,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? 0,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "rotateBrightnessOut":
      return {
        "0%": {
          angle: angleInit ?? 0,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          angle: angleEnd ?? 60,
          brightness: brightnessEnd ?? 0.2,
          mirror: defaultMirror,
        },
      };

    case "zoomBrightnessBlurIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.8,
          brightness: brightnessInit ?? 3,
          blur: blurInit ?? 25,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          brightness: brightnessEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "zoomBrightnessBlurOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          brightness: brightnessInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1.8,
          brightness: brightnessEnd ?? 3,
          blur: blurEnd ?? 25,
          mirror: defaultMirror,
        },
      };
    case "slideUpRotateZoomIn":
      return {
        "0%": {
          y: yPositionInit ?? 250,
          angle: angleInit ?? -15,
          scale: scaleInit ?? 0.8,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          scale: scaleEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "slideUpRotateZoomOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          angle: angleInit ?? 0,
          scale: scaleInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 250,
          angle: angleEnd ?? -15,
          scale: scaleEnd ?? 0.8,
          mirror: defaultMirror,
        },
      };
    case "fallBlurRotateIn":
      return {
        "0%": {
          y: yPositionInit ?? -300,
          blur: blurInit ?? 40,
          angle: angleInit ?? 25,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "fallBlurRotateOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          blur: blurInit ?? 0,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? -300,
          blur: blurEnd ?? 40,
          angle: angleEnd ?? 25,
          mirror: defaultMirror,
        },
      };
    case "sideStretchZoomIn":
      return {
        "0%": {
          x: xPositionInit ?? 300,
          scale: scaleInit ?? 1.6,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "sideStretchZoomOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          scale: scaleInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 300,
          scale: scaleEnd ?? 1.6,
          mirror: defaultMirror,
        },
      };
    case "darkSlideBlurIn":
      return {
        "0%": {
          x: xPositionInit ?? -250,
          blur: blurInit ?? 35,
          brightness: brightnessInit ?? 0.3,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          blur: blurEnd ?? 0,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "darkSlideBlurOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          blur: blurInit ?? 0,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? -250,
          blur: blurEnd ?? 35,
          brightness: brightnessEnd ?? 0.3,
          mirror: defaultMirror,
        },
      };
    case "liftZoomRotateIn":
      return {
        "0%": {
          y: yPositionInit ?? 200,
          scale: scaleInit ?? 0.7,
          angle: angleInit ?? 12,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "liftZoomRotateOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 200,
          scale: scaleEnd ?? 0.7,
          angle: angleEnd ?? 12,
          mirror: defaultMirror,
        },
      };
    case "overexposedZoomIn":
      return {
        "0%": {
          scale: scaleInit ?? 1.4,
          brightness: brightnessInit ?? 4,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "overexposedZoomOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1.4,
          brightness: brightnessEnd ?? 4,
          mirror: defaultMirror,
        },
      };

    case "driftRotateBlurIn":
      return {
        "0%": {
          x: xPositionInit ?? 120,
          angle: angleInit ?? -30,
          blur: blurInit ?? 25,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "driftRotateBlurOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          angle: angleInit ?? 0,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 120,
          angle: angleEnd ?? -30,
          blur: blurEnd ?? 25,
          mirror: defaultMirror,
        },
      };
    case "pushDownZoomBlurIn":
      return {
        "0%": {
          y: yPositionInit ?? -180,
          scale: scaleInit ?? 1.5,
          blur: blurInit ?? 20,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "pushDownZoomBlurOut":
      return {
        "0%": {
          y: yPositionInit ?? 0,
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          y: yPositionEnd ?? -180,
          scale: scaleEnd ?? 1.5,
          blur: blurEnd ?? 20,
          mirror: defaultMirror,
        },
      };

    case "twistSlideBrightnessIn":
      return {
        "0%": {
          x: xPositionInit ?? 200,
          angle: angleInit ?? 25,
          brightness: brightnessInit ?? 0.4,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          angle: angleEnd ?? 0,
          brightness: brightnessEnd ?? 1,
          mirror: defaultMirror,
        },
      };
    case "twistSlideBrightnessOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          angle: angleInit ?? 0,
          brightness: brightnessInit ?? 1,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 200,
          angle: angleEnd ?? 25,
          brightness: brightnessEnd ?? 0.4,
          mirror: defaultMirror,
        },
      };

    case "collapseRotateZoomIn":
      return {
        "0%": {
          scale: scaleInit ?? 0.4,
          angle: angleInit ?? -45,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 1,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "collapseRotateZoomOut":
      return {
        "0%": {
          scale: scaleInit ?? 1,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          scale: scaleEnd ?? 0.4,
          angle: angleEnd ?? -45,
          mirror: defaultMirror,
        },
      };
    case "ultraCinematicIn":
      return {
        "0%": {
          x: xPositionInit ?? 400,
          y: yPositionInit ?? 200,
          scale: scaleInit ?? 0.5,
          blur: blurInit ?? 60,
          angle: angleInit ?? 30,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 0,
          y: yPositionEnd ?? 0,
          scale: scaleEnd ?? 1,
          blur: blurEnd ?? 0,
          angle: angleEnd ?? 0,
          mirror: defaultMirror,
        },
      };
    case "ultraCinematicOut":
      return {
        "0%": {
          x: xPositionInit ?? 0,
          y: yPositionInit ?? 0,
          scale: scaleInit ?? 1,
          blur: blurInit ?? 0,
          angle: angleInit ?? 0,
          mirror: defaultMirror,
        },
        "100%": {
          x: xPositionEnd ?? 400,
          y: yPositionEnd ?? 200,
          scale: scaleEnd ?? 0.5,
          blur: blurEnd ?? 60,
          angle: angleEnd ?? 30,
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
