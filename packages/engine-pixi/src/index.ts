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
  ShapeClip,
} from "./clips";

export type { IClip, IMP4ClipOpts } from "./clips";

export { DEFAULT_AUDIO_CONF } from "./clips/iclip";

export { Video as MP4Clip } from "./clips";
export { Compositor } from "./compositor";
export type { ICompositorOpts } from "./compositor";
export { Studio, Studio as PixiEngine } from "./studio";
export type { IStudioOpts, IStudioOpts as IPixiEngineOpts } from "./studio";

export { Log } from "./utils/log";
export { clipToJSON, jsonToClip, type ClipJSON, type ProjectJSON } from "./json-serialization";

export { fontManager } from "./utils/fonts";

export { makeEffect } from "./effect/effect";
export { VALUES_FILTER_SPECIAL, VALUES_FILTER_SPECIAL_LIMITS } from "./effect/constant";
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

export * from "./animation";
