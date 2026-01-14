import { Log } from '../utils/log';
import { BaseSprite } from '../sprite/base-sprite';
import { changePCMPlaybackRate } from '../utils';
import type { IClip, IClipMeta, ITransitionInfo } from './iclip';
import type { ClipJSON } from '../json-serialization';

/**
 * Base class for all clips that extends BaseSprite
 * Provides common functionality for sprite operations (position, animation, timing)
 * and frame management
 */
export abstract class BaseClip extends BaseSprite implements IClip {
  abstract readonly type: string;
  // Keep last frame, if clip has no data at current frame, render last frame
  // Store as ImageBitmap for reusability (VideoFrames can only be used once)
  private lastVf: ImageBitmap | null = null;

  protected destroyed = false;

  /**
   * Source URL or identifier for this clip
   * Used for serialization and reloading from JSON
   */
  src: string = '';

  /**
   * Transition info (optional)
   */
  transition?: ITransitionInfo;

  abstract tick(time: number): Promise<{
    video?: VideoFrame | ImageBitmap | null;
    audio?: Float32Array[];
    state: 'done' | 'success';
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
    video: ImageBitmap | null;
    audio: Float32Array[];
    done: boolean;
  }> {
    // Note: animate() is called by Compositor before getFrame(), so we don't call it here
    // to avoid applying playback rate twice
    const timestamp = time * this.playbackRate;
    const { video, audio, state } = await this.tick(timestamp);

    let outAudio = audio ?? [];
    if (audio != null && this.playbackRate !== 1) {
      outAudio = audio.map((pcm) =>
        changePCMPlaybackRate(pcm, this.playbackRate)
      );
    }

    // Convert VideoFrame to ImageBitmap for reusability
    let imgSource: ImageBitmap | null = null;
    if (video != null) {
      // Close old frame
      this.lastVf?.close();

      // Convert VideoFrame to ImageBitmap (can be reused)
      if (video instanceof VideoFrame) {
        imgSource = await createImageBitmap(video);
        video.close(); // Close the VideoFrame, we have ImageBitmap now
      } else {
        // For ImageBitmap, create a new one from the source to ensure it's valid
        // ImageBitmaps can be reused, so we can store the original
        imgSource = video;
      }
      this.lastVf = imgSource;
    } else if (this.lastVf != null) {
      // Reuse last frame if no new frame available
      // For ImageBitmap, we can reuse it directly (ImageBitmaps can be used multiple times)
      imgSource = this.lastVf;
    }

    return {
      video: imgSource,
      audio: outAudio,
      done: state === 'done',
    };
  }

  /**
   * Draw image at specified time to canvas context and return corresponding audio data
   * @param time Specified time in microseconds
   */
  async offscreenRender(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    time: number
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
      outAudio = audio.map((pcm) =>
        changePCMPlaybackRate(pcm, this.playbackRate)
      );
    }

    if (state === 'done') {
      return {
        audio: outAudio,
        done: true,
      };
    }

    // Draw texture
    const imgSource: VideoFrame | ImageBitmap | null = video ?? this.lastVf;
    if (imgSource != null) {
      const borderRadius = this.style.borderRadius || 0;
      const shadow = this.style.dropShadow;

      ctx.save();

      // 1. Apply Drop Shadow (Canvas2D native)
      if (shadow && (shadow.blur > 0 || shadow.distance > 0)) {
        const distance = shadow.distance ?? 0;
        const angle = shadow.angle ?? 0;
        ctx.shadowColor = shadow.color || '#000000';
        ctx.shadowBlur = shadow.blur || 0;
        ctx.shadowOffsetX = Math.cos(angle) * distance;
        ctx.shadowOffsetY = Math.sin(angle) * distance;
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
    },
    fps: number = 30
  ): this {
    if (props.display) {
      if (props.display.from !== undefined) {
        // Convert frames to microseconds if value seems like frames (< 1 second)
        // Otherwise assume it's already in microseconds
        this.display.from =
          props.display.from < 1e6
            ? (props.display.from / fps) * 1e6
            : props.display.from;
      }
      if (props.display.to !== undefined) {
        // Convert frames to microseconds if value seems like frames (< 1 second)
        // Otherwise assume it's already in microseconds
        this.display.to =
          props.display.to < 1e6
            ? (props.display.to / fps) * 1e6
            : props.display.to;
      }
    }

    if (props.x !== undefined) this.left = props.x;
    if (props.y !== undefined) this.top = props.y;
    if (props.width !== undefined) this.width = props.width;
    if (props.height !== undefined) this.height = props.height;

    if (props.duration !== undefined) {
      // Convert frames to microseconds if value seems like frames (< 1 second)
      const duration =
        props.duration < 1e6 ? (props.duration / fps) * 1e6 : props.duration;
      this.duration = duration;
      // Update display.to if duration is set and display.from is set
      if (this.display.from !== undefined) {
        this.display.to = this.display.from + duration;
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
    // Extract animation if present
    const animation =
      (this as any).animatKeyFrame && (this as any).animatOpts
        ? {
            keyFrames: (this as any).animatKeyFrame.reduce(
              (acc: any, [progress, props]: [number, any]) => {
                const key =
                  progress === 0
                    ? 'from'
                    : progress === 1
                      ? 'to'
                      : `${Math.round(progress * 100)}%`;
                acc[key] = props;
                return acc;
              },
              {}
            ),
            opts: (this as any).animatOpts,
          }
        : undefined;

    return {
      type: this.constructor.name as ClipJSON['type'],
      src: this.src,
      display: {
        from: this.display.from,
        to: this.display.to,
      },
      playbackRate: this.playbackRate,
      duration: this.duration,
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      angle: this.angle,
      zIndex: this.zIndex,
      opacity: this.opacity,
      flip: this.flip,
      style: this.style,
      trim: {
        from: this.trim.from,
        to: this.trim.to,
      },
      ...(animation && { animation }),
      ...(main && { main: true }),
    } as ClipJSON;
  }

  /**
   * Get the list of visible transformer handles for this clip type
   * Default implementation returns all handles
   * Override in subclasses to customize handle visibility (e.g., TextClip)
   */
  getVisibleHandles(): Array<
    'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb' | 'rot'
  > {
    return ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb', 'rot'];
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

    Log.info('BaseClip destroy');
    super.destroy();
    this.lastVf?.close();
    this.lastVf = null;
  }
}
