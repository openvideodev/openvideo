export { fastConcatMP4, fixFMP4Duration, mixinMP4AndAudio } from "./mp4-utils";
export { createChromakey } from "./utils/chromakey";
export { renderTxt2ImgBitmap } from "./utils/dom";

export {
  Audio,
  Caption,
  Image,
  Video,
  Text,
  Effect,
  Transition,
  Placeholder,
} from "./clips";

// Export types
export type { IClip, IMP4ClipOpts } from "./clips";

// Constants
export { DEFAULT_AUDIO_CONF } from "./clips/iclip";

// Keep MP4Clip as alias for backward compatibility
export { Video as MP4Clip } from "./clips";
export { Compositor } from "./compositor";
export type { ICompositorOpts } from "./compositor";
export { Studio } from "./studio";
export type { IStudioOpts } from "./studio";

export { Log } from "./utils/log";
export {
  clipToJSON,
  jsonToClip,
  type ClipJSON,
  type ProjectJSON,
} from "./json-serialization";

export { fontManager } from "./utils/fonts";

// Effects
export { makeEffect } from "./effect/effect";
export {
  VALUES_FILTER_SPECIAL,
  VALUES_FILTER_SPECIAL_LIMITS,
} from "./effect/constant";
export type { FilterOptionsMap } from "./effect/interface";
export {
  registerCustomEffect,
  unregisterCustomEffect,
  getAllEffects,
  getEffectOptions,
  GL_EFFECT_OPTIONS,
  type GlEffect,
} from "./effect/glsl/gl-effect";
export type { EffectKey } from "./effect/glsl/gl-effect";

// Transitions
export { makeTransition } from "./transition/transition";
export {
  registerCustomTransition,
  unregisterCustomTransition,
  getAllTransitions,
  getTransitionOptions,
  GL_TRANSITION_OPTIONS,
  type GlTransition,
} from "./transition/glsl/gl-transition";
export type { TransitionKey } from "./transition/glsl/gl-transition";

// Animations
export * from "./animation";
