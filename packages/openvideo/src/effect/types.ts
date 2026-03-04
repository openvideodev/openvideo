import type { Renderer, RenderTexture } from "pixi.js";
import { EffectKey } from "./glsl/gl-effect";

export interface EffectOptions {
  name: EffectKey;
  renderer: Renderer;
  values?: Record<string, any>;
}

export interface EffectRendererOptions {
  canvasTexture:
    | HTMLCanvasElement
    | ImageBitmap
    | HTMLImageElement
    | HTMLVideoElement
    | RenderTexture;
  progress: number;
  width: number;
  height: number;
  values?: Record<string, any>;
}

export interface GLEffect {
  author?: string;
  createdAt?: string;
  glsl: string;
  license?: string;
  name: EffectKey;
  updatedAt?: string;
  defaultParams?: any;
  paramsTypes?: any;
  fragment?: string;
  label?: string;
}
