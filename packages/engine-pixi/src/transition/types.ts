import type { Renderer, Texture } from 'pixi.js';
import { TransitionKey } from './glsl/gl-transition';

export interface TransitionOptions {
  name: TransitionKey;
  renderer: Renderer;
}

export interface TransitionRendererOptions {
  from: VideoFrame | Texture;
  to: VideoFrame | Texture;
  progress: number;
  width: number;
  height: number;
}

export interface GLTransition {
  author?: string;
  createdAt?: string;
  glsl?: string; // from gl-transitions library
  fragment?: string; // from local definitions
  license?: string;
  name: string; // broadened from TransitionKey to string to allow matching any name
  updatedAt?: string;
  defaultParams?: Record<string, any>;
  paramsTypes?: Record<string, any>;
  label?: string;
  uniforms?: Record<string, { value: any; type: string }>; // for local definitions
}
