import {
  Application,
  Container,
  Filter,
  RenderTexture,
  Sprite,
  Texture,
  Graphics,
} from 'pixi.js';
import { makeEffect } from './effect/effect';
import {
  DEFAULT_AUDIO_CONF,
  getDefaultAudioConf,
  type IClip,
  Effect,
  Transition,
} from './clips';
import { recodemux } from 'wrapbox';
import { Log } from './utils/log';
import { file2stream } from './utils/stream-utils';
import EventEmitter from './event-emitter';
import { PixiSpriteRenderer } from './sprite/pixi-sprite-renderer';
import { parseColor } from './utils/color';
import { sleep } from './utils';
import {
  clipToJSON,
  jsonToClip,
  type ClipJSON,
  type ProjectJSON,
  type GlobalTransitionJSON as TransitionJSON,
} from './json-serialization';
import { Video } from './clips/video-clip';
import { Image } from './clips/image-clip';
import { makeTransition } from './transition/transition';

export interface ICompositorOpts {
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  bgColor?: string;
  videoCodec?: string;
  /**
   * If false, exclude audio track from the output video
   */
  audio?: false;
  /**
   * Write metadata tags to the output video
   */
  metaDataTags?: Record<string, string>;
  /**
   * Unsafe, may be deprecated at any time
   */
  __unsafe_hardwareAcceleration__?: HardwarePreference;
}

let COM_ID = 0;

/**
 * Prevent VideoEncoder queue from accumulating too many VideoFrames and causing memory issues
 */
async function waitEncoderQueue(getQSize: () => number) {
  if (getQSize() > 50) {
    await sleep(15);
    await waitEncoderQueue(getQSize);
  }
}

/**
 * Video compositor that can add multiple {@link OffscreenSprite} instances,
 * @example
 * const spr1 = new OffscreenSprite(
 *   new Video((await fetch('<mp4 url>')).body),
 * );
 * const spr2 = new OffscreenSprite(
 *   await Audio.fromUrl('<audio url>'),
 * );
 * const com = new Compositor({ width: 1280, height: 720, });

 * await com.addSprite(spr1);
 * await com.addSprite(spr2);

 * com.output(); // => ReadableStream
 *
 */
export class Compositor extends EventEmitter<{
  OutputProgress: number;
  error: Error;
}> {
  /**
   * Check compatibility with the current environment
   * @param args.videoCodec Specify video codec, default avc1.42E032
   * @param args.width Specify video width, default 1920
   * @param args.height Specify video height, default 1080
   * @param args.bitrate Specify video bitrate, default 5e6
   */
  static async isSupported(
    args: {
      videoCodec?: string;
      width?: number;
      height?: number;
      bitrate?: number;
    } = {}
  ): Promise<boolean> {
    return (
      (self.OffscreenCanvas != null &&
        self.VideoEncoder != null &&
        self.VideoDecoder != null &&
        self.VideoFrame != null &&
        self.AudioEncoder != null &&
        self.AudioDecoder != null &&
        self.AudioData != null &&
        ((
          await self.VideoEncoder.isConfigSupported({
            codec: args.videoCodec ?? 'avc1.42E032',
            width: args.width ?? 1920,
            height: args.height ?? 1080,
            bitrate: args.bitrate ?? 7e6,
          })
        ).supported ??
          false) &&
        (
          await self.AudioEncoder.isConfigSupported({
            codec: (await getDefaultAudioConf()).codec,
            sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
            numberOfChannels: DEFAULT_AUDIO_CONF.channelCount,
          })
        ).supported) ??
      false
    );
  }

  private logger = Log.create(`id:${COM_ID++},`);

  private destroyed = false;

  private sprites: Array<IClip & { main: boolean; expired: boolean }> = [];

  private canvas: OffscreenCanvas;

  private pixiApp: Application | null = null;

  // Stop output
  private stopOutput: (() => void) | null = null;

  private opts: Required<ICompositorOpts>;

  private hasVideoTrack: boolean;

  /**
   * Create a compositor instance based on configuration
   * @param opts ICompositorOpts
   */
  constructor(opts: ICompositorOpts = {}) {
    super();
    const { width = 0, height = 0 } = opts;
    this.canvas = new OffscreenCanvas(width, height);
    // this.canvas = document.querySelector('#canvas') as HTMLCanvasElement

    this.opts = Object.assign(
      {
        bgColor: '#000',
        width: 0,
        height: 0,
        videoCodec: 'avc1.42E032',
        audio: true,
        bitrate: 5e6,
        fps: 30,
        metaDataTags: null,
      },
      opts
    );

    this.hasVideoTrack = width * height > 0;

    // Initialize codec detection early
    getDefaultAudioConf().catch((err) => {
      this.logger.warn('Failed to detect audio codec:', err);
    });
  }

  public async initPixiApp(): Promise<void> {
    const { width, height } = this.opts;
    this.pixiApp = new Application();
    await this.pixiApp.init({
      canvas: this.canvas as any,
      width,
      height,
      backgroundColor: 0x000000,
      antialias: false,
      autoDensity: false,
      resolution: 1,
      preference: 'webgl', // Force WebGL to avoid WebGPU overhead/failures in Docker
    });

    // Verify that the app is fully initialized
    if (this.pixiApp.renderer == null || this.pixiApp.stage == null) {
      throw new Error('Pixi.js Application failed to initialize properly');
    }

    // Stop the ticker - we manually call render() in the compositor
    // This prevents the ticker from trying to render after cleanup
    try {
      const anyApp = this.pixiApp as any;
      if (anyApp.ticker && typeof anyApp.ticker.stop === 'function') {
        anyApp.ticker.stop();
      }
    } catch (e) {
      // ignore if ticker doesn't exist or can't be stopped
    }

    // No red rectangle - video frames will be rendered directly via sprites
  }

  /**
   * Add a clip for video composition. Video duration defaults to the maximum duration value from all clips
   * @param clip Clip (extends BaseSprite)
   * @param opts.main If main is true, the video duration uses this clip's duration value
   */
  async addSprite(clip: IClip, opts: { main?: boolean } = {}): Promise<void> {
    const logAttrs = {
      rect: {
        x: clip.left,
        y: clip.top,
        w: clip.width,
        h: clip.height,
      },
      display: { ...clip.display },
      duration: clip.duration,
      playbackRate: clip.playbackRate,
      zIndex: clip.zIndex,
    };
    this.logger.info('Compositor add clip', logAttrs);

    const cloned = await clip.clone();

    // Provide renderer to cloned clip if Pixi App is ready
    if (
      this.pixiApp != null &&
      this.pixiApp.renderer != null &&
      typeof cloned.setRenderer === 'function'
    ) {
      cloned.setRenderer(this.pixiApp.renderer);
    }

    this.logger.info('Compositor add clip ready');
    this.sprites.push(
      Object.assign(cloned, {
        main: opts.main ?? false,
        expired: false,
      })
    );
    this.sprites.sort((a, b) => a.zIndex - b.zIndex);
  }

  private initMuxer(duration: number) {
    const { fps, width, height, videoCodec, bitrate, audio, metaDataTags } =
      this.opts;

    // Check if any sprites actually have video capabilities (width > 0 && height > 0)
    // This handles cases where width/height are set but all sprites are audio-only
    const hasVideoSprites = this.sprites.some(
      (sprite) => sprite.width > 0 && sprite.height > 0
    );

    // Only create video track if we have video track configured AND we have video sprites
    const shouldCreateVideoTrack = this.hasVideoTrack && hasVideoSprites;

    const muxer = recodemux({
      video: shouldCreateVideoTrack
        ? {
            width,
            height,
            expectFPS: fps,
            codec: videoCodec,
            bitrate,
            __unsafe_hardwareAcceleration__:
              this.opts.__unsafe_hardwareAcceleration__,
          }
        : null,
      audio:
        audio === false
          ? null
          : {
              codec: DEFAULT_AUDIO_CONF.codecType,
              sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
              channelCount: DEFAULT_AUDIO_CONF.channelCount,
            },
      duration,
      metaDataTags: metaDataTags,
    });
    return muxer;
  }

  /**
   * Output video file binary stream
   * @param opts.maxTime Maximum duration allowed for output video, content exceeding this will be ignored
   */
  output(opts: { maxTime?: number } = {}): ReadableStream<Uint8Array> {
    if (this.sprites.length === 0) throw Error('No sprite added');

    const mainSprite = this.sprites.find((it) => it.main);
    // Max time: prefer main sprite, otherwise use maximum value
    // Filter out Infinity durations to avoid issues
    const durations = this.sprites.map((it) => it.display.from + it.duration);
    const finiteDurations = durations.filter((d) => d !== Infinity);

    const maxTime =
      opts.maxTime ??
      (mainSprite != null
        ? mainSprite.display.from + mainSprite.duration
        : finiteDurations.length > 0
          ? Math.max(...finiteDurations)
          : Infinity);

    if (maxTime === Infinity || maxTime <= 0) {
      throw Error(
        'Unable to determine the end time, please specify a main sprite, or limit the duration of Image, Audio'
      );
    }
    // Main video's (main) videoTrack duration value is 0
    if (maxTime === -1) {
      this.logger.warn(
        "Unable to determine the end time, process value don't update"
      );
    }

    this.logger.info(`start combinate video, maxTime:${maxTime}`);
    const muxer = this.initMuxer(maxTime);
    let startTime = performance.now();
    const stopMuxer = this.runEncoding(muxer, maxTime, {
      onProgress: (prog) => {
        this.logger.debug('OutputProgress:', prog);
        this.emit('OutputProgress', prog);
      },
      onEnded: async () => {
        await muxer.flush();
        this.logger.info(
          '===== output ended =====, cost:',
          performance.now() - startTime
        );
        this.emit('OutputProgress', 1);
        this.destroy();
      },
      onError: (err) => {
        this.emit('error', err);
        closeOutStream(err);
        this.destroy();
      },
    });

    this.stopOutput = () => {
      stopMuxer();
      muxer.close();
      closeOutStream();
    };
    const { stream, stop: closeOutStream } = file2stream(
      muxer.mp4file,
      500,
      this.destroy
    );

    return stream;
  }

  /**
   * Destroy instance and release resources
   */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopOutput?.();
    this.off('OutputProgress');
    this.off('error');

    // Clean up Pixi.js resources
    if (this.pixiApp != null) {
      try {
        const anyApp = this.pixiApp as any;
        // Check if already destroyed
        if (anyApp.destroyed === true) {
          this.pixiApp = null;
          return;
        }
        // Stop ticker if present
        if (anyApp.ticker && typeof anyApp.ticker.stop === 'function') {
          try {
            anyApp.ticker.stop();
          } catch (e) {
            // ignore
          }
        }
        // Only destroy if renderer exists and context is not lost
        if (anyApp.renderer != null) {
          // Check if WebGL context is lost
          const gl = anyApp.renderer.gl;
          if (gl && gl.isContextLost()) {
            // Context already lost, just clear reference
            this.pixiApp = null;
            return;
          }
          this.pixiApp.destroy();
        }
      } catch (err) {
        // Swallow errors during destroy - context may be lost or already destroyed
        // eslint-disable-next-line no-console
        console.warn('Error while destroying Pixi application:', err);
      } finally {
        this.pixiApp = null;
      }
    }
  }

  private runEncoding(
    muxer: ReturnType<typeof recodemux>,
    maxTime: number,
    {
      onProgress,
      onEnded,
      onError,
    }: {
      onProgress: (prog: number) => void;
      onEnded: () => Promise<void>;
      onError: (err: Error) => void;
    }
  ): () => void {
    let progress = 0;
    const aborter = { aborted: false };
    let err: Error | null = null;
    let renderSprites: ReturnType<typeof createSpritesRender> | null = null;

    const run = async () => {
      const { fps, bgColor, audio: outputAudio } = this.opts;
      const timeSlice = Math.round(1e6 / fps);

      // Check if any sprites actually have video capabilities
      const hasVideoSprites = this.sprites.some(
        (sprite) => sprite.width > 0 && sprite.height > 0
      );

      renderSprites = createSpritesRender({
        pixiApp: this.pixiApp,
        bgColor,
        sprites: this.sprites,
        aborter,
      });
      const encodeFrame = createAVEncoder({
        muxer,
        canvas: this.canvas,
        outputAudio,
        hasVideoTrack: this.hasVideoTrack && hasVideoSprites,
        timeSlice,
        fps,
      });

      let timestamp = 0;
      while (true) {
        if (err != null) return;
        if (
          aborter.aborted ||
          (maxTime === -1 ? false : timestamp > maxTime) ||
          this.sprites.length === 0
        ) {
          exit();
          await onEnded();
          return;
        }
        progress = timestamp / maxTime;

        const { audios, mainSprDone, hasVideo } =
          await renderSprites.render(timestamp);
        if (mainSprDone) {
          exit();
          await onEnded();
          return;
        }

        if (aborter.aborted) return;

        // Ensure canvas rendering is complete before creating VideoFrame
        // This is critical for OffscreenCanvas to be in a valid state
        if (this.hasVideoTrack && hasVideo) {
          // Wait for next animation frame to ensure render is complete
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        encodeFrame(timestamp, audios, hasVideo);

        timestamp += timeSlice;

        await waitEncoderQueue(muxer.getEncodeQueueSize);
      }
    };

    const exit = () => {
      if (aborter.aborted) return;
      aborter.aborted = true;
      clearInterval(progressTimer);
      // Clean up sprite renderers first (removes sprites from Pixi stage)
      if (renderSprites != null) {
        renderSprites.cleanup();
      }
      // Then destroy all sprites
      this.sprites.forEach((it) => {
        it.destroy();
      });
    };

    run().catch((e) => {
      err = e;
      this.logger.error(e);
      exit();
      onError(e);
    });

    const progressTimer = setInterval(() => {
      onProgress(progress);
    }, 500);

    return exit;
  }

  /**
   * Export current compositor state to JSON
   */
  exportToJSON(): ProjectJSON {
    const clips: ClipJSON[] = this.sprites.map((sprite) => {
      return clipToJSON(sprite, sprite.main);
    });

    const transitions: TransitionJSON[] = [];

    this.sprites.forEach((clip) => {
      if (clip.transition) {
        // Find predecessor on the same "track" (same zIndex)
        const prevClip = this.sprites
          .filter(
            (c) =>
              c.id !== clip.id &&
              c.zIndex === clip.zIndex &&
              c.display.from < clip.display.from &&
              (c instanceof Video || c instanceof Image)
          )
          .sort((a, b) => b.display.to - a.display.to)[0];

        if (prevClip) {
          transitions.push({
            key: clip.transition.name,
            duration: clip.transition.duration,
            clips: [prevClip.id, clip.id],
          });
        }
      }
    });

    return {
      clips,
      settings: {
        width: this.opts.width,
        height: this.opts.height,
        fps: this.opts.fps,
        bgColor: this.opts.bgColor,
        videoCodec: this.opts.videoCodec,
        bitrate: this.opts.bitrate,
        audio: this.opts.audio,
        metaDataTags: this.opts.metaDataTags,
      },
    };
  }

  /**
   * Load clips from JSON
   * @param json The JSON project data
   */
  async loadFromJSON(json: ProjectJSON): Promise<void> {
    // Clear existing sprites
    this.sprites.forEach((sprite) => {
      sprite.destroy();
    });
    this.sprites = [];

    // Update settings if provided
    if (json.settings) {
      if (json.settings.width !== undefined)
        this.opts.width = json.settings.width;
      if (json.settings.height !== undefined)
        this.opts.height = json.settings.height;
      if (json.settings.fps !== undefined) this.opts.fps = json.settings.fps;
      if (json.settings.bgColor !== undefined)
        this.opts.bgColor = json.settings.bgColor;
      if (json.settings.videoCodec !== undefined)
        this.opts.videoCodec = json.settings.videoCodec;
      if (json.settings.bitrate !== undefined)
        this.opts.bitrate = json.settings.bitrate;
      if (json.settings.audio !== undefined) {
        this.opts.audio =
          json.settings.audio === false ? false : (undefined as any);
      }
      if (json.settings.metaDataTags !== undefined)
        this.opts.metaDataTags = json.settings.metaDataTags;
    }

    // Load all clips
    for (const clipJSON of json.clips) {
      const clip = await jsonToClip(clipJSON);
      await this.addSprite(clip, { main: clipJSON.main || false });
    }
  }
}

function createSpritesRender(opts: {
  pixiApp: Application | null;
  bgColor: string;
  sprites: Array<IClip & { main: boolean; expired: boolean }>;
  aborter: { aborted: boolean };
}): {
  render: (timestamp: number) => Promise<{
    audios: Float32Array[][];
    mainSprDone: boolean;
    hasVideo: boolean;
  }>;
  cleanup: () => void;
} {
  const { pixiApp, sprites, aborter } = opts;
  const hasVideoTrack = pixiApp != null;

  // Map to store PixiSpriteRenderer instances for each clip (only for video)
  const spriteRenderers = new Map<
    IClip & { main: boolean; expired: boolean },
    PixiSpriteRenderer
  >();

  // Transition state
  const transitionRenderers = new Map<
    string,
    ReturnType<typeof makeTransition>
  >();
  const transitionSprites = new Map<string, Sprite>();
  const transFromTexture = RenderTexture.create({
    width: pixiApp?.renderer.width || 0,
    height: pixiApp?.renderer.height || 0,
  });
  const transToTexture = RenderTexture.create({
    width: pixiApp?.renderer.width || 0,
    height: pixiApp?.renderer.height || 0,
  });
  const transBgGraphics = new Graphics()
    .rect(0, 0, pixiApp?.renderer.width || 0, pixiApp?.renderer.height || 0)
    .fill({ color: 0x000000 });

  // Create filters cache - cache both the filter and the render function
  const effectCache = new Map<
    string,
    { filter: Filter; render: (opts: any) => Texture }
  >();
  const getClipFrameAtTimestamp = async (
    clip: IClip,
    timestamp: number,
    getFrameCached: (clip: IClip, timestamp: number) => Promise<any>
  ) => {
    const relTime = Math.max(
      0,
      Math.min(timestamp - clip.display.from, clip.duration)
    );
    const { video } = await getFrameCached(clip, relTime);
    return video;
  };

  const renderClipToTransitionTexture = (
    clip: IClip,
    // Example: new Image(imageBitmap), or Texture
    frame: ImageBitmap | Texture,
    target: RenderTexture
  ) => {
    if (!pixiApp) return;

    // 1. Clear with Background
    pixiApp.renderer.render({
      container: transBgGraphics,
      target: target,
      clear: true,
    });

    // 2. Render Clip Frame
    const tempSprite = new Sprite(
      frame instanceof Texture ? frame : Texture.from(frame)
    );

    tempSprite.x = clip.center.x;
    tempSprite.y = clip.center.y;
    tempSprite.anchor.set(0.5, 0.5);

    const textureWidth = tempSprite.texture.width || 1;
    const textureHeight = tempSprite.texture.height || 1;

    const baseScaleX =
      clip.width && clip.width !== 0 ? Math.abs(clip.width) / textureWidth : 1;
    const baseScaleY =
      clip.height && clip.height !== 0
        ? Math.abs(clip.height) / textureHeight
        : 1;

    if (clip.flip === 'horizontal') {
      tempSprite.scale.x = -baseScaleX;
      tempSprite.scale.y = baseScaleY;
    } else if (clip.flip === 'vertical') {
      tempSprite.scale.x = baseScaleX;
      tempSprite.scale.y = -baseScaleY;
    } else {
      tempSprite.scale.x = baseScaleX;
      tempSprite.scale.y = baseScaleY;
    }

    tempSprite.rotation = (clip.flip == null ? 1 : -1) * clip.angle;
    tempSprite.alpha = clip.opacity;

    const style = (clip as any).style || {};

    // 2.5 Apply Mask (Border Radius)
    const borderRadius = style.borderRadius || 0;
    let maskGraphics: Graphics | null = null;
    if (borderRadius > 0) {
      maskGraphics = new Graphics();
      maskGraphics.roundRect(
        -textureWidth / 2,
        -textureHeight / 2,
        textureWidth,
        textureHeight,
        Math.min(borderRadius, textureWidth / 2, textureHeight / 2)
      );
      maskGraphics.fill({ color: 0xffffff, alpha: 1 });
      tempSprite.addChild(maskGraphics);
      tempSprite.mask = maskGraphics;
    }

    // 3. Render Stroke if present
    const stroke = style.stroke;
    let strokeGraphics: Graphics | null = null;

    if (stroke && stroke.width > 0) {
      strokeGraphics = new Graphics();
      const color = parseColor(stroke.color) ?? 0xffffff;
      const width = stroke.width;

      strokeGraphics.setStrokeStyle({
        width: width,
        color: color,
        alignment: 1,
      });

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, textureWidth / 2, textureHeight / 2);
        strokeGraphics.roundRect(
          -textureWidth / 2,
          -textureHeight / 2,
          textureWidth,
          textureHeight,
          r
        );
      } else {
        strokeGraphics.rect(
          -textureWidth / 2,
          -textureHeight / 2,
          textureWidth,
          textureHeight
        );
      }
      strokeGraphics.stroke();
      tempSprite.addChild(strokeGraphics);
    }

    // 4. Render Shadow if present
    const shadow = style.dropShadow;
    let shadowGraphics: Graphics | null = null;
    if (shadow && (shadow.blur > 0 || shadow.distance > 0)) {
      shadowGraphics = new Graphics();
      const color = parseColor(shadow.color) ?? 0x000000;
      const alpha = shadow.alpha ?? 0.5;
      const distance = shadow.distance ?? 0;
      const angle = shadow.angle ?? 0;

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, textureWidth / 2, textureHeight / 2);
        shadowGraphics.roundRect(
          -textureWidth / 2 + dx,
          -textureHeight / 2 + dy,
          textureWidth,
          textureHeight,
          r
        );
      } else {
        shadowGraphics.rect(
          -textureWidth / 2 + dx,
          -textureHeight / 2 + dy,
          textureWidth,
          textureHeight
        );
      }
      shadowGraphics.fill({ color, alpha });
      // Add as first child to be behind
      tempSprite.addChildAt(shadowGraphics, 0);
    }

    pixiApp.renderer.render({
      container: tempSprite,
      target: target,
      clear: false,
    });

    if (!(frame instanceof Texture)) {
      tempSprite.texture.destroy(true);
    }
    if (strokeGraphics) strokeGraphics.destroy();
    if (maskGraphics) maskGraphics.destroy();
    if (shadowGraphics) shadowGraphics.destroy();
    tempSprite.destroy();
  };

  // Containers for global effect rendering and transitions
  let clipsEffectContainer: Container | null = null;
  let clipsNormalContainer: Container | null = null;
  let postProcessContainer: Container | null = null;

  if (hasVideoTrack && pixiApp != null) {
    clipsEffectContainer = new Container();
    clipsNormalContainer = new Container();
    postProcessContainer = new Container();

    clipsNormalContainer.sortableChildren = true;
    postProcessContainer.sortableChildren = true;

    pixiApp.stage.addChild(clipsNormalContainer);
    pixiApp.stage.addChild(postProcessContainer);
    clipsEffectContainer.visible = false;
    pixiApp.stage.addChild(clipsEffectContainer);
  }

  // Pre-sort sprites once as they don't change during encoding
  const sortedSprites = [...sprites].sort((a, b) => a.zIndex - b.zIndex);

  const render = async (timestamp: number) => {
    const audios: Float32Array[][] = [];
    let mainSprDone = false;
    let hasVideo = false;

    // Cache to store getFrame results for each clip at the current timestamp
    // This prevents redundant getFrame calls (e.g., during transitions)
    // which can cause audio choppiness if the underlying source advances on each call.
    const frameCache = new Map<
      string,
      { video: any; audio: Float32Array[]; done: boolean }
    >();

    const getFrameCached = async (sprite: IClip, relTime: number) => {
      const key = `${sprite.id}_${relTime}`;
      if (frameCache.has(key)) return frameCache.get(key)!;
      const res = await sprite.getFrame(relTime);
      frameCache.set(key, res);
      return res;
    };

    // Reset all transition sprites for each frame
    for (const sprite of transitionSprites.values()) {
      sprite.visible = false;
    }

    if (hasVideoTrack && pixiApp != null) {
      // Make sure we clear stage (or the containers) if needed
      // Actually we just reuse them and update children
    }

    for (const sprite of sortedSprites) {
      if (aborter.aborted) break;
      if (timestamp < sprite.display.from || sprite.expired) {
        // Even if expired, we might need to hide renderer
        if (hasVideoTrack && pixiApp != null) {
          const renderer = spriteRenderers.get(sprite);
          if (renderer) {
            await renderer.updateFrame(null);
          }
        }
        continue;
      }

      const relativeTime = timestamp - sprite.display.from;
      const spriteTime = relativeTime * sprite.playbackRate;

      // Update sprite animation properties FIRST
      // This updates rect.x, rect.y, rect.angle, opacity, etc. based on animation keyframes
      sprite.animate(spriteTime);

      // Get video frame and audio from sprite (using cache)
      const { video, audio, done } = await getFrameCached(sprite, relativeTime);

      // Process audio
      audios.push(audio);

      // Handle video rendering if we have a Pixi app
      if (hasVideoTrack && pixiApp != null && clipsNormalContainer != null) {
        if (sprite instanceof Transition) {
          const fromClip = sprites.find((s) => s.id === sprite.fromClipId);
          const toClip = sprites.find((s) => s.id === sprite.toClipId);

          if (fromClip && toClip) {
            const fromFrame = await getClipFrameAtTimestamp(
              fromClip,
              timestamp,
              getFrameCached
            );
            const toFrame = await getClipFrameAtTimestamp(
              toClip,
              timestamp,
              getFrameCached
            );

            if (fromFrame && toFrame) {
              const progress = relativeTime / sprite.duration;

              // Render BOTH frames to their respective composite textures (with background)
              renderClipToTransitionTexture(
                fromClip,
                fromFrame,
                transFromTexture
              );
              renderClipToTransitionTexture(toClip, toFrame, transToTexture);

              let transRenderer = transitionRenderers.get(sprite.id);
              if (!transRenderer) {
                transRenderer = makeTransition({
                  name: sprite.transitionEffect.key,
                  renderer: pixiApp.renderer,
                });
                transitionRenderers.set(sprite.id, transRenderer);
              }

              const transTexture = transRenderer.render({
                width: pixiApp.renderer.width,
                height: pixiApp.renderer.height,
                from: transFromTexture,
                to: transToTexture,
                progress,
              });

              // Display the transition using a per-clip transition sprite
              let transSprite = transitionSprites.get(sprite.id);
              if (!transSprite) {
                transSprite = new Sprite();
                transSprite.label = `TransitionSprite_${sprite.id}`;
                transitionSprites.set(sprite.id, transSprite);
                clipsNormalContainer.addChild(transSprite);
              }

              transSprite.texture = transTexture;
              transSprite.visible = true;
              transSprite.x = 0;
              transSprite.y = 0;
              transSprite.width = pixiApp.renderer.width;
              transSprite.height = pixiApp.renderer.height;
              transSprite.anchor.set(0, 0);
              transSprite.zIndex = sprite.zIndex;

              hasVideo = true;

              // Force hide participants during transition
              const fromRenderer = spriteRenderers.get(
                fromClip as IClip & { main: boolean; expired: boolean }
              );
              if (fromRenderer) {
                const root = fromRenderer.getRoot();
                if (root) root.visible = false;
              }
              const toRenderer = spriteRenderers.get(
                toClip as IClip & { main: boolean; expired: boolean }
              );
              if (toRenderer) {
                const root = toRenderer.getRoot();
                if (root) root.visible = false;
              }

              continue;
            }
          }
        }

        // Get or create PixiSpriteRenderer for this sprite
        let renderer = spriteRenderers.get(sprite);
        if (renderer == null && video != null) {
          // Only create renderer if we have a video frame
          // Pass clipsNormalContainer as default target
          renderer = new PixiSpriteRenderer(
            pixiApp,
            sprite,
            clipsNormalContainer
          );
          spriteRenderers.set(sprite, renderer);
        }

        if (renderer != null) {
          if (video != null) {
            hasVideo = true;
            // Update Pixi sprite with video frame
            await renderer.updateFrame(video);
          } else {
            // If we had a renderer but no video frame, hide it
            await renderer.updateFrame(null);
          }
        }

        // CRITICAL: Always update transforms AFTER animation
        if (renderer != null) {
          renderer.updateTransforms();
        }
      }

      // Check if sprite is done or expired
      if (
        (sprite.duration > 0 &&
          timestamp > sprite.display.from + sprite.duration) ||
        done
      ) {
        if (sprite.main) mainSprDone = true;

        // Mark as expired but DON'T destroy yet
        sprite.expired = true;

        // Clean up renderer if it exists
        if (hasVideoTrack) {
          const renderer = spriteRenderers.get(sprite);
          if (renderer != null) {
            const root = renderer.getRoot();
            if (root) root.visible = false;
          }
        }
      } else if (hasVideoTrack) {
        // Update transforms in case sprite properties changed
        const renderer = spriteRenderers.get(sprite);
        if (renderer != null) {
          renderer.updateTransforms();
        }
      }
    }

    // Handle Global Effects rendering
    if (
      hasVideoTrack &&
      pixiApp != null &&
      clipsEffectContainer != null &&
      clipsNormalContainer != null &&
      postProcessContainer != null
    ) {
      // 1. Identify active Global Effect
      let activeEffect: {
        id: string;
        key: string;
        startTime: number;
        duration: number;
      } | null = null;

      // Scan for Effect first (Adjustment Layer)
      for (const sprite of sprites) {
        if (sprite instanceof Effect) {
          if (
            timestamp >= sprite.display.from &&
            timestamp < sprite.display.from + sprite.duration
          ) {
            activeEffect = {
              id: sprite.id,
              key: (sprite as Effect).effect.key,
              startTime: sprite.display.from,
              duration: sprite.duration,
            };
            break;
          }
        }
      }

      // Fallback: Scan clips for attached effects if no Effect found
      if (!activeEffect) {
        for (const sprite of sprites) {
          if (sprite.effects && sprite.effects.length > 0) {
            for (const effect of sprite.effects) {
              if (
                timestamp >= effect.startTime &&
                timestamp < effect.startTime + effect.duration
              ) {
                activeEffect = effect;
                break;
              }
            }
          }
          if (activeEffect) break;
        }
      }

      // Clean post process container
      postProcessContainer.removeChildren();

      // Reset all clips to normal container first
      for (const renderer of spriteRenderers.values()) {
        const root = renderer.getRoot();
        if (root && root.parent !== clipsNormalContainer) {
          // Remove from old parent first to be safe
          if (root.parent) (root.parent as Container).removeChild(root);
          clipsNormalContainer.addChild(root);
        }
      }

      if (activeEffect) {
        const { key, startTime, duration, id } = activeEffect;
        const elapsed = timestamp - startTime;
        const progress =
          duration > 0 ? Math.min(Math.max(elapsed / duration, 0), 1) : 0;

        // Check if this is an Adjustment Layer Effect (from Effect)
        // If the ID matches a sprite ID in our list that is an Effect, then it is.
        const isAdjustmentLayer = sprites.some(
          (s) => s.id === id && s instanceof Effect
        );

        // Move affected clips to effect container
        for (const sprite of sprites) {
          let shouldApply = false;

          if (isAdjustmentLayer) {
            // Apply to all clips except the effect clip itself
            // And maybe except other effect clips?
            shouldApply = sprite.id !== id && !(sprite instanceof Effect);
          } else {
            // Legacy: Only apply if clip explicitly has this effect attached
            shouldApply =
              !!sprite.effects && sprite.effects.some((e) => e.id === id);
          }

          if (shouldApply) {
            const renderer = spriteRenderers.get(sprite);
            if (renderer) {
              const root = renderer.getRoot();
              if (root) {
                if (root.parent) (root.parent as Container).removeChild(root);
                clipsEffectContainer.addChild(root);
              }
            }
          }
        }

        // If we have clips in effect container, render them
        // If we have clips in effect container, render them
        if (clipsEffectContainer.children.length > 0) {
          // Get effect from cache
          let effect = effectCache.get(id);
          if (!effect) {
            try {
              const res = makeEffect({
                name: key as any,
                renderer: pixiApp.renderer,
              });
              if (res && res.filter) {
                effect = { filter: res.filter, render: res.render };
                effectCache.set(id, effect);
              }
            } catch (e) {
              console.warn('Failed to create effect', key, e);
            }
          }

          if (effect) {
            const { filter, render } = effect;

            // Update uTime
            if (filter.resources && filter.resources.effectUniforms) {
              filter.resources.effectUniforms.uniforms.uTime = progress;
            }

            // Render clips to temporary texture
            const width = pixiApp.renderer.width;
            const height = pixiApp.renderer.height;
            const renderTexture = RenderTexture.create({ width, height });

            clipsEffectContainer.visible = true; // Make visible for render
            pixiApp.renderer.render({
              container: clipsEffectContainer,
              target: renderTexture,
              clear: true,
            });
            clipsEffectContainer.visible = false; // Hide again

            // Apply filter using effect.render helper
            if (render) {
              const resultTexture = render({
                canvasTexture: renderTexture,
                progress,
                width,
                height,
              });

              // Create sprite from result and add to postProcessContainer
              const resultSprite = new Sprite(resultTexture);
              resultSprite.width = width;
              resultSprite.height = height;
              postProcessContainer.addChild(resultSprite);

              // Cleanup is handled by Pixi/GC mostly, but intermediate textures might need care?
              // renderTexture is consumed by effect.render usually?
              // Check makeEffect implementation: it typically uses canvasTexture as input.
              // We should probably destroy renderTexture after use if it's not cached?
              // But effect.render might be async or holding reference? No, it's synchronous usually.
              // renderTexture.destroy(true) might be safe if resultTexture is a different texture.
              // But if effect just returns input texture, don't destroy.
              // Usually effects create a NEW texture or swap.
              // For now let's rely on GC or explicit destroy if we see leaks.
              // Actually, Compositor runs for a while. Leaking textures every frame is BAD.
              // We must verify if makeEffect destroys input.
              // Assuming we should destroy renderTexture if it was copied.
              // But wait, renderTexture is passed to render().
            }
          }
        }
      }
    }

    // Render the entire Pixi.js scene (only if we have video track and app is ready)
    if (hasVideoTrack && pixiApp != null) {
      pixiApp.render();
    }

    return {
      audios,
      mainSprDone,
      hasVideo,
    };
  };

  const cleanup = () => {
    // Clean up transition resources
    if (transFromTexture) transFromTexture.destroy(true);
    if (transToTexture) transToTexture.destroy(true);
    if (transBgGraphics) transBgGraphics.destroy(true);
    for (const sprite of transitionSprites.values()) {
      sprite.destroy();
    }
    transitionSprites.clear();
    transitionRenderers.clear();

    // Clean up containers
    if (clipsEffectContainer) clipsEffectContainer.destroy({ children: true });
    if (clipsNormalContainer) clipsNormalContainer.destroy({ children: true });
    if (postProcessContainer) postProcessContainer.destroy({ children: true });

    // Clean up all sprite renderers
    spriteRenderers.forEach((renderer) => {
      renderer.destroy();
    });
    spriteRenderers.clear();
  };

  return { render, cleanup };
}

function createAVEncoder(opts: {
  muxer: ReturnType<typeof recodemux>;
  canvas: OffscreenCanvas;
  outputAudio?: boolean;
  hasVideoTrack: boolean;
  timeSlice: number;
  fps: number;
}) {
  const { canvas, outputAudio, muxer, hasVideoTrack, timeSlice } = opts;
  let frameCnt = 0;
  // GOP size: 3 seconds
  const gopSize = Math.floor(3 * opts.fps);

  const audioTrackBuf = createAudioTrackBuf(1024);

  return (timestamp: number, audios: Float32Array[][], hasVideo: boolean) => {
    if (outputAudio !== false) {
      for (const audioData of audioTrackBuf(timestamp, audios))
        muxer.encodeAudio(audioData);
    }

    // Only encode video if we have video track AND we actually have video frames
    if (hasVideoTrack && hasVideo) {
      // Ensure canvas is in a valid state before creating VideoFrame
      // The canvas must have been rendered to at least once
      try {
        const frame = new VideoFrame(canvas, {
          duration: timeSlice,
          timestamp: timestamp,
        });

        muxer.encodeVideo(frame, {
          keyFrame: frameCnt % gopSize === 0,
        });

        frameCnt += 1;
      } catch (err) {
        // If canvas is not ready, skip this frame
        // This can happen if the canvas hasn't been rendered to yet
        console.warn(
          'Failed to create VideoFrame from canvas, skipping frame:',
          err
        );
      }
    }
  };
}

/**
 * Buffer input data and convert to AudioData with fixed frame count
 * @param framesPerChunk Number of audio frames per AudioData instance
 */
export function createAudioTrackBuf(framesPerChunk: number) {
  const dataSize = framesPerChunk * DEFAULT_AUDIO_CONF.channelCount;
  // PCM data buffer
  const channelBuf = new Float32Array(dataSize * 3);
  let writePos = 0;

  let audioTimestamp = 0;
  const chunkDuration = (framesPerChunk / DEFAULT_AUDIO_CONF.sampleRate) * 1e6;

  // Placeholder when audio data is missing
  const placeholderData = new Float32Array(dataSize);

  const getAudioData = (timestamp: number) => {
    let readPos = 0;
    const chunkCount = Math.floor(writePos / dataSize);
    const results: AudioData[] = [];
    // Get data from buffer by specified frame count and construct AudioData
    for (let i = 0; i < chunkCount; i++) {
      results.push(
        new AudioData({
          timestamp: audioTimestamp,
          numberOfChannels: DEFAULT_AUDIO_CONF.channelCount,
          numberOfFrames: framesPerChunk,
          sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
          format: 'f32',
          data: channelBuf.subarray(readPos, readPos + dataSize),
        })
      );
      readPos += dataSize;
      audioTimestamp += chunkDuration;
    }
    channelBuf.set(channelBuf.subarray(readPos, writePos), 0);
    writePos -= readPos;

    // When existing audio data is insufficient, fill with placeholder
    while (timestamp - audioTimestamp > chunkDuration) {
      results.push(
        new AudioData({
          timestamp: audioTimestamp,
          numberOfChannels: DEFAULT_AUDIO_CONF.channelCount,
          numberOfFrames: framesPerChunk,
          sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
          format: 'f32',
          data: placeholderData,
        })
      );
      audioTimestamp += chunkDuration;
    }
    return results;
  };

  return (timestamp: number, trackAudios: Float32Array[][]) => {
    const maxLen = Math.max(...trackAudios.map((a) => a[0]?.length ?? 0));
    for (let bufIdx = 0; bufIdx < maxLen; bufIdx++) {
      let ch0 = 0;
      let ch1 = 0;
      for (let trackIdx = 0; trackIdx < trackAudios.length; trackIdx++) {
        const c0 = trackAudios[trackIdx][0]?.[bufIdx] ?? 0;
        // If mono PCM, duplicate first channel to second channel
        const c1 = trackAudios[trackIdx][1]?.[bufIdx] ?? c0;
        ch0 += c0;
        ch1 += c1;
      }
      // Mix multiple track audio data and write to buffer
      channelBuf[writePos] = ch0;
      channelBuf[writePos + 1] = ch1;
      writePos += 2;
    }
    // Consume buffer data and generate AudioData
    return getAudioData(timestamp);
  };
}
