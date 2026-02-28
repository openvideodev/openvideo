import {
  Filter,
  GlProgram,
  Sprite,
  Texture,
  RenderTexture,
  UniformGroup,
} from "pixi.js";

import type { EffectOptions, EffectRendererOptions } from "./types";
import { vertex } from "./vertex";
import { getAllEffects } from "./glsl/gl-effect";

export function makeEffect({ name, renderer }: EffectOptions) {
  console.log("makeEffect", name);
  let effect: undefined | any = undefined;
  const effects = getAllEffects();
  const localKey = Object.keys(effects).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  ) as string | undefined;
  if (localKey) {
    effect = effects[localKey] as any;
  }

  if (!effect) {
    console.warn(`Effect ${name} not found`);
    return {
      filter: null,
      render({ canvasTexture }: EffectRendererOptions) {
        return canvasTexture instanceof RenderTexture
          ? canvasTexture
          : Texture.from(canvasTexture as HTMLCanvasElement);
      },
    };
  }

  const { fragment, uniforms, label } = effect;
  const effectSprite = new Sprite();

  const effectTexture = RenderTexture.create({
    width: renderer.width,
    height: renderer.height,
  });

  const program = new GlProgram({
    vertex,
    fragment,
    name: `${label}-shader`,
  });

  const effectUniforms = new UniformGroup({
    uTime: { value: 0, type: "f32" },
    ...uniforms,
  });

  const filter = new Filter({
    glProgram: program,
    resources: {
      effectUniforms,
    },
  });

  effectSprite.filters = [filter];

  return {
    filter,
    render({ width, height, canvasTexture, progress }: EffectRendererOptions) {
      if (effectTexture.width !== width || effectTexture.height !== height) {
        effectTexture.resize(width, height);
      }

      const tex =
        canvasTexture instanceof RenderTexture
          ? canvasTexture
          : Texture.from(canvasTexture as HTMLCanvasElement);

      effectSprite.texture = tex;
      effectSprite.width = width;
      effectSprite.height = height;

      effectUniforms.uniforms.uTime = progress;

      renderer.render({
        container: effectSprite,
        target: effectTexture,
        clear: true,
      });

      return effectTexture;
    },
  };
}
