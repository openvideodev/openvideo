import {
  Application,
  Sprite,
  Texture,
  Container,
  Graphics,
  BlurFilter,
} from "pixi.js";

import type { IClip } from "../clips/iclip";
import { parseColor } from "../utils/color";

import { getAnimationOffset } from "../animation/animator";

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
  private texture: Texture | null = null;
  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;
  private root: Container | null = null;
  private animContainer: Container | null = null;
  private strokeGraphics: Graphics | null = null;
  private maskGraphics: Graphics | null = null;
  private shadowGraphics: Graphics | null = null;
  private shadowContainer: Container | null = null;
  private resolution = 1;
  private destroyed = false;
  private lastTime = 0;

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
    this.root.visible = false; // Hidden until first frame
    this.root.label = "ClipRoot";

    // Initialize Animation Container
    this.animContainer = new Container();
    this.animContainer.label = "AnimContainer";
    this.root.addChild(this.animContainer);

    // If we have a target container, add root to it
    if (this.targetContainer) {
      this.targetContainer.addChild(this.root);
    }
  }

  /**
   * Update the sprite with a new video frame or Texture
   * @param frame ImageBitmap, Texture, or null to render
   *              (VideoFrames are converted to ImageBitmap in getFrame)
   * @param clipTime Relative time in the clip (microseconds)
   */
  async updateFrame(
    frame: ImageBitmap | Texture | null,
    clipTime: number = 0,
  ): Promise<void> {
    if (this.destroyed) return;
    this.lastTime = clipTime;

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
        // Parent to animContainer instead of root
        this.animContainer!.addChild(this.pixiSprite);
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
        this.animContainer!.addChild(this.pixiSprite);
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

  private applySpriteTransforms(): void {
    if (this.pixiSprite == null || this.root == null || this.destroyed) return;

    const { flip, center, width, height, angle, opacity, zIndex, duration } =
      this.sprite;

    // 1. BASE TRANSFORMS (ROOT)
    // These reflect the Transformer's view of the clip.
    // They should NOT include temporary animation offsets.
    const rootX = center.x;
    const rootY = center.y;
    const rootAngle = (flip == null ? 1 : -1) * angle;
    // Opacity is applied to root, but animation opacity will be applied to animContainer
    const rootAlpha = opacity;
    const rootZIndex = zIndex;

    this.root.x = rootX;
    this.root.y = rootY;
    this.root.angle = rootAngle;
    this.root.alpha = rootAlpha;
    this.root.zIndex = rootZIndex;
    this.root.scale.set(1, 1); // Root always 1, handling via children

    // 2. ANIMATION TRANSFORMS (ANIM CONTAINER)
    // Initialize with identity values
    let animX = 0;
    let animY = 0;
    let animAngle = 0;
    let animAlpha = 1;
    let animScaleX = 1;
    let animScaleY = 1;

    // --- Animation Logic ---
    if (this.sprite.animations && this.sprite.animations.length > 0) {
      // Heuristic to handle microseconds vs milliseconds
      // If > 100,000, likely microseconds (0.1s).
      // If < 100,000, likely milliseconds (or very start of clip, but <100ms is rare for full clip duration)
      // This ensures compatibility whether lastTime/duration are passed as us or ms
      const clipTimeMsRaw =
        this.lastTime > 100000 ? this.lastTime / 1000 : this.lastTime;

      // Ensure clipDurationMsFromSprite is in ms
      const clipDurationMsRaw = duration > 100000 ? duration / 1000 : duration;

      for (const anim of this.sprite.animations) {
        // Skip text animations here (handled by TextClip usually, unless scope is 'element')
        if (anim.scope && anim.scope !== "element") continue;

        const offset = getAnimationOffset(
          anim,
          clipTimeMsRaw,
          clipDurationMsRaw,
          width,
          height,
        );

        animX += offset.x;
        animY += offset.y;
        animAngle += offset.rotation;
        animAlpha *= offset.alpha;
        animScaleX *= offset.scaleX;
        animScaleY *= offset.scaleY;
      }
    }

    if (this.animContainer) {
      this.animContainer.x = animX;
      this.animContainer.y = animY;
      this.animContainer.angle = animAngle;
      this.animContainer.alpha = animAlpha;
      this.animContainer.scale.set(animScaleX, animScaleY);
    }

    // 3. CONTENT TRANSFORMS (SPRITE)
    this.pixiSprite.anchor.set(0.5, 0.5);
    this.pixiSprite.position.set(0, 0);

    const textureWidth = this.pixiSprite.texture?.width ?? 1;
    const textureHeight = this.pixiSprite.texture?.height ?? 1;

    const isCaption = (this.sprite as any).type === "Caption";
    const baseScaleX =
      !isCaption && width && width !== 0 ? Math.abs(width) / textureWidth : 1;
    const baseScaleY =
      !isCaption && height && height !== 0
        ? Math.abs(height) / textureHeight
        : 1;

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
    if (borderRadius > 0) {
      if (this.maskGraphics == null) {
        this.maskGraphics = new Graphics();
        this.pixiSprite.addChild(this.maskGraphics);
        this.pixiSprite.mask = this.maskGraphics;
      }
      this.maskGraphics.clear();
      this.maskGraphics.roundRect(
        -textureWidth / 2,
        -textureHeight / 2,
        textureWidth,
        textureHeight,
        Math.min(borderRadius, textureWidth / 2, textureHeight / 2),
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
      this.applyStroke(style, textureWidth, textureHeight);
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
    textureWidth: number,
    textureHeight: number,
  ): void {
    const stroke = style.stroke;
    if (stroke && stroke.width > 0) {
      if (this.strokeGraphics == null) {
        this.strokeGraphics = new Graphics();
        this.pixiSprite!.addChild(this.strokeGraphics);
      }

      this.strokeGraphics.clear();
      const color = parseColor(stroke.color) ?? 0xffffff;
      const width = stroke.width;
      const borderRadius = style.borderRadius || 0;

      this.strokeGraphics.setStrokeStyle({
        width: width,
        color: color,
        alignment: 1,
      });

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, textureWidth / 2, textureHeight / 2);
        this.strokeGraphics.roundRect(
          -textureWidth / 2,
          -textureHeight / 2,
          textureWidth,
          textureHeight,
          r,
        );
      } else {
        this.strokeGraphics.rect(
          -textureWidth / 2,
          -textureHeight / 2,
          textureWidth,
          textureHeight,
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
        // Add shadow container to animContainer so it moves with the animation
        this.animContainer!.addChildAt(this.shadowContainer, 0);
      } else {
        // Ensure it's in the right place if already created
        if (this.shadowContainer.parent !== this.animContainer) {
          this.animContainer!.addChildAt(this.shadowContainer, 0);
        }
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
      this.animContainer = null;
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
