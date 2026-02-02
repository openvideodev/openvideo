import transitions from "gl-transitions";
import {
  Filter,
  GlProgram,
  Sprite,
  Texture,
  ImageSource,
  RenderTexture,
} from "pixi.js";

import { vertex } from "./vertex";
import { uniforms } from "./uniforms";
import { fragment } from "./fragment";

import { GL_TRANSITIONS } from "./glsl/gl-transition";
import type {
  GLTransition,
  TransitionOptions,
  TransitionRendererOptions,
} from "./types";
import {
  BOW_TIE_HORIZONTAL_FRAGMENT,
  CANNABISLEAF_FRAGMENT,
  CANNABISLEAF_UNIFORMS,
  CIRCLE_FRAGMENT,
  CIRCLEOPEN_FRAGMENT,
  CIRCLEOPEN_UNIFORMS,
  CRAZY_PARAMETRIC_FUN_FRAGMENT,
  CRAZY_PARAMETRIC_FUN_UNIFORMS,
  CROSSHATCH_FRAGMENT,
  CROSSHATCH_UNIFORMS,
  CROSSZOOM_FRAGMENT,
  CROSSZOOM_UNIFORMS,
  DIRECTIONAL_FRAGMENT,
  DIRECTIONAL_UNIFORMS,
  DIRECTIONALWARP_FRAGMENT,
  DIRECTIONALWARP_UNIFORMS,
  DIRECTIONALWIPE_FRAGMENT,
  DIRECTIONALWIPE_UNIFORMS,
  DISPLACEMENT_FRAGMENT,
  DISPLACEMENT_UNIFORMS,
  GLITCH_DISPLACE_FRAGMENT,
  GRIDFLIP_FRAGMENT,
  GRIDFLIP_UNIFORMS,
  HEART_FRAGMENT,
  HEART_UNIFORMS,
  HEXAGONALIZE_FRAGMENT,
  HEXAGONALIZE_UNIFORMS,
  LUMA_FRAGMENT,
  LUMA_UNIFORMS,
  LUMINANCE_MELT_FRAGMENT,
  LUMINANCE_MELT_UNIFORMS,
  PERLIN_FRAGMENT,
  PERLIN_UNIFORMS,
  PIXELIZE_FRAGMENT,
  PIXELIZE_UNIFORMS,
  POLAR_FUNCTION_FRAGMENT,
  POLAR_FUNCTION_UNIFORMS,
  POLKA_DOTS_CURTAIN_FRAGMENT,
  RANDOMSQUARES_FRAGMENT,
  RANDOMSQUARES_UNIFORMS,
  ROTATE_SCALE_FADE_FRAGMENT,
  ROTATE_SCALE_FADE_UNIFORMS,
  SQUARESWIRE_FRAGMENT,
  SQUARESWIRE_UNIFORMS,
  STEREOVIEWER_FRAGMENT,
  STEREOVIEWER_UNIFORMS,
  UNDULATING_BURN_OUT_FRAGMENT,
  UNDULATING_BURN_OUT_UNIFORMS,
} from "./glsl/custom-glsl";
import {
  PIXELATE_FRAGMENT,
  PIXELATE_UNIFORMS,
} from "../effect/glsl/custom-glsl";

export function makeTransition({ name, renderer }: TransitionOptions) {
  let transition: GLTransition | undefined = transitions.find(
    (t: GLTransition) => t.name === name,
  );

  if (!transition) {
    const localKey = Object.keys(GL_TRANSITIONS).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    ) as keyof typeof GL_TRANSITIONS | undefined;
    if (localKey) {
      transition = GL_TRANSITIONS[localKey] as unknown as GLTransition;
    }
  }

  if (!transition) {
    transition = transitions.find(
      (t: GLTransition) => t.name.toLowerCase() === name.toLowerCase(),
    );
  }

  if (!transition) {
    const variants = [
      name,
      name.toLowerCase(),
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      name
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, ""),
      name.replace(/_/g, ""),
    ];

    for (const variant of variants) {
      transition = transitions.find(
        (t: GLTransition) => t.name.toLowerCase() === variant.toLowerCase(),
      );
      if (transition) break;

      // Also check local definitions with variants
      const localKey = Object.keys(GL_TRANSITIONS).find(
        (key) => key.toLowerCase() === variant.toLowerCase(),
      ) as keyof typeof GL_TRANSITIONS | undefined;
      if (localKey) {
        transition = GL_TRANSITIONS[localKey] as unknown as GLTransition;
        break;
      }
    }
  }

  if (!transition) {
    const availableCount = transitions.length;
    const availableNames = transitions
      .slice(0, 5)
      .map((t: GLTransition) => t.name)
      .join(", ");
    const localNames = Object.keys(GL_TRANSITIONS).slice(0, 3).join(", ");
    console.error(
      `Transition not found: "${name}". Available in gl-transitions (${availableCount} total):`,
      availableNames + "...",
    );
    console.error(`Available locally:`, localNames + "...");
    throw new Error(
      `Transition "${name}" not found in gl-transitions library or local definitions`,
    );
  }

  const transitionSprite = new Sprite(Texture.WHITE);
  const transitionTexture = RenderTexture.create({
    width: renderer.width,
    height: renderer.height,
  });
  const sourceFrom = new ImageSource({});
  const sourceTo = new ImageSource({});
  const isDisplacementTransition =
    transition.name === "displacement" ||
    name.toLowerCase() === "displacement" ||
    transition.label === "displacement";

  const sourceDisplacement = isDisplacementTransition
    ? new ImageSource({})
    : undefined;
  let defaultDisplacementTexture: HTMLCanvasElement | null = null;

  if (isDisplacementTransition) {
    defaultDisplacementTexture = document.createElement("canvas");
    defaultDisplacementTexture.width = 256;
    defaultDisplacementTexture.height = 256;
    const ctx = defaultDisplacementTexture.getContext("2d");
    if (ctx) {
      const imageData = ctx.createImageData(256, 256);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random();
        imageData.data[i] = noise * 255; // R
        imageData.data[i + 1] = noise * 255; // G
        imageData.data[i + 2] = noise * 255; // B
        imageData.data[i + 3] = 255; // A
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  let transitionGlsl = transition.glsl || transition.fragment;

  if (!transitionGlsl) {
    throw new Error(`Transition "${name}" has no glsl or fragment code`);
  }

  let transitionUniforms: Record<string, { value: any; type: string }> = {
    ...uniforms.basics,
    ...uniforms.custom(transition),
  };

  Object.entries(transitionUniforms).forEach(([, uniform]) => {
    if (uniform.type === "int<f32>") {
      uniform.type = "i32";

      if (typeof uniform.value === "number") {
        uniform.value = Math.trunc(uniform.value);
      }
    }
    if (uniform.type === "ivec2<f32>") {
      uniform.type = "vec2<f32>";
    }
  });

  const transitionGridFlip =
    transition.name === "GridFlip" ||
    name.toLowerCase() === "gridflip" ||
    transition.label === "gridflip";

  const transitionCircle =
    transition.name === "circle" ||
    name.toLowerCase() === "circle" ||
    transition.label === "circle";

  const transitionDirectional =
    transition.name === "directional" ||
    name.toLowerCase() === "directional" ||
    transition.label === "directional";

  const transitionUndulatingBurnOut =
    transition.name === "UndulatingBurnOut" ||
    name.toLowerCase() === "undulatingburnout" ||
    transition.label === "undulatingBurnOut";

  const transitionSquaresWire =
    transition.name === "SquaresWire" ||
    name.toLowerCase() === "squareswire" ||
    transition.label === "squaresWire";

  const transitionRotateScaleFade =
    transition.name === "rotate_scale_fade" ||
    name.toLowerCase() === "rotatescalefade" ||
    transition.label === "rotateScaleFade";

  const transitionRandomSquares =
    transition.name === "RandomSquares" ||
    name.toLowerCase() === "randomsquares" ||
    transition.label === "randomSquares";

  const transitionPolarFunction =
    transition.name === "polar_function" ||
    name.toLowerCase() === "polar_function" ||
    transition.label === "polar_function";

  const transitionPixelate =
    transition.name === "pixelate" ||
    name.toLowerCase() === "pixelate" ||
    transition.label === "pixelate";

  const transitionPerlin =
    transition.name === "perlin" ||
    name.toLowerCase() === "perlin" ||
    transition.label === "perlin";

  const transitionLuma =
    transition.name === "luma" ||
    name.toLowerCase() === "luma" ||
    transition.label === "luma";

  const transitionLuminanceMelt =
    transition.name === "luminance_melt" ||
    name.toLowerCase() === "luminance_melt" ||
    name.toLowerCase() === "luminancemelt" ||
    transition.label === "luminance_melt";

  const transitionHexagonalize =
    transition.name === "hexagonalize" ||
    name.toLowerCase() === "hexagonalize" ||
    transition.label === "hexagonalize";

  const transitionHeart =
    transition.name === "heart" ||
    name.toLowerCase() === "heart" ||
    transition.label === "heart";

  const transitionDisplacement =
    transition.name === "displacement" ||
    name.toLowerCase() === "displacement" ||
    transition.label === "displacement";

  const transitionDirectionalWipe =
    transition.name === "directionalwipe" ||
    name.toLowerCase() === "directionalwipe" ||
    name.toLowerCase() === "directional_wipe" ||
    transition.label === "directionalwipe";

  const transitionDirectionalWarp =
    transition.name === "directionalwarp" ||
    name.toLowerCase() === "directionalwarp" ||
    name.toLowerCase() === "directional_warp" ||
    transition.label === "directionalwarp";

  const transitionCrosshatch =
    transition.name === "crosshatch" ||
    name.toLowerCase() === "crosshatch" ||
    transition.label === "crosshatch";

  const transitionCircleOpen =
    transition.name === "circleopen" ||
    name.toLowerCase() === "circleopen" ||
    name.toLowerCase() === "circle_open" ||
    transition.label === "circleopen";

  const transitionCannabisLeaf =
    transition.name === "cannabisleaf" ||
    name.toLowerCase() === "cannabisleaf" ||
    name.toLowerCase() === "cannabis_leaf" ||
    transition.label === "cannabisleaf";

  const transitionStereoViewer =
    transition.name === "StereoViewer" ||
    name.toLowerCase() === "stereoviewer" ||
    name.toLowerCase() === "stereo_viewer" ||
    transition.label === "StereoViewer";

  const transitionGlitchDisplace =
    transition.name === "GlitchDisplace" ||
    name.toLowerCase() === "glitchDisplace" ||
    transition.label === "GlitchDisplace";

  const transitionCrossZoom =
    transition.name === "CrossZoom" ||
    name.toLowerCase() === "crosszoom" ||
    transition.label === "CrossZoom";

  const transitionCrazyParametricFun =
    transition.name === "CrazyParametricFun" ||
    name.toLowerCase() === "crazyparametricfun" ||
    transition.label === "CrazyParametricFun";

  const transitionBowTieHorizontal =
    transition.name === "BowTieHorizontal" ||
    name.toLowerCase() === "bowtiehorizontal" ||
    transition.label === "BowTieHorizontal";

  const transitionPolkaDotsCurtain =
    transition.name === "PolkaDotsCurtain" ||
    name.toLowerCase() === "polkadotscurtain" ||
    transition.label === "PolkaDotsCurtain";

  const transitionPixelize =
    transition.name === "Pixelize" ||
    name.toLowerCase() === "pixelize" ||
    transition.label === "Pixelize";

  if (transitionGridFlip) {
    transitionGlsl = GRIDFLIP_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...GRIDFLIP_UNIFORMS,
    };
  }

  if (transitionCircle) {
    transitionGlsl = CIRCLE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CIRCLEOPEN_UNIFORMS,
    };
  }
  if (transitionDirectional) {
    transitionGlsl = DIRECTIONAL_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...DIRECTIONAL_UNIFORMS,
    };
  }
  if (transitionUndulatingBurnOut) {
    transitionGlsl = UNDULATING_BURN_OUT_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...UNDULATING_BURN_OUT_UNIFORMS,
    };
  }
  if (transitionSquaresWire) {
    transitionGlsl = SQUARESWIRE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...SQUARESWIRE_UNIFORMS,
    };
  }
  if (transitionRotateScaleFade) {
    transitionGlsl = ROTATE_SCALE_FADE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...ROTATE_SCALE_FADE_UNIFORMS,
    };
  }
  if (transitionRandomSquares) {
    transitionGlsl = RANDOMSQUARES_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...RANDOMSQUARES_UNIFORMS,
    };
  }
  if (transitionPolarFunction) {
    transitionGlsl = POLAR_FUNCTION_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...POLAR_FUNCTION_UNIFORMS,
    };
  }

  if (transitionPixelate) {
    transitionGlsl = PIXELATE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...PIXELATE_UNIFORMS,
    };
  }

  if (transitionPerlin) {
    transitionGlsl = PERLIN_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...PERLIN_UNIFORMS,
    };
  }

  if (transitionLuma) {
    transitionGlsl = LUMA_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...LUMA_UNIFORMS,
    };
  }

  if (transitionLuminanceMelt) {
    transitionGlsl = LUMINANCE_MELT_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...LUMINANCE_MELT_UNIFORMS,
    };
  }

  if (transitionHexagonalize) {
    transitionGlsl = HEXAGONALIZE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...HEXAGONALIZE_UNIFORMS,
    };
  }

  if (transitionHeart) {
    transitionGlsl = HEART_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...HEART_UNIFORMS,
    };
  }

  if (transitionDisplacement) {
    transitionGlsl = DISPLACEMENT_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...DISPLACEMENT_UNIFORMS,
    };
  }

  if (transitionDirectionalWipe) {
    transitionGlsl = DIRECTIONALWIPE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...DIRECTIONALWIPE_UNIFORMS,
    };
  }

  if (transitionDirectionalWarp) {
    transitionGlsl = DIRECTIONALWARP_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...DIRECTIONALWARP_UNIFORMS,
    };
  }

  if (transitionCrosshatch) {
    transitionGlsl = CROSSHATCH_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CROSSHATCH_UNIFORMS,
    };
  }

  if (transitionCircleOpen) {
    transitionGlsl = CIRCLEOPEN_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CIRCLEOPEN_UNIFORMS,
    };
  }

  if (transitionCannabisLeaf) {
    transitionGlsl = CANNABISLEAF_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CANNABISLEAF_UNIFORMS,
    };
  }

  if (transitionStereoViewer) {
    transitionGlsl = STEREOVIEWER_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...STEREOVIEWER_UNIFORMS,
    };
  }

  if (transitionGlitchDisplace) {
    transitionGlsl = GLITCH_DISPLACE_FRAGMENT;
  }

  if (transitionCrossZoom) {
    transitionGlsl = CROSSZOOM_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CROSSZOOM_UNIFORMS,
    };
  }

  if (transitionCrazyParametricFun) {
    transitionGlsl = CRAZY_PARAMETRIC_FUN_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...CRAZY_PARAMETRIC_FUN_UNIFORMS,
    };
  }
  if (transitionBowTieHorizontal) {
    transitionGlsl = BOW_TIE_HORIZONTAL_FRAGMENT;
  }
  if (transitionPolkaDotsCurtain) {
    transitionGlsl = POLKA_DOTS_CURTAIN_FRAGMENT;
  }
  if (transitionPixelize) {
    transitionGlsl = PIXELIZE_FRAGMENT;
    transitionUniforms = {
      ...uniforms.basics,
      ...PIXELIZE_UNIFORMS,
    };
  }
  // Prepare resources
  const filterResources: any = {
    from: sourceFrom,
    to: sourceTo,
    uniforms: transitionUniforms,
  };

  // Add displacement map texture as resource for displacement transition
  if (isDisplacementTransition && sourceDisplacement) {
    filterResources.displacementMap = sourceDisplacement;
    // Set default displacement texture
    if (defaultDisplacementTexture) {
      sourceDisplacement.resource = defaultDisplacementTexture;
      sourceDisplacement.update();
    }
  }

  const filter = new Filter({
    glProgram: new GlProgram({
      vertex,
      fragment: fragment(transitionGlsl),
    }),
    resources: filterResources,
  });

  transitionSprite.filters = [filter];

  return {
    render({ width, height, from, to, progress }: TransitionRendererOptions) {
      if (
        transitionSprite.width !== width ||
        transitionSprite.height !== height
      ) {
        transitionSprite.setSize({ width, height });
        transitionTexture.resize(width, height);
      }

      if (from instanceof Texture) {
        filter.resources.from = from.source;
      } else {
        sourceFrom.resource = from;
        sourceFrom.update();
        filter.resources.from = sourceFrom;
      }

      if (to instanceof Texture) {
        filter.resources.to = to.source;
      } else {
        sourceTo.resource = to;
        sourceTo.update();
        filter.resources.to = sourceTo;
      }

      // Update displacement texture if it exists (resize default texture if needed)
      if (
        isDisplacementTransition &&
        sourceDisplacement &&
        defaultDisplacementTexture
      ) {
        if (
          defaultDisplacementTexture.width !== width ||
          defaultDisplacementTexture.height !== height
        ) {
          defaultDisplacementTexture.width = width;
          defaultDisplacementTexture.height = height;
          const ctx = defaultDisplacementTexture.getContext("2d");
          if (ctx) {
            // Create a simple noise pattern for displacement
            const imageData = ctx.createImageData(width, height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              const noise = Math.random();
              imageData.data[i] = noise * 255; // R
              imageData.data[i + 1] = noise * 255; // G
              imageData.data[i + 2] = noise * 255; // B
              imageData.data[i + 3] = 255; // A
            }
            ctx.putImageData(imageData, 0, 0);
          }
        }
        sourceDisplacement.resource = defaultDisplacementTexture;
        sourceDisplacement.update();
      }

      filter.resources.uniforms.uniforms.progress = progress;

      renderer.render({
        container: transitionSprite,
        target: transitionTexture,
        clear: true,
        width,
        height,
      });

      return transitionTexture;
    },
    destroy() {
      transitionTexture.destroy();
      transitionSprite.destroy({ children: true });
    },
  };
}
