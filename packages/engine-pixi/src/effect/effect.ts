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
import textureUrl from "../assets/texture1.png";
import textureUrl2 from "../assets/texture2.png";

export async function makeEffect({ name, renderer, values }: EffectOptions) {
  let filter: any = null;

  const specialEffects = name in VALUES_FILTER_SPECIAL;
  let options: any = {};
  if (specialEffects) {
    const FilterClass = FILTER_CLASSES[name];
    const defaults = VALUES_FILTER_SPECIAL[name as keyof FilterOptionsMap];
    options = { ...defaults, ...values };

    if (name === "colorMapFilter") {
      options.colorMap = await Assets.load(textureUrl);
    }

    if (name === "simpleLightmapFilter") {
      options.lightMap = await Assets.load(textureUrl2);
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
    render({
      width,
      height,
      canvasTexture,
      progress,
      values: runtimeValues,
    }: EffectRendererOptions) {
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

      const finalValues = { ...options, ...runtimeValues };

      if (specialEffects) {
        if (runtimeValues) {
          Object.assign(filter, finalValues);
        }
      } else if (filter.resources?.effectUniforms) {
        filter.resources.effectUniforms.uniforms.uTime = progress;
        if (runtimeValues) {
          for (const [key, val] of Object.entries(runtimeValues)) {
            if (filter.resources.effectUniforms.uniforms[key]) {
              filter.resources.effectUniforms.uniforms[key] = val;
            }
          }
        }
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
