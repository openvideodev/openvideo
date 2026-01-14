export { fastConcatMP4, fixFMP4Duration, mixinMP4AndAudio } from './mp4-utils';
export { createChromakey } from './utils/chromakey';
export { renderTxt2ImgBitmap } from './utils/dom';

export {
  AudioClip,
  CaptionClip,
  ImageClip,
  VideoClip,
  TextClip,
  EffectClip,
  TransitionClip,
  PlaceholderClip,
} from './clips';
export type { ITextClipOpts } from './clips';
export type { IClip, IMP4ClipOpts } from './clips';
// Keep MP4Clip as alias for backward compatibility
export { VideoClip as MP4Clip } from './clips';
export { Compositor } from './compositor';
export type { ICompositorOpts } from './compositor';
export { Studio } from './studio';
export type { IStudioOpts } from './studio';

export { Log } from './utils/log';
export {
  clipToJSON,
  jsonToClip,
  type ClipJSON,
  type ProjectJSON,
} from './json-serialization';

export { fontManager } from './utils/fonts';

// Effects
export { makeEffect } from './effect/effect';
export type { EffectKey } from './effect/glsl/gl-effect';
export { GL_EFFECT_OPTIONS } from './effect/glsl/gl-effect';

// Transitions
export { makeTransition } from './transition/transition';
export type { TransitionKey } from './transition/glsl/gl-transition';
export { GL_TRANSITION_OPTIONS } from './transition/glsl/gl-transition';
