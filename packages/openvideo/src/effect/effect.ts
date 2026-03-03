import {
  Assets,
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
import { FILTER_CLASSES, VALUES_FILTER_SPECIAL } from "./constant";
import type { FilterOptionsMap } from "./interface";

export async function makeEffect({ name, renderer, values }: EffectOptions) {
  let filter: any = null;

  const specialEffects = name in VALUES_FILTER_SPECIAL;
  if (specialEffects) {
    const FilterClass = FILTER_CLASSES[name];
    const defaults = VALUES_FILTER_SPECIAL[name as keyof FilterOptionsMap];
    const options = { ...defaults, ...values };

    if (name === "colorMapFilter") {
      options.colorMap = await Assets.load("texture1.png");
    }

    if (name === "simpleLightmapFilter") {
      options.lightMap = await Assets.load("texture2.png");
    }

    filter = new FilterClass(options);
  } else {
    const effects = getAllEffects();
    const localKey = Object.keys(effects).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    ) as string | undefined;

    if (!localKey) {
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

    const { fragment, uniforms, label } = effects[localKey];
    const program = new GlProgram({
      vertex,
      fragment,
      name: `${label}-shader`,
    });

    const effectUniforms = new UniformGroup({
      uTime: { value: 0, type: "f32" },
      ...uniforms,
    });

    filter = new Filter({
      glProgram: program,
      resources: { effectUniforms },
    });
  }

  const effectSprite = new Sprite();
  const effectTexture = RenderTexture.create({
    width: renderer.width,
    height: renderer.height,
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

      if (!specialEffects && filter.resources?.effectUniforms) {
        filter.resources.effectUniforms.uniforms.uTime = progress;
      }

      renderer.render({
        container: effectSprite,
        target: effectTexture,
        clear: true,
      });

      return effectTexture;
    },
  };
}
