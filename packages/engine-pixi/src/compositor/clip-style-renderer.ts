import {
  Container,
  Sprite,
  Texture,
  Graphics,
  BlurFilter,
  ColorMatrixFilter,
  UniformGroup,
  Filter,
  GlProgram,
} from "pixi.js";
import { type IClip } from "../clips";
import { parseColor, hexToRgb } from "../utils/color";
import { vertex } from "../effect/vertex";
import { CHROMA_KEY_FRAGMENT, SELECTIVE_HSL_FRAGMENT } from "../effect/glsl/custom-glsl";
import {
  applyColorAdjustmentToMatrix,
  getAllSelectiveHsl,
  hasColorAdjustment,
} from "../utils/color-adjustment";

export interface IPooledClipObjects {
  root: Container;
  mainSprite: Sprite;
  mirrors: Sprite[];
  maskGfx: Graphics | null;
  strokeGfx: Graphics | null;
  shadowGfx: Graphics | null;
}

/**
 * Applies layout transforms, mirrors, filters (blur, adjustments, chroma, hsl), and decoration styles
 * (border radius, strokes, drop shadows) to a set of PixiJS containers and sprites representing a clip.
 */
export function applyClipStylesAndFilters(opts: {
  clip: IClip;
  tex: Texture;
  rootContainer: Container;
  tempSprite: Sprite;
  pooled: IPooledClipObjects;
  scaleX: number;
  scaleY: number;
}): void {
  const { clip, tex, rootContainer, tempSprite, pooled, scaleX, scaleY } = opts;

  const style = (clip as any).style || {};
  const { renderTransform } = clip;
  const isMirrored = (renderTransform?.mirror ?? 0) > 0.5;

  const xOffset = renderTransform?.x ?? 0;
  const yOffset = renderTransform?.y ?? 0;
  const angleOffset = renderTransform?.angle ?? 0;
  const scaleMultiplier = renderTransform?.scale ?? 1;
  const scaleXMultiplier = renderTransform?.scaleX ?? 1;
  const scaleYMultiplier = renderTransform?.scaleY ?? 1;
  const opacityMultiplier = renderTransform?.opacity ?? 1;
  const blurOffset = renderTransform?.blur ?? 0;
  const brightnessMultiplier = renderTransform?.brightness ?? 1;

  const textureWidth = tex.width || 1;
  const textureHeight = tex.height || 1;

  const isCaption = (clip as any).type === "Caption";

  const baseScaleX =
    !isCaption && clip.width && clip.width !== 0 ? Math.abs(clip.width) / textureWidth : 1;
  const baseScaleY =
    !isCaption && clip.height && clip.height !== 0 ? Math.abs(clip.height) / textureHeight : 1;

  const combinedScaleX = baseScaleX * scaleMultiplier * scaleXMultiplier;
  const combinedScaleY = baseScaleY * scaleMultiplier * scaleYMultiplier;

  // Scale positions from original project dimensions to export dimensions
  rootContainer.x = (clip.center.x + xOffset) * scaleX;
  rootContainer.y = (clip.center.y + yOffset) * scaleY;
  rootContainer.rotation =
    ((clip.flip == null ? 1 : -1) * ((clip.angle + angleOffset) * Math.PI)) / 180;
  rootContainer.alpha = clip.opacity * opacityMultiplier;

  tempSprite.texture = tex;

  if (isMirrored) {
    const sX = combinedScaleX;
    const sY = combinedScaleY;
    const scaledW = textureWidth * sX;
    const scaledH = textureHeight * sY;

    tempSprite.position.set(0, 0);
    tempSprite.scale.set(sX, sY);

    const mirrorLayout: [number, number, number, number][] = [
      [scaledW, 0, -sX, sY],
      [-scaledW, 0, -sX, sY],
      [0, scaledH, sX, -sY],
      [0, -scaledH, sX, -sY],
      [scaledW, scaledH, -sX, -sY],
      [-scaledW, scaledH, -sX, -sY],
      [scaledW, -scaledH, -sX, -sY],
      [-scaledW, -scaledH, -sX, -sY],
    ];

    // Ensure we have 8 mirror sprites (create on first use, reuse after)
    while (pooled.mirrors.length < 8) {
      const ms = new Sprite();
      ms.anchor.set(0.5, 0.5);
      rootContainer.addChild(ms);
      pooled.mirrors.push(ms);
    }

    for (let i = 0; i < 8; i++) {
      const [dx, dy, sx, sy] = mirrorLayout[i];
      const ms = pooled.mirrors[i];
      ms.texture = tex;
      ms.visible = true;
      ms.position.set(dx, dy);
      ms.scale.set(sx, sy);
    }

    if (clip.flip?.x) {
      tempSprite.scale.x = -sX;
      for (let i = 0; i < 8; i++) {
        pooled.mirrors[i].scale.x = -mirrorLayout[i][2];
      }
    }
    if (clip.flip?.y) {
      tempSprite.scale.y = -sY;
      for (let i = 0; i < 8; i++) {
        pooled.mirrors[i].scale.y = -mirrorLayout[i][3];
      }
    }
  } else {
    // Hide mirror sprites if they exist
    for (const ms of pooled.mirrors) ms.visible = false;

    if (clip.flip?.x) {
      tempSprite.scale.x = -combinedScaleX;
      tempSprite.scale.y = combinedScaleY;
    } else if (clip.flip?.y) {
      tempSprite.scale.x = combinedScaleX;
      tempSprite.scale.y = -combinedScaleY;
    } else {
      tempSprite.scale.x = combinedScaleX;
      tempSprite.scale.y = combinedScaleY;
    }
  }

  // Apply Filters
  const filters: any[] = [];
  if (blurOffset > 0) {
    const blurFilter = new BlurFilter();
    blurFilter.strength = blurOffset;
    blurFilter.quality = 4;
    (blurFilter as any).repeatEdgePixels = true;
    filters.push(blurFilter);
  }

  const hasClipColorAdjustment = hasColorAdjustment((clip as any).colorAdjustment);
  if (brightnessMultiplier !== 1 || hasClipColorAdjustment) {
    const brightnessFilter = new ColorMatrixFilter();
    applyColorAdjustmentToMatrix(
      brightnessFilter,
      (clip as any).colorAdjustment,
      brightnessMultiplier,
    );
    filters.push(brightnessFilter);
  }

  const activeSelectiveHslList = getAllSelectiveHsl((clip as any).colorAdjustment);
  for (let i = 0; i < activeSelectiveHslList.length; i++) {
    const activeSelectiveHsl = activeSelectiveHslList[i];
    const hslUniforms = new UniformGroup({
      uTargetColor: { value: [1, 1, 0], type: "vec3<f32>" },
      uHueShift: { value: activeSelectiveHsl.hue, type: "f32" },
      uSatShift: { value: activeSelectiveHsl.saturation / 100, type: "f32" },
      uLightShift: { value: activeSelectiveHsl.lightness / 100, type: "f32" },
      uTolerance: { value: 0.22, type: "f32" },
      uSoftness: { value: 0.12, type: "f32" },
    });
    const rgb = hexToRgb(activeSelectiveHsl.targetColor);
    if (rgb) {
      hslUniforms.uniforms.uTargetColor[0] = rgb.r / 255;
      hslUniforms.uniforms.uTargetColor[1] = rgb.g / 255;
      hslUniforms.uniforms.uTargetColor[2] = rgb.b / 255;
    }
    const selectiveHslFilter = new Filter({
      glProgram: new GlProgram({
        vertex,
        fragment: SELECTIVE_HSL_FRAGMENT,
        name: `SelectiveHslShader_${i}`,
      }),
      resources: { hslUniforms },
    });
    filters.push(selectiveHslFilter);
  }

  if (clip.chromaKey && clip.chromaKey.enabled) {
    const chromaUniforms = new UniformGroup({
      uKeyColor: { value: [0, 1, 0], type: "vec3<f32>" },
      uSimilarity: { value: 0.1, type: "f32" },
      uSpill: { value: 0.0, type: "f32" },
    });

    const rgb = hexToRgb(clip.chromaKey.color);
    if (rgb) {
      chromaUniforms.uniforms.uKeyColor[0] = rgb.r / 255;
      chromaUniforms.uniforms.uKeyColor[1] = rgb.g / 255;
      chromaUniforms.uniforms.uKeyColor[2] = rgb.b / 255;
    }
    chromaUniforms.uniforms.uSimilarity = clip.chromaKey.similarity;
    chromaUniforms.uniforms.uSpill = clip.chromaKey.spill;

    const chromaFilter = new Filter({
      glProgram: new GlProgram({
        vertex,
        fragment: CHROMA_KEY_FRAGMENT,
        name: "ChromaKeyShader",
      }),
      resources: {
        chromaUniforms,
      },
    });
    filters.push(chromaFilter);
  }

  rootContainer.filters = filters;

  // Apply Styles (Border Radius, Stroke, Shadow)
  const borderRadius = style.borderRadius || 0;
  if (borderRadius > 0) {
    if (pooled.maskGfx == null) {
      pooled.maskGfx = new Graphics();
      tempSprite.addChild(pooled.maskGfx);
    }
    pooled.maskGfx.clear();
    pooled.maskGfx.roundRect(
      -textureWidth / 2,
      -textureHeight / 2,
      textureWidth,
      textureHeight,
      Math.min(borderRadius, textureWidth / 2, textureHeight / 2),
    );
    pooled.maskGfx.fill({ color: 0xffffff, alpha: 1 });
    tempSprite.mask = pooled.maskGfx;
  } else if (pooled.maskGfx != null) {
    tempSprite.mask = null;
  }

  const stroke = style.stroke;
  if (stroke && stroke.width > 0) {
    if (pooled.strokeGfx == null) {
      pooled.strokeGfx = new Graphics();
      tempSprite.addChild(pooled.strokeGfx);
    }
    pooled.strokeGfx.clear();
    const color = parseColor(stroke.color) ?? 0xffffff;
    let alignment = 1;
    if (stroke.alignment !== undefined) {
      if (typeof stroke.alignment === "number") {
        alignment = stroke.alignment;
      } else if (stroke.alignment === "center" || stroke.alignment === "middle") {
        alignment = 0.5;
      } else if (stroke.alignment === "inside") {
        alignment = 0;
      } else if (stroke.alignment === "outside") {
        alignment = 1;
      }
    }
    pooled.strokeGfx.setStrokeStyle({
      width: stroke.width,
      color: color,
      alignment: alignment,
    });

    if (borderRadius > 0) {
      const r = Math.min(borderRadius, textureWidth / 2, textureHeight / 2);
      pooled.strokeGfx.roundRect(
        -textureWidth / 2,
        -textureHeight / 2,
        textureWidth,
        textureHeight,
        r,
      );
    } else {
      pooled.strokeGfx.rect(-textureWidth / 2, -textureHeight / 2, textureWidth, textureHeight);
    }
    pooled.strokeGfx.stroke();
    pooled.strokeGfx.visible = true;
  } else if (pooled.strokeGfx != null) {
    pooled.strokeGfx.visible = false;
  }

  const shadow = style.shadow;
  if (shadow && (shadow.blur > 0 || (shadow.offsetX ?? 0) !== 0 || (shadow.offsetY ?? 0) !== 0)) {
    if (pooled.shadowGfx == null) {
      pooled.shadowGfx = new Graphics();
      rootContainer.addChildAt(pooled.shadowGfx, 0);
    }
    pooled.shadowGfx.clear();
    const color = parseColor(shadow.color) ?? 0x000000;
    const alpha = shadow.alpha ?? 0.5;
    const dx = shadow.offsetX ?? 0;
    const dy = shadow.offsetY ?? 0;

    if (borderRadius > 0) {
      const r = Math.min(borderRadius, textureWidth / 2, textureHeight / 2);
      pooled.shadowGfx.roundRect(
        -textureWidth / 2 + dx,
        -textureHeight / 2 + dy,
        textureWidth,
        textureHeight,
        r,
      );
    } else {
      pooled.shadowGfx.rect(
        -textureWidth / 2 + dx,
        -textureHeight / 2 + dy,
        textureWidth,
        textureHeight,
      );
    }
    pooled.shadowGfx.fill({ color, alpha });
    pooled.shadowGfx.visible = true;
  } else if (pooled.shadowGfx != null) {
    pooled.shadowGfx.visible = false;
  }
}
