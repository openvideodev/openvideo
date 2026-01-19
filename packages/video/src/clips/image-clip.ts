import { Assets, Texture } from 'pixi.js';
import { Log } from '../utils/log';
import { decodeImg } from '../utils';
import { BaseClip } from './base-clip';
import { type IClip } from './iclip';
import { type ClipJSON, type ImageJSON } from '../json-serialization';

type AnimateImgType = 'avif' | 'webp' | 'png' | 'gif';

/**
 * Image clip supporting animated images
 *
 * Ordinary text can be converted to image clip using {@link renderTxt2ImgBitmap}
 *
 * @example
 * // Load from URL using PixiJS Assets (optimized for Studio)
 * const imgClip = await Image.fromUrl('path/to/image.png');
 *
 * @example
 * // Traditional approach (for Compositor/export)
 * new Image((await fetch('<img url>')).body);
 *
 * @example
 * new Image(
 *   await renderTxt2ImgBitmap(
 *     'Watermark',
 *    `font-size:40px; color: white; text-shadow: 2px 2px 6px red;`,
 *   )
 * )
 *
 */
export class Image extends BaseClip implements IClip {
  readonly type = 'Image';
  ready: IClip['ready'];

  private _meta = {
    // microseconds
    duration: 0,
    width: 0,
    height: 0,
  };

  /**
   * ⚠️ Static images have duration of Infinity
   *
   * When wrapping with Sprite, you need to set its duration to a finite number
   *
   */
  get meta() {
    return { ...this._meta };
  }

  private img: ImageBitmap | null = null;

  // Optimized: Store PixiJS Texture for direct use in Studio
  // This avoids ImageBitmap → Canvas → Texture conversion
  private pixiTexture: Texture | null = null;

  private frames: VideoFrame[] = [];

  /**
   * Unique identifier for this clip instance
   */
  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Array of effects to be applied to this clip
   * Each effect specifies key, startTime, duration, and optional targets
   */
  effects: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }> = [];

  /**
   * Load an image clip from a URL using PixiJS Assets
   * This is optimized for Studio as it uses Texture directly
   *
   * @param url Image URL
   * @param src Optional source identifier for serialization
   * @returns Promise that resolves to an Image instance
   *
   * @example
   * const imgClip = await Image.fromUrl('path/to/image.png');
   */
  static async fromUrl(url: string, src?: string): Promise<Image> {
    let texture: Texture | null = null;
    let imageBitmap: ImageBitmap | null = null;

    // Optimized handling for blob URLs to avoid PixiJS warnings about unknown extensions
    if (url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }
        const blob = await response.blob();
        imageBitmap = await createImageBitmap(blob);
        // Create texture from bitmap for Studio optimization
        try {
          texture = Texture.from(imageBitmap);
        } catch (e) {
          Log.warn('Failed to create Pixi texture from bitmap:', e);
        }
      } catch (err) {
        Log.error(`Failed to load blob image from ${url}`, err);
        throw err;
      }
    } else {
      // Use PixiJS Assets.load() for optimized loading with caching for regular URLs
      try {
        texture = await Assets.load<Texture>(url);

        if (texture) {
          // Extract ImageBitmap from Texture for compatibility with Compositor
          const source = texture.source?.resource?.source;

          if (
            source instanceof HTMLCanvasElement ||
            source instanceof OffscreenCanvas
          ) {
            imageBitmap = await createImageBitmap(source);
          } else if (source instanceof HTMLImageElement) {
            const canvas = new OffscreenCanvas(source.width, source.height);
            const ctx = canvas.getContext('2d');
            if (ctx == null) {
              throw new Error('Failed to create 2d context');
            }
            ctx.drawImage(source, 0, 0);
            imageBitmap = await createImageBitmap(canvas);
          } else if (source instanceof ImageBitmap) {
            imageBitmap = await createImageBitmap(source);
          }
        }
      } catch (err) {
        Log.warn(
          `Failed to load texture via Assets.load for ${url}, using fallback`,
          err
        );
      }

      // Fallback for regular URLs if Assets.load failed
      if (!imageBitmap) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch image: ${response.status} ${response.statusText}`
            );
          }
          const blob = await response.blob();
          imageBitmap = await createImageBitmap(blob);
        } catch (err) {
          Log.error(`Failed to load image from ${url}`, err);
          throw err;
        }
      }
    }

    const clip = new Image(imageBitmap, src || url);
    // Store the Texture for optimized preview rendering
    if (texture) {
      clip.pixiTexture = texture;
    }

    return clip;
  }

  /**
   * Get the PixiJS Texture (if available)
   * This is used for optimized rendering in Studio
   */
  getTexture(): Texture | null {
    return this.pixiTexture;
  }

  /**
   * Static images can be initialized using stream or ImageBitmap
   *
   * Animated images need to use VideoFrame[] or provide image type
   */
  constructor(
    dataSource:
      | ReadableStream
      | ImageBitmap
      | VideoFrame[]
      | { type: `image/${AnimateImgType}`; stream: ReadableStream },
    src?: string
  ) {
    super();
    // Always set src, defaulting to empty string if not provided
    this.src = src !== undefined ? src : '';
    const initWithImgBitmap = (imgBitmap: ImageBitmap) => {
      this.img = imgBitmap;
      this._meta.width = imgBitmap.width;
      this._meta.height = imgBitmap.height;
      this._meta.duration = Infinity;
      const meta = { ...this._meta };
      // Update rect and duration from meta (BaseClip pattern)
      // Only set duration from meta if it hasn't been explicitly set (still 0)
      // and if meta.duration is not Infinity (to allow user to set finite duration)
      this.width = this.width === 0 ? meta.width : this.width;
      this.height = this.height === 0 ? meta.height : this.height;
      if (this.duration === 0 && meta.duration !== Infinity) {
        this.duration = meta.duration;
        // Update display.to when duration changes
        this.display.to = this.display.from + this.duration;
      }
      return meta;
    };

    if (dataSource instanceof ReadableStream) {
      this.ready = new Response(dataSource)
        .blob()
        .then((data) => createImageBitmap(data))
        .then(initWithImgBitmap);
    } else if (dataSource instanceof ImageBitmap) {
      this.ready = Promise.resolve(initWithImgBitmap(dataSource));
    } else if (
      Array.isArray(dataSource) &&
      dataSource.every((it) => it instanceof VideoFrame)
    ) {
      this.frames = dataSource;
      const frame = this.frames[0];
      if (frame == null) throw Error('The frame count must be greater than 0');
      this._meta = {
        width: frame.displayWidth,
        height: frame.displayHeight,
        duration: this.frames.reduce(
          (acc, cur) => acc + (cur.duration ?? 0),
          0
        ),
      };
      const meta = { ...this._meta, duration: Infinity };
      // Update rect and duration from meta (BaseClip pattern)
      // Only set duration from meta if it hasn't been explicitly set (still 0)
      // and if meta.duration is not Infinity (to allow user to set finite duration)
      this.width = this.width === 0 ? meta.width : this.width;
      this.height = this.height === 0 ? meta.height : this.height;
      if (this.duration === 0 && meta.duration !== Infinity) {
        this.duration = meta.duration;
        // Update display.to when duration changes
        this.display.to = this.display.from + this.duration;
      }
      this.ready = Promise.resolve(meta);
    } else if ('type' in dataSource) {
      this.ready = this.initAnimateImg(dataSource.stream, dataSource.type).then(
        () => {
          const meta = {
            width: this._meta.width,
            height: this._meta.height,
            duration: Infinity,
          };
          // Update rect and time from meta (BaseClip pattern)
          // Only set duration from meta if it hasn't been explicitly set (still 0)
          // and if meta.duration is not Infinity (to allow user to set finite duration)
          this.width = this.width === 0 ? meta.width : this.width;
          this.height = this.height === 0 ? meta.height : this.height;
          if (this.duration === 0 && meta.duration !== Infinity) {
            this.duration = meta.duration;
            // Update display.to when duration changes
            this.display.to = this.display.from + this.duration;
          }
          return meta;
        }
      );
    } else {
      throw Error('Illegal arguments');
    }
  }

  private async initAnimateImg(
    stream: ReadableStream,
    type: `image/${AnimateImgType}`
  ) {
    this.frames = await decodeImg(stream, type);
    const firstVf = this.frames[0];
    if (firstVf == null) throw Error('No frame available in gif');

    this._meta = {
      duration: this.frames.reduce((acc, cur) => acc + (cur.duration ?? 0), 0),
      width: firstVf.codedWidth,
      height: firstVf.codedHeight,
    };
    Log.info('Image ready:', this._meta);
  }

  tickInterceptor: <T extends Awaited<ReturnType<Image['tick']>>>(
    time: number,
    tickRet: T
  ) => Promise<T> = async (_, tickRet) => tickRet;

  async tick(time: number): Promise<{
    video: ImageBitmap | VideoFrame;
    state: 'success';
  }> {
    if (this.img != null) {
      return await this.tickInterceptor(time, {
        video: await createImageBitmap(this.img),
        state: 'success',
      });
    }
    const targetTime = time % this._meta.duration;
    return await this.tickInterceptor(time, {
      video: (
        this.frames.find(
          (f) =>
            targetTime >= f.timestamp &&
            targetTime <= f.timestamp + (f.duration ?? 0)
        ) ?? this.frames[0]
      ).clone(),
      state: 'success',
    });
  }

  async split(time: number) {
    await this.ready;
    if (this.img != null) {
      return [
        new Image(await createImageBitmap(this.img), this.src),
        new Image(await createImageBitmap(this.img), this.src),
      ] as [this, this];
    }
    let hitIdx = -1;
    for (let i = 0; i < this.frames.length; i++) {
      const vf = this.frames[i];
      if (time > vf.timestamp) continue;
      hitIdx = i;
      break;
    }
    if (hitIdx === -1) throw Error('Not found frame by time');
    const preSlice = this.frames
      .slice(0, hitIdx)
      .map((vf) => new VideoFrame(vf));
    const postSlice = this.frames.slice(hitIdx).map(
      (vf) =>
        new VideoFrame(vf, {
          timestamp: vf.timestamp - time,
        })
    );
    return [new Image(preSlice, this.src), new Image(postSlice, this.src)] as [
      this,
      this,
    ];
  }

  async clone() {
    await this.ready;
    const data =
      this.img == null
        ? this.frames.map((vf) => vf.clone())
        : await createImageBitmap(this.img);
    const newClip = new Image(data, this.src) as this;
    newClip.tickInterceptor = this.tickInterceptor;
    // Copy sprite state (animations, opacity, rect, etc.) to the cloned clip
    this.copyStateTo(newClip);
    // Copy id and effects
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    newClip.transition = this.transition;
    return newClip;
  }

  // Effects
  addEffect(effect: {
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }) {
    this.effects.push(effect);
  }

  editEffect(
    effectId: string,
    newEffectData: Partial<{
      key: string;
      startTime: number;
      duration: number;
    }>
  ) {
    const effect = this.effects.find((e) => e.id === effectId);
    if (effect) {
      Object.assign(effect, newEffectData);
    }
  }

  removeEffect(effectId: string) {
    const effectIndex = this.effects.findIndex((e) => e.id === effectId);
    if (effectIndex !== -1) {
      this.effects.splice(effectIndex, 1);
    }
  }

  destroy(): void {
    Log.info('Image destroy');
    this.img?.close();
    this.frames.forEach((f) => f.close());
    // Note: We don't destroy the Texture here as it's managed by Assets cache
    // If you need to explicitly unload, use Assets.unload()
    this.pixiTexture = null;
    super.destroy();
  }

  toJSON(main: boolean = false): ImageJSON {
    const base = super.toJSON(main);
    return {
      ...base,
      type: 'Image',
      id: this.id,
      effects: this.effects,
    } as ImageJSON;
  }

  /**
   * Create an Image instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to an Image instance
   */
  static async fromObject(json: ClipJSON): Promise<Image> {
    if (json.type !== 'Image') {
      throw new Error(`Expected Image, got ${json.type}`);
    }
    if (!json.src || json.src.trim() === '') {
      throw new Error(
        'Image requires a valid source URL. Generated clips (like text-to-image) cannot be loaded from JSON without their source data.'
      );
    }

    let clip: Image;
    try {
      const response = await fetch(json.src);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image from ${json.src}: ${response.status} ${response.statusText}. Make sure the file exists in the public directory.`
        );
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        Log.warn(
          `Image blob has unexpected type: ${blob.type}. Attempting to load anyway.`
        );
      }
      clip = new Image(await createImageBitmap(blob), json.src);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('could not be decoded')
      ) {
        throw new Error(
          `Failed to decode image from ${json.src}. The image may be corrupted, in an unsupported format, or there may be CORS issues.`
        );
      }
      throw error;
    }

    await clip.ready;

    // Apply properties
    clip.left = json.left;
    clip.top = json.top;
    clip.width = json.width;
    clip.height = json.height;
    clip.angle = json.angle;

    clip.display.from = json.display.from;
    clip.display.to = json.display.to;
    clip.duration = json.duration;
    clip.playbackRate = json.playbackRate;

    clip.zIndex = json.zIndex;
    clip.opacity = json.opacity;
    clip.flip = json.flip;

    if (json.style) {
      clip.style = { ...clip.style, ...json.style };
    }

    // Apply animation if present
    if (json.animation) {
      clip.setAnimation(json.animation.keyFrames, json.animation.opts);
    }

    // Restore id and effects if present
    if (json.id) {
      clip.id = json.id;
    }
    if (json.effects) {
      clip.effects = json.effects;
    }

    if (json.transition) {
      clip.transition = json.transition;
    }

    return clip;
  }
}
