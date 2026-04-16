import {
  Application,
  Sprite,
  Texture,
  Container,
  Graphics,
  BlurFilter,
  ColorMatrixFilter,
  Filter,
  GlProgram,
  UniformGroup,
} from "pixi.js";
import { ZoomBlurFilter } from "pixi-filters";

import type { IClip } from "../clips/iclip";
import { parseColor, hexToRgb } from "../utils/color";
import {
  CHROMA_KEY_FRAGMENT,
  SELECTIVE_HSL_FRAGMENT,
} from "../effect/glsl/custom-glsl";
import { vertex } from "../effect/vertex";
import {
  applyColorAdjustmentToMatrix,
  getAllSelectiveHsl,
  hasColorAdjustment,
} from "../utils/color-adjustment";

/**
 * Update sprite transform based on clip properties
 * Utility function for updating standalone sprites (e.g., video sprites from HTMLVideoElement)
 * For sprites managed by PixiSpriteRenderer, use renderer.updateTransforms() instead
 */
export function updateSpriteTransform(clip: IClip, sprite: Sprite): void {
  const { opacity, zIndex, flip, left, top, width, height, angle } = clip;

  // Position and size
  sprite.x = left;
  sprite.y = top;
  sprite.width = Math.abs(width);
  sprite.height = Math.abs(height);

  // Rotation (angle property)
  sprite.angle = angle;

  // Opacity
  sprite.alpha = opacity;

  // Z-index
  sprite.zIndex = zIndex;

  // Flip
  if (flip === "horizontal") {
    sprite.scale.x = -Math.abs(sprite.scale.x);
  } else if (flip === "vertical") {
    sprite.scale.y = -Math.abs(sprite.scale.y);
  }
}

/**
 * Renders video frames using Pixi.js
 * Uses a canvas-based approach: draws frames to a canvas and creates texture from it
 * This matches the pattern used in other video rendering libraries
 */
export class PixiSpriteRenderer {
  private pixiSprite: Sprite | null = null;
  private mirrorSprites: Sprite[] = [];
  private mirrorContainer: Container | null = null;
  private isMirrorActive = false;
  private texture: Texture | null = null;
  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;
  private root: Container | null = null;
  private strokeGraphics: Graphics | null = null;
  private maskGraphics: Graphics | null = null;
  private shadowGraphics: Graphics | null = null;
  private shadowContainer: Container | null = null;
  private animationContainer: Container | null = null;
  private resolution = 1;
  private destroyed = false;

  constructor(
    _pixiApp: Application | null,
    private sprite: IClip,
    private targetContainer: Container | null = null,
  ) {
    // If targetContainer is not provided, try to use pixiApp.stage (fallback/legacy)
    if (!targetContainer && _pixiApp) {
      this.targetContainer = _pixiApp.stage;
    }

    // Capture resolution from renderer to normalize filters
    this.resolution = _pixiApp?.renderer?.resolution ?? 1;

    // Create a canvas for drawing video frames
    // We'll initialize it when we get the first frame
    this.canvas = new OffscreenCanvas(1, 1);
    const ctx = this.canvas.getContext("2d");
    if (ctx == null) {
      throw new Error("Failed to create 2d context for PixiSpriteRenderer");
    }
    this.context = ctx;

    // Initialize Root Container immediately
    this.root = new Container();
    this.root.label = "RootContainer";
    this.root.visible = false; // Hidden until first frame

    // Initialize Animation Container (isolation layer for animations)
    this.animationContainer = new Container();
    this.animationContainer.label = "AnimationContainer";
    this.root.addChild(this.animationContainer);

    // If we have a target container, add root to it
    if (this.targetContainer) {
      this.targetContainer.addChild(this.root);
    }
  }

  /**
   * Update the sprite with a new video frame or Texture
   * @param frame ImageBitmap, Texture, or null to render
   *              (VideoFrames are converted to ImageBitmap in getFrame)
   */
  async updateFrame(frame: ImageBitmap | Texture | null): Promise<void> {
    if (this.destroyed) return;

    if (frame == null) {
      // Hide sprite if no frame, but still apply transforms in case animation is running
      if (this.root != null) {
        this.root.visible = false;
        this.applySpriteTransforms();
      }
      return;
    }

    // Optimized path: If frame is already a Texture, use it directly
    // Duck typing: Check for Texture-like object (has source property) to avoid instanceof issues
    // This is critical because sometimes RenderTexture instance checks fail across module boundaries
    const isTexture =
      frame instanceof Texture ||
      (frame && typeof (frame as any).source !== "undefined");

    if (isTexture) {
      // Validate texture dimensions
      if (frame.width === 0 || frame.height === 0) {
        console.warn(
          "PixiSpriteRenderer: Texture has zero dimensions",
          frame.width,
          frame.height,
        );
        return;
      }

      if (this.pixiSprite == null) {
        this.pixiSprite = new Sprite(frame as Texture);
        this.pixiSprite.label = "MainSprite";
        // Add to animationContainer instead of root directly
        this.animationContainer!.addChild(this.pixiSprite);
        this.applySpriteTransforms();
      } else {
        this.pixiSprite.texture = frame as Texture;
      }

      if (this.root != null) {
        this.root.visible = true;
        this.applySpriteTransforms();
      }
      return;
    }

    // Traditional path: ImageBitmap → Canvas → Texture
    // Validate frame dimensions
    // Safe access to width/height and ensure they are numbers
    const width = (frame as any).width;
    const height = (frame as any).height;

    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      width <= 0 ||
      height <= 0
    ) {
      console.warn(
        "PixiSpriteRenderer: Invalid frame dimensions",
        width,
        height,
      );
      return;
    }

    // Initialize texture and sprite on first frame if not already created
    const isFirstFrame = this.texture == null || this.pixiSprite == null;

    // Update canvas size using integers to prevent "Value is not of type unsigned long" errors
    const intWidth = Math.floor(width);
    const intHeight = Math.floor(height);

    const needsResize =
      this.canvas.width !== intWidth || this.canvas.height !== intHeight;

    if (needsResize || isFirstFrame) {
      this.canvas.width = intWidth;
      this.canvas.height = intHeight;

      if (this.texture != null) {
        this.texture.destroy(true);
        this.texture = null;
      }

      // Create new texture from the canvas
      this.texture = Texture.from(this.canvas as any);

      // Validate texture was created successfully
      // Use Texture.source instead of baseTexture (PixiJS v8.0.0+)
      if (!this.texture || !this.texture.source) {
        console.error("PixiSpriteRenderer: Failed to create valid texture");
        return;
      }

      if (this.pixiSprite == null) {
        this.pixiSprite = new Sprite(this.texture);
        this.pixiSprite.label = "MainSprite";
        this.animationContainer!.addChild(this.pixiSprite);
        this.applySpriteTransforms();
      } else {
        this.pixiSprite.texture = this.texture;
      }
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(frame, 0, 0);

    if (this.texture != null && this.texture.source != null) {
      const source = this.texture.source;
      // Update the source to reflect the canvas changes
      // In Pixi.js v8, we need to call update() on the source
      if (source.resource) {
        const resource = source.resource as any;
        if (resource.update) {
          resource.update();
        }
      }

      if (typeof source.update === "function") {
        source.update();
      }
    }

    if (this.root != null) {
      this.root.visible = true;
      this.applySpriteTransforms();
    }
  }

  /**
   * Apply sprite transformations to the Pixi Sprite
   */
  private applySpriteTransforms(): void {
    if (this.pixiSprite == null || this.root == null || this.destroyed) return;

    const {
      flip,
      center,
      width,
      height,
      angle,
      opacity,
      zIndex,
      renderTransform,
    } = this.sprite;

    const xOffset = renderTransform?.x ?? 0;
    const yOffset = renderTransform?.y ?? 0;
    const angleOffset = renderTransform?.angle ?? 0;
    const scaleMultiplier = renderTransform?.scale ?? 1;
    const scaleXMultiplier = renderTransform?.scaleX ?? 1;
    const scaleYMultiplier = renderTransform?.scaleY ?? 1;
    const opacityMultiplier = renderTransform?.opacity ?? 1;
    const blurOffset = renderTransform?.blur ?? 0;
    const motionBlurOffset = renderTransform?.motionBlur ?? 0;
    const brightnessMultiplier = renderTransform?.brightness ?? 1;
    const isMirrored = (renderTransform?.mirror ?? 0) > 0.5;

    // 1. Root container stays at the stable "Anchor" position
    // This ensures the wireframe/transformer remains stationary during animation
    this.root.x = center.x;
    this.root.y = center.y;
    this.root.angle = (flip == null ? 1 : -1) * angle;
    this.root.alpha = opacity;
    this.root.zIndex = zIndex;
    this.root.scale.set(1, 1);

    // 2. Apply animation transforms to the internal animationContainer
    if (this.animationContainer) {
      this.animationContainer.x = xOffset;
      this.animationContainer.y = yOffset;
      this.animationContainer.angle = (flip == null ? 1 : -1) * angleOffset;
      this.animationContainer.alpha = opacityMultiplier;
      this.animationContainer.scale.set(
        scaleMultiplier * scaleXMultiplier,
        scaleMultiplier * scaleYMultiplier,
      );
      this.applyBlur(blurOffset);
      this.applyMotionBlur(motionBlurOffset);
      this.applyBrightness(brightnessMultiplier);
      this.applySelectiveHsl();
      this.applyChromaKey();
    }

    // 3. Handle true reflection mirroring
    this.pixiSprite.anchor.set(0.5, 0.5);
    this.pixiSprite.position.set(0, 0);

    const textureWidth = this.pixiSprite.texture?.width ?? 1;
    const textureHeight = this.pixiSprite.texture?.height ?? 1;

    const isCaption = (this.sprite as any).type === "Caption";

    // Base scale to fit texture into clip dimensions
    const baseScaleX =
      !isCaption && width && width !== 0 ? Math.abs(width) / textureWidth : 1;
    const baseScaleY =
      !isCaption && height && height !== 0
        ? Math.abs(height) / textureHeight
        : 1;

    if (isMirrored) {
      // Create mirror container if it doesn't exist
      if (!this.isMirrorActive) {
        this.isMirrorActive = true;

        // Create a container to hold the original and all mirrored sprites
        this.mirrorContainer = new Container();
        this.mirrorContainer.label = "MirrorContainer";

        // Move the main sprite into the mirror container
        if (this.animationContainer) {
          const idx = this.animationContainer.getChildIndex(this.pixiSprite);
          this.animationContainer.removeChild(this.pixiSprite);
          this.mirrorContainer.addChild(this.pixiSprite);
          this.animationContainer.addChildAt(this.mirrorContainer, idx);
        }

        // Create 8 mirror sprites for all directions:
        // right, left, bottom, top, bottom-right, bottom-left, top-right, top-left
        this.mirrorSprites = [];
        for (let i = 0; i < 8; i++) {
          const ms = new Sprite(this.pixiSprite.texture);
          ms.label = `MirrorSprite_${i}`;
          ms.anchor.set(0.5, 0.5);
          this.mirrorContainer.addChild(ms);
          this.mirrorSprites.push(ms);
        }
      }

      // Update mirror sprite textures to match main sprite
      for (const ms of this.mirrorSprites) {
        ms.texture = this.pixiSprite.texture;
      }

      const scaledW = textureWidth * baseScaleX;
      const scaledH = textureHeight * baseScaleY;

      // Original sprite stays at its normal position (0,0)
      this.pixiSprite.position.set(0, 0);
      this.pixiSprite.scale.set(baseScaleX, baseScaleY);

      // Mirror layout: [dx, dy, scaleX, scaleY]
      // We flip horizontally for sides, vertically for top/bottom, and both for corners
      const mirrors: [number, number, number, number][] = [
        [scaledW, 0, -baseScaleX, baseScaleY], // right
        [-scaledW, 0, -baseScaleX, baseScaleY], // left
        [0, scaledH, baseScaleX, -baseScaleY], // bottom
        [0, -scaledH, baseScaleX, -baseScaleY], // top
        [scaledW, scaledH, -baseScaleX, -baseScaleY], // bottom-right
        [-scaledW, scaledH, -baseScaleX, -baseScaleY], // bottom-left
        [scaledW, -scaledH, -baseScaleX, -baseScaleY], // top-right
        [-scaledW, -scaledH, -baseScaleX, -baseScaleY], // top-left
      ];

      for (let i = 0; i < 8; i++) {
        const [dx, dy, sx, sy] = mirrors[i];
        this.mirrorSprites[i].position.set(dx, dy);
        this.mirrorSprites[i].scale.set(sx, sy);
      }

      // Apply flip to the whole grid if needed
      if (flip === "horizontal") {
        this.pixiSprite.scale.x = -baseScaleX;
        for (let i = 0; i < 8; i++) {
          // Flip the flips
          this.mirrorSprites[i].scale.x = -mirrors[i][2];
        }
      } else if (flip === "vertical") {
        this.pixiSprite.scale.y = -baseScaleY;
        for (let i = 0; i < 8; i++) {
          this.mirrorSprites[i].scale.y = -mirrors[i][3];
        }
      }
    } else {
      // Remove mirror container if it exists
      if (this.isMirrorActive) {
        this.isMirrorActive = false;

        if (this.mirrorContainer && this.animationContainer) {
          const idx = this.animationContainer.getChildIndex(
            this.mirrorContainer,
          );
          // Move main sprite back to animationContainer
          this.mirrorContainer.removeChild(this.pixiSprite);
          this.animationContainer.addChildAt(this.pixiSprite, idx);

          // Destroy mirror sprites and container
          for (const ms of this.mirrorSprites) {
            ms.destroy();
          }
          this.mirrorSprites = [];
          this.animationContainer.removeChild(this.mirrorContainer);
          this.mirrorContainer.destroy();
          this.mirrorContainer = null;
        }
      }

      // Standard Sprite behavior
      if (flip === "horizontal") {
        this.pixiSprite.scale.x = -baseScaleX;
        this.pixiSprite.scale.y = baseScaleY;
      } else if (flip === "vertical") {
        this.pixiSprite.scale.x = baseScaleX;
        this.pixiSprite.scale.y = -baseScaleY;
      } else {
        this.pixiSprite.scale.x = baseScaleX;
        this.pixiSprite.scale.y = baseScaleY;
      }
    }

    this.applyStyle();
  }

  /**
   * Apply all styles (stroke, borderRadius, dropShadow) to the sprite
   */
  private applyStyle(): void {
    if (this.pixiSprite == null || this.destroyed) return;

    const style = (this.sprite as any).style || {};
    const textureWidth = this.pixiSprite.texture?.width ?? 0;
    const textureHeight = this.pixiSprite.texture?.height ?? 0;

    if (textureWidth === 0 || textureHeight === 0) return;

    // 1. Apply BorderRadius (Masking)
    const borderRadius = style.borderRadius || 0;
    const width = Math.abs(this.sprite.width ?? 0);
    const height = Math.abs(this.sprite.height ?? 0);

    if (borderRadius > 0 && width > 0 && height > 0) {
      if (this.maskGraphics == null) {
        this.maskGraphics = new Graphics();
        this.animationContainer!.addChild(this.maskGraphics);
        this.pixiSprite.mask = this.maskGraphics;
      }
      this.maskGraphics.clear();
      this.maskGraphics.roundRect(
        -width / 2,
        -height / 2,
        width,
        height,
        Math.min(borderRadius, width / 2, height / 2),
      );
      this.maskGraphics.fill({ color: 0xffffff, alpha: 1 });
      this.maskGraphics.visible = true;
    } else {
      if (this.maskGraphics) {
        this.maskGraphics.visible = false;
        this.pixiSprite.mask = null;
      }
    }

    if (this.sprite.type !== "Text" && this.sprite.type !== "Caption") {
      this.applyStroke(style, width, height);
    } else if (this.strokeGraphics) {
      this.strokeGraphics.visible = false;
    }

    // 3. Apply Drop Shadow (Media only)
    if (this.sprite.type !== "Text" && this.sprite.type !== "Caption") {
      this.applyShadow(style);
    } else if (this.shadowContainer) {
      this.shadowContainer.visible = false;
      this.shadowContainer.filters = [];
    }
  }

  private applyStroke(
    style: any,
    width: number,
    height: number,
  ): void {
    const stroke = style.stroke;
    const borderRadius = style.borderRadius || 0;
    if (stroke && stroke.width > 0 && width > 0 && height > 0) {
      if (this.strokeGraphics == null) {
        this.strokeGraphics = new Graphics();
        this.animationContainer!.addChild(this.strokeGraphics);
      }

      this.strokeGraphics.clear();
      const color = parseColor(stroke.color) ?? 0xffffff;
      this.strokeGraphics.setStrokeStyle({
        width: stroke.width,
        color: color,
        alignment: 0.5,
      });

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, width / 2, height / 2);
        this.strokeGraphics.roundRect(
          -width / 2,
          -height / 2,
          width,
          height,
          r,
        );
      } else {
        this.strokeGraphics.rect(
          -width / 2,
          -height / 2,
          width,
          height,
        );
      }

      this.strokeGraphics.stroke();
      this.strokeGraphics.visible = true;
    } else if (this.strokeGraphics != null) {
      this.strokeGraphics.visible = false;
    }
  }

  private applyShadow(style: any): void {
    const shadow = style.dropShadow;
    const width = Math.abs(this.sprite.width ?? 0);
    const height = Math.abs(this.sprite.height ?? 0);

    if (
      shadow &&
      width > 0 &&
      height > 0 &&
      (shadow.blur > 0 || shadow.distance > 0)
    ) {
      if (this.shadowContainer == null) {
        this.shadowContainer = new Container();
        this.shadowContainer.label = "ShadowContainer";
        this.shadowGraphics = new Graphics();
        this.shadowContainer.addChild(this.shadowGraphics);
        // Add shadow container to animationContainer at index 0
        this.animationContainer!.addChildAt(this.shadowContainer, 0);
      }

      const color = parseColor(shadow.color) ?? 0x000000;
      const alpha = shadow.alpha ?? 0.5;
      const blur = shadow.blur ?? 0;
      const distance = shadow.distance ?? 0;
      const angle = shadow.angle ?? 0; // In radians

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      // Position the container
      this.shadowContainer.position.set(dx, dy);

      this.shadowGraphics!.clear();
      const borderRadius = style.borderRadius || 0;

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, width / 2, height / 2);
        this.shadowGraphics!.roundRect(
          -width / 2,
          -height / 2,
          width,
          height,
          r,
        );
      } else {
        this.shadowGraphics!.rect(-width / 2, -height / 2, width, height);
      }

      this.shadowGraphics!.fill({ color, alpha });

      // In v8, we use BlurFilter for blurring - apply to container for better bounds handling
      if (blur > 0) {
        if (
          !this.shadowContainer.filters ||
          this.shadowContainer.filters.length === 0
        ) {
          this.shadowContainer.filters = [new BlurFilter()];
        }
        const blurFilter = this.shadowContainer.filters[0] as BlurFilter;

        // Calculate global scale to ensure blur looks consistent regardless of zoom
        // Use worldTransform to get the effective scale on screen
        const worldScale = this.root
          ? Math.sqrt(
              this.root.worldTransform.a ** 2 + this.root.worldTransform.b ** 2,
            )
          : 1;

        // Normalize strength by world scale
        // We set blurFilter.resolution below, which handles the renderer resolution scaling
        blurFilter.strength = blur * worldScale;

        // Explicitly set filter resolution to match renderer for consistency
        blurFilter.resolution = this.resolution;

        // Padding is important to prevent clipping, also needs to scale
        blurFilter.padding = Math.max(blur * 2 * worldScale, 20);
      } else {
        this.shadowContainer.filters = [];
      }

      this.shadowContainer.visible = true;
    } else if (this.shadowContainer != null) {
      this.shadowContainer.visible = false;
      this.shadowContainer.filters = [];
    }
  }

  private applyBlur(blur: number): void {
    if (!this.animationContainer || this.destroyed) return;

    // Safety check for valid number
    if (typeof blur !== "number" || !isFinite(blur) || blur <= 0) {
      if (
        this.animationContainer.filters &&
        this.animationContainer.filters.length > 0
      ) {
        this.animationContainer.filters = [];
      }
      return;
    }

    let blurFilter = this.animationContainer.filters?.find(
      (f) => f instanceof BlurFilter,
    ) as BlurFilter;
    if (!blurFilter) {
      blurFilter = new BlurFilter();
      const currentFilters = this.animationContainer.filters || [];
      this.animationContainer.filters = [...currentFilters, blurFilter];
    }

    // Calculate global scale
    const worldScale = this.root
      ? Math.sqrt(
          this.root.worldTransform.a ** 2 + this.root.worldTransform.b ** 2,
        )
      : 1;

    // Normalize strength by world scale (clamped to sensible minimum if worldScale is essentially 0)
    const effectiveScale = Math.max(worldScale, 0.001);
    blurFilter.strength = blur * effectiveScale;
    blurFilter.resolution = this.resolution;
    blurFilter.padding = Math.max(blur * 2 * effectiveScale, 20);
    blurFilter.quality = 4;
    (blurFilter as any).repeatEdgePixels = true;
  }

  private applyMotionBlur(motionBlur: number): void {
    if (!this.animationContainer || this.destroyed) return;

    // Safety check for valid number
    if (
      typeof motionBlur !== "number" ||
      !isFinite(motionBlur) ||
      motionBlur <= 0
    ) {
      if (this.animationContainer.filters) {
        this.animationContainer.filters =
          this.animationContainer.filters.filter(
            (f) => !(f instanceof ZoomBlurFilter),
          );
      }
      return;
    }

    let zoomBlurFilter = this.animationContainer.filters?.find(
      (f) => f instanceof ZoomBlurFilter,
    ) as ZoomBlurFilter;

    if (!zoomBlurFilter) {
      zoomBlurFilter = new ZoomBlurFilter();
      const currentFilters = this.animationContainer.filters || [];
      this.animationContainer.filters = [...currentFilters, zoomBlurFilter];
    }

    zoomBlurFilter.strength = motionBlur / 200;

    if (this.pixiSprite) {
      const bounds = this.pixiSprite.getBounds();
      zoomBlurFilter.center = {
        x: bounds.width / 2,
        y: bounds.height / 2,
      };
    }

    zoomBlurFilter.innerRadius = 0;
    zoomBlurFilter.radius = -1; // Infinite
  }

  private applyBrightness(brightness: number): void {
    if (!this.animationContainer || this.destroyed) return;

    const hasClipColorAdjustment = hasColorAdjustment(this.sprite.colorAdjustment);
    if (brightness === 1 && !hasClipColorAdjustment) {
      if (this.animationContainer.filters) {
        this.animationContainer.filters =
          this.animationContainer.filters.filter(
            (f) => (f as any).label !== "ColorAdjustmentFilter",
          );
      }
      return;
    }

    let brightnessFilter = this.animationContainer.filters?.find(
      (f) => (f as any).label === "ColorAdjustmentFilter",
    ) as ColorMatrixFilter;

    if (!brightnessFilter) {
      brightnessFilter = new ColorMatrixFilter();
      (brightnessFilter as any).label = "ColorAdjustmentFilter";
      const currentFilters = this.animationContainer.filters || [];
      this.animationContainer.filters = [...currentFilters, brightnessFilter];
    }

    applyColorAdjustmentToMatrix(
      brightnessFilter,
      this.sprite.colorAdjustment,
      brightness,
    );
  }

  private applySelectiveHsl(): void {
    if (!this.animationContainer || this.destroyed) return;

    const activeHslList = getAllSelectiveHsl(this.sprite.colorAdjustment);
    const baseFilters = (this.animationContainer.filters || []).filter(
      (f) => !(f as any).label?.startsWith("SelectiveHslFilter"),
    );

    if (activeHslList.length === 0) {
      this.animationContainer.filters = baseFilters;
      return;
    }

    const selectiveHslFilters: Filter[] = [];
    for (let i = 0; i < activeHslList.length; i++) {
      const activeHsl = activeHslList[i];
      const hslUniforms = new UniformGroup({
        uTargetColor: { value: [1, 1, 0], type: "vec3<f32>" },
        uHueShift: { value: activeHsl.hue, type: "f32" },
        uSatShift: { value: activeHsl.saturation / 100, type: "f32" },
        uLightShift: { value: activeHsl.lightness / 100, type: "f32" },
        uTolerance: { value: 0.22, type: "f32" },
        uSoftness: { value: 0.12, type: "f32" },
      });
      const rgb = hexToRgb(activeHsl.targetColor);
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
      (selectiveHslFilter as any).label = `SelectiveHslFilter_${i}`;
      selectiveHslFilters.push(selectiveHslFilter);
    }

    this.animationContainer.filters = [...baseFilters, ...selectiveHslFilters];
  }

  private applyChromaKey(): void {
    if (!this.animationContainer || this.destroyed) return;

    const { chromaKey } = this.sprite;

    if (!chromaKey || !chromaKey.enabled) {
      if (this.animationContainer.filters) {
        this.animationContainer.filters =
          this.animationContainer.filters.filter(
            (f) => (f as any).label !== "ChromaKeyFilter",
          );
      }
      return;
    }

    let chromaFilter = this.animationContainer.filters?.find(
      (f) => (f as any).label === "ChromaKeyFilter",
    ) as Filter;

    if (!chromaFilter) {
      const program = new GlProgram({
        vertex,
        fragment: CHROMA_KEY_FRAGMENT,
        name: "ChromaKeyShader",
      });

      const chromaUniforms = new UniformGroup({
        uKeyColor: { value: [0, 1, 0], type: "vec3<f32>" },
        uSimilarity: { value: 0.1, type: "f32" },
        uSpill: { value: 0.0, type: "f32" },
      });

      chromaFilter = new Filter({
        glProgram: program,
        resources: {
          chromaUniforms,
        },
      });
      (chromaFilter as any).label = "ChromaKeyFilter";

      const currentFilters = this.animationContainer.filters || [];
      this.animationContainer.filters = [...currentFilters, chromaFilter];
    }

    // Update uniforms
    const uniforms = (chromaFilter.resources as any).chromaUniforms.uniforms;
    const rgb = hexToRgb(chromaKey.color);
    if (rgb) {
      uniforms.uKeyColor[0] = rgb.r / 255;
      uniforms.uKeyColor[1] = rgb.g / 255;
      uniforms.uKeyColor[2] = rgb.b / 255;
    }
    uniforms.uSimilarity = chromaKey.similarity;
    uniforms.uSpill = chromaKey.spill;
  }

  updateTransforms(): void {
    if (this.root != null && !this.destroyed) {
      this.applySpriteTransforms();
    }
  }

  getSprite(): Sprite | null {
    return this.pixiSprite;
  }

  getRoot(): Container | null {
    return this.root;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.root != null) {
      if (this.root.parent) {
        this.root.parent.removeChild(this.root);
      }
      this.root.destroy({ children: true });
      this.root = null;
      this.pixiSprite = null; // pixiSprite is a child of root
    }

    if (this.strokeGraphics != null) {
      this.strokeGraphics.destroy();
      this.strokeGraphics = null;
    }

    if (this.maskGraphics != null) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }

    if (this.shadowGraphics != null) {
      this.shadowGraphics.destroy();
      this.shadowGraphics = null;
    }

    if (this.shadowContainer != null) {
      this.shadowContainer.destroy({ children: true });
      this.shadowContainer = null;
    }

    if (this.texture != null) {
      this.texture.destroy();
      this.texture = null;
    }
  }
}
