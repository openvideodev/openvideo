import { Log } from "../utils/log";
import { BaseSprite, BaseSpriteEvents } from "../sprite/base-sprite";
import { changePCMPlaybackRate } from "../utils";
import type { IClip, IClipMeta, ITransitionInfo } from "./iclip";
import type { ClipJSON } from "../json-serialization";

/** Convert a VideoFrame to ImageBitmap and release the frame. */
async function videoFrameToImageBitmap(video: VideoFrame): Promise<ImageBitmap> {
  try {
    const bitmap = await createImageBitmap(video);
    video.close();
    return bitmap;
  } catch {
    const w = video.displayWidth;
    const h = video.displayHeight;
    if (w <= 0 || h <= 0) {
      video.close();
      throw new Error("VideoFrame has invalid dimensions");
    }
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
      video.close();
      throw new Error("Failed to get 2d context for VideoFrame conversion");
    }
    ctx.drawImage(video, 0, 0, w, h);
    video.close();
    return createImageBitmap(canvas);
  }
}

/**
 * Base class for all clips that extends BaseSprite
 * Provides common functionality for sprite operations (position, animation, timing)
 * and frame management
 */
export abstract class BaseClip<T extends BaseSpriteEvents = BaseSpriteEvents>
  extends BaseSprite<T>
  implements IClip<T>
{
  abstract readonly type: string;
  // Keep last frame, if clip has no data at current frame, render last frame
  // Store as ImageBitmap for reusability (VideoFrames cannot be reused after close)
  private lastVf: ImageBitmap | null = null;

  protected destroyed = false;

  /**
   * Source URL or identifier for this clip
   * Used for serialization and reloading from JSON
   */
  src: string = "";

  /**
   * User-defined metadata
   */
  metadata: Record<string, any> = {};

  /**
   * Transition info (optional)
   */
  transition?: ITransitionInfo;

  /**
   * When set, the clip's RenderTexture is larger than its logical bounds by this many pixels
   * on each side. Provides overflow room for animations (slide, zoom) without visual clipping.
   */
  renderTexturePadding?: number;

  abstract tick(time: number): Promise<{
    video?: VideoFrame | ImageBitmap | null;
    audio?: Float32Array[];
    state: "done" | "success";
  }>;

  // Override ready from BaseSprite to return IClipMeta instead of void
  // This is set by subclasses in their constructors
  declare ready: Promise<IClipMeta>;
  abstract readonly meta: IClipMeta;
  abstract clone(): Promise<this>;
  abstract split?(time: number): Promise<[this, this]>;

  constructor() {
    super();
    // Note: ready will be set by subclasses in their constructors
    // This default implementation is just a placeholder
  }

  /**
   * Get video frame and audio at specified time without rendering to canvas
   * Useful for Pixi.js rendering where canvas context is not needed
   * @param time Specified time in microseconds
   */
  async getFrame(time: number): Promise<{
    video: VideoFrame | ImageBitmap | null;
    audio: Float32Array[];
    done: boolean;
  }> {
    // Note: animate() is called by Compositor before getFrame(), so we don't call it here
    // to avoid applying playback rate twice
    const timestamp = time * this.playbackRate;
    const { video, audio, state } = await this.tick(timestamp);

    let outAudio = audio ?? [];
    if (audio != null && this.playbackRate !== 1) {
      outAudio = audio.map((pcm) => changePCMPlaybackRate(pcm, this.playbackRate));
    }

    // Always hand ImageBitmap to renderers. VideoFrames are single-use and
    // Texture.from() may upload asynchronously; closing the VideoFrame early
    // (before upload completes) produces a black first frame during export.
    let frameSource: VideoFrame | ImageBitmap | null = null;
    if (video != null) {
      if (video instanceof VideoFrame) {
        this.lastVf?.close();
        const bitmap = await videoFrameToImageBitmap(video);
        this.lastVf = bitmap;
        frameSource = bitmap;
      } else {
        // ImageBitmap — store directly for reuse
        this.lastVf?.close();
        this.lastVf = video;
        frameSource = video;
      }
    } else if (this.lastVf != null) {
      // Reuse last frame if no new frame available
      frameSource = this.lastVf;
    }

    return {
      video: frameSource,
      audio: outAudio,
      done: state === "done",
    };
  }

  /**
   * Draw image at specified time to canvas context and return corresponding audio data
   * @param time Specified time in microseconds
   */
  async offscreenRender(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    time: number,
  ): Promise<{
    audio: Float32Array[];
    done: boolean;
  }> {
    const timestamp = time * this.playbackRate;
    this.animate(timestamp);
    super._render(ctx);
    const { width: w, height: h } = this;
    const { video, audio, state } = await this.tick(timestamp);
    let outAudio = audio ?? [];
    if (audio != null && this.playbackRate !== 1) {
      outAudio = audio.map((pcm) => changePCMPlaybackRate(pcm, this.playbackRate));
    }

    if (state === "done") {
      return {
        audio: outAudio,
        done: true,
      };
    }

    // Draw texture
    const imgSource: VideoFrame | ImageBitmap | null = video ?? this.lastVf;
    if (imgSource != null) {
      const borderRadius = this.style.borderRadius || 0;
      const shadow = this.style.shadow;

      ctx.save();

      // 1. Apply Drop Shadow (Canvas2D native)
      if (
        shadow &&
        (shadow.blur > 0 || shadow.offsetX !== undefined || shadow.offsetY !== undefined)
      ) {
        ctx.shadowColor = shadow.color || "#000000";
        ctx.shadowBlur = shadow.blur || 0;
        ctx.shadowOffsetX = shadow.offsetX ?? 0;
        ctx.shadowOffsetY = shadow.offsetY ?? 0;
      }

      // 2. Apply Border Radius (Clipping)
      if (borderRadius > 0) {
        const r = Math.min(borderRadius, w / 2, h / 2);
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
        ctx.clip();
      }

      ctx.drawImage(imgSource, -w / 2, -h / 2, w, h);
      ctx.restore();

      // 3. Render Stroke (on top of clipped image)
      const stroke = this.style.stroke;
      if (stroke && stroke.width > 0) {
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;

        if (borderRadius > 0) {
          const r = Math.min(borderRadius, w / 2, h / 2);
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
          ctx.stroke();
        } else {
          ctx.strokeRect(-w / 2, -h / 2, w, h);
        }
        ctx.restore();
      }
    }

    // Store frame for reuse (convert VideoFrame to ImageBitmap if needed)
    if (video != null) {
      this.lastVf?.close();
      // Note: For offscreenRender, we keep video as-is for now since it's used with canvas
      // But since lastVf is ImageBitmap, we should convert VideoFrame if present
      // However, offscreenRender is mainly for compatibility, getFrame() is the main path
      // For now, only store ImageBitmap in lastVf (video might be VideoFrame)
      if (video instanceof ImageBitmap) {
        this.lastVf = video;
      }
      // If it's a VideoFrame, we don't store it since lastVf expects ImageBitmap
      // The video frame will be used directly in drawImage above
    }

    return {
      audio: outAudio,
      done: false,
    };
  }

  /**
   * Set clip properties (position, size, display timeline)
   * @param props Properties to set
   * @param fps Optional FPS for frame-to-time conversion (default: 30)
   * @returns this for method chaining
   *
   * @example
   * // Using frames (will be converted to microseconds)
   * clip.set({
   *   display: {
   *     from: 150, // frames
   *     to: 450, // frames (10 seconds at 30fps)
   *   },
   * }, 30);
   *
   * // Using microseconds directly
   * clip.set({
   *   display: {
   *     from: 5000000, // microseconds
   *     to: 15000000, // microseconds
   *   },
   * });
   */
  set(
    props: {
      display?: {
        from?: number;
        to?: number;
      };
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      duration?: number;
      timing?: {
        display?: {
          from?: number;
          to?: number;
        };
        trim?: {
          from?: number;
          to?: number;
        };
        duration?: number;
        playbackRate?: number;
        fadeIn?: {
          duration: number;
          curve?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
        };
        fadeOut?: {
          duration: number;
          curve?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
        };
      };
    },
    _fps: number = 30,
  ): this {
    if (props.timing) {
      if (props.timing.display) {
        if (props.timing.display.from !== undefined) {
          this.timing.display.from = props.timing.display.from;
        }
        if (props.timing.display.to !== undefined) {
          this.timing.display.to = props.timing.display.to;
        }
      }
      if (props.timing.trim) {
        if (props.timing.trim.from !== undefined) {
          this.timing.trim.from = props.timing.trim.from;
        }
        if (props.timing.trim.to !== undefined) {
          this.timing.trim.to = props.timing.trim.to;
        }
      }
      if (props.timing.duration !== undefined) {
        this.timing.duration = props.timing.duration;
      }
      if (props.timing.playbackRate !== undefined) {
        this.timing.playbackRate = props.timing.playbackRate;
      }
      if (props.timing.fadeIn !== undefined) {
        this.timing.fadeIn = props.timing.fadeIn;
      }
      if (props.timing.fadeOut !== undefined) {
        this.timing.fadeOut = props.timing.fadeOut;
      }
    }

    if (props.display) {
      if (props.display.from !== undefined) {
        this.display.from = props.display.from;
      }
      if (props.display.to !== undefined) {
        this.display.to = props.display.to;
      }
    }

    if (props.x !== undefined) this.left = props.x;
    if (props.y !== undefined) this.top = props.y;
    if (props.width !== undefined) this.width = props.width;
    if (props.height !== undefined) this.height = props.height;

    if (props.duration !== undefined) {
      this.duration = props.duration;
      // Update display.to if duration is set and display.from is set
      if (this.display.from !== undefined) {
        this.display.to = this.display.from + this.duration;
      }
    }

    return this;
  }

  /**
   * Base implementation of toJSON that handles common clip properties
   * Subclasses should override to add their specific options
   * @param main Whether this is the main clip (for Compositor)
   */
  toJSON(main: boolean = false): ClipJSON {
    const animation =
      (this as any).animatKeyFrame && (this as any).animatOptions
        ? {
            keyFrames: (this as any).animatKeyFrame.reduce(
              (acc: any, [progress, props]: [number, any]) => {
                const key =
                  progress === 0
                    ? "from"
                    : progress === 1
                      ? "to"
                      : `${Math.round(progress * 100)}%`;
                acc[key] = props;
                return acc;
              },
              {},
            ),
            options: (this as any).animatOptions,
          }
        : undefined;

    // Extract new modular animations
    const animations = this.animations.map((a) => {
      if ("toJSON" in a && typeof (a as any).toJSON === "function") {
        return (a as any).toJSON();
      }
      return {
        type: a.type,
        options: a.options,
        params: a.params || {},
      };
    });

    const style = this.style ? JSON.parse(JSON.stringify(this.style)) : undefined;

    return {
      type: this.constructor.name as ClipJSON["type"],
      id: this.id,
      name: this.name,
      src: this.src,
      timing: {
        display: {
          from: this.timing.display.from,
          to: this.timing.display.to,
        },
        trim: {
          from: this.timing.trim.from,
          to: this.timing.trim.to,
        },
        duration: this.timing.duration,
        playbackRate: this.timing.playbackRate,
        fadeIn: this.timing.fadeIn,
        fadeOut: this.timing.fadeOut,
      },
      transform: {
        x: this.left,
        y: this.top,
        width: this.width,
        height: this.height,
        angle: this.angle,
        opacity: this.opacity,
        zIndex: this.zIndex,
        flip: this.flip,
      },
      style,
      ...(animation && { animation }),
      ...(animations.length > 0 && { animations }),
      ...(main && { main: true }),
      chromaKey: this.chromaKey,
      colorAdjustment: this.colorAdjustment,
      locked: this.locked,
      metadata: this.metadata,
    } as ClipJSON;
  }

  /**
   * Get the list of visible transformer handles for this clip type
   * Default implementation returns all handles
   * Override in subclasses to customize handle visibility (e.g., TextClip)
   */
  getVisibleHandles(): Array<"tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb" | "rot"> {
    return ["tl", "tr", "bl", "br", "ml", "mr", "mt", "mb", "rot"];
  }

  /**
   * Scale clip to fit within the scene dimensions while maintaining aspect ratio
   * @param sceneWidth Scene width
   * @param sceneHeight Scene height
   */
  async scaleToFit(sceneWidth: number, sceneHeight: number): Promise<void> {
    await this.ready;
    const { width, height } = this.meta;
    if (width === 0 || height === 0) return;

    const scale = Math.min(sceneWidth / width, sceneHeight / height);
    this.width = width * scale;
    this.height = height * scale;
  }

  /**
   * Scale clip to fill the scene dimensions while maintaining aspect ratio
   * May crop parts of the clip.
   * @param sceneWidth Scene width
   * @param sceneHeight Scene height
   */
  async scaleToFill(sceneWidth: number, sceneHeight: number): Promise<void> {
    await this.ready;
    const { width, height } = this.meta;
    if (width === 0 || height === 0) return;

    const scale = Math.max(sceneWidth / width, sceneHeight / height);
    this.width = width * scale;
    this.height = height * scale;
  }

  /**
   * Center the clip within the scene dimensions
   * @param sceneWidth Scene width
   * @param sceneHeight Scene height
   */
  centerInScene(sceneWidth: number, sceneHeight: number): void {
    this.left = (sceneWidth - this.width) / 2;
    this.top = (sceneHeight - this.height) / 2;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    Log.info("BaseClip destroy");
    super.destroy();
    this.lastVf?.close();
    this.lastVf = null;
  }
}
