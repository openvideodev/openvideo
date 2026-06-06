import { Application } from "pixi.js";
import { DEFAULT_AUDIO_CONF, getDefaultAudioConf, type IClip, Transition } from "./clips";
import { recodemux } from "wrapbox";
import { Log } from "./utils/log";
import EventEmitter from "./event-emitter";
import {
  clipToJSON,
  jsonToClip,
  type ClipJSON,
  type ProjectJSON,
  type GlobalTransitionJSON as TransitionJSON,
} from "./json-serialization";
import { Video } from "./clips/video-clip";
import { Image } from "./clips/image-clip";
import { yieldToScheduler, waitEncoderQueue } from "./compositor/scheduler";
import { createSpritesRender } from "./compositor/compositor-renderer";
import { createAVEncoder } from "./compositor/av-encoder";

export interface ICompositorOpts {
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  backgroundColor?: string;
  format?: string;
  videoCodec?: string;
  /**
   * If false, exclude audio track from the output video
   */
  audio?: false;
  audioCodec?: string;
  audioSampleRate?: number;
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
  "export:progress": number;
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
    } = {},
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
            codec: args.videoCodec ?? "avc1.42E032",
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

  private explicitOpts: ICompositorOpts;

  private hasVideoTrack: boolean;

  // Original project dimensions from JSON (for scaling clips to export dimensions)
  private jsonDimensions: { width: number; height: number } = { width: 0, height: 0 };

  /**
   * Create a compositor instance based on configuration
   * @param opts ICompositorOpts
   */
  constructor(opts: ICompositorOpts = {}) {
    super();
    console.log({ opts });
    const { width = 0, height = 0 } = opts;
    this.canvas = new OffscreenCanvas(width, height);

    this.opts = Object.assign(
      {
        backgroundColor: "#000",
        width: 0,
        height: 0,
        format: "mp4",
        videoCodec: "avc1.42E032",
        audio: true,
        audioCodec: "aac",
        audioSampleRate: 48000,
        bitrate: 5e6,
        fps: 30,
        metaDataTags: null,
      },
      opts,
    );

    this.explicitOpts = { ...opts };

    this.hasVideoTrack = width * height > 0;

    // Initialize codec detection early
    getDefaultAudioConf().catch((err) => {
      this.logger.warn("Failed to detect audio codec:", err);
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
      preference: "webgl", // Force WebGL to avoid WebGPU overhead/failures in Docker
    });

    // Verify that the app is fully initialized
    if (this.pixiApp.renderer == null || this.pixiApp.stage == null) {
      throw new Error("Pixi.js Application failed to initialize properly");
    }

    // Stop the ticker - we manually call render() in the compositor
    // This prevents the ticker from trying to render after cleanup
    try {
      const anyApp = this.pixiApp as any;
      if (anyApp.ticker && typeof anyApp.ticker.stop === "function") {
        anyApp.ticker.stop();
      }
    } catch (e) {
      // ignore if ticker doesn't exist or can't be stopped
    }
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
    this.logger.info("Compositor add clip", logAttrs);

    const cloned = await clip.clone();

    // Provide renderer to cloned clip if Pixi App is ready
    if (
      this.pixiApp != null &&
      this.pixiApp.renderer != null &&
      typeof cloned.setRenderer === "function"
    ) {
      cloned.setRenderer(this.pixiApp.renderer);
    }

    this.logger.info("Compositor add clip ready");
    this.sprites.push(
      Object.assign(cloned, {
        main: opts.main ?? false,
        expired: false,
      }),
    );
    this.sprites.sort((a, b) => a.zIndex - b.zIndex);
  }

  private initMuxer(duration: number) {
    const {
      fps,
      width,
      height,
      videoCodec,
      bitrate,
      audio,
      metaDataTags,
      format,
      audioCodec,
      audioSampleRate,
    } = this.opts;

    // Check if any sprites actually have video capabilities (width > 0 && height > 0)
    // This handles cases where width/height are set but all sprites are audio-only
    const hasVideoSprites = this.sprites.some((sprite) => sprite.width > 0 && sprite.height > 0);

    // Only create video track if we have video track configured AND we have video sprites
    const shouldCreateVideoTrack = this.hasVideoTrack && hasVideoSprites;

    const muxer = recodemux({
      format: format || "mp4",
      video: shouldCreateVideoTrack
        ? {
            width,
            height,
            expectFPS: fps,
            codec: videoCodec,
            bitrate,
            __unsafe_hardwareAcceleration__: this.opts.__unsafe_hardwareAcceleration__,
          }
        : null,
      audio:
        audio === false
          ? null
          : {
              codec: audioCodec || DEFAULT_AUDIO_CONF.codecType,
              sampleRate: audioSampleRate || DEFAULT_AUDIO_CONF.sampleRate,
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
    if (this.sprites.length === 0) throw Error("No sprite added");

    const mainSprite = this.sprites.find((it) => it.main);
    // Max time: prefer main sprite, otherwise use maximum value
    // Filter out Infinity durations to avoid issues
    const durations = this.sprites.map((it) =>
      it.display.to > 0 ? it.display.to : it.display.from + it.duration,
    );
    const finiteDurations = durations.filter((d) => d !== Infinity);

    const maxTime =
      opts.maxTime ??
      (mainSprite != null
        ? mainSprite.display.to > 0
          ? mainSprite.display.to
          : mainSprite.display.from + mainSprite.duration
        : finiteDurations.length > 0
          ? Math.max(...finiteDurations)
          : 0);

    if (maxTime === Infinity || maxTime <= 0) {
      throw Error(
        "Unable to determine the end time, please specify a main sprite, or limit the duration of Image, Audio",
      );
    }
    // Main video's (main) videoTrack duration value is 0
    if (maxTime === -1) {
      this.logger.warn("Unable to determine the end time, process value don't update");
    }

    this.logger.info(`start combinate video, maxTime:${maxTime}`);
    const muxer = this.initMuxer(maxTime);
    const startTime = performance.now();
    const stopMuxer = this.runEncoding(muxer, maxTime, {
      onProgress: (prog) => {
        this.logger.debug("export:progress:", prog);
        this.emit("export:progress", prog);
      },
      onEnded: async () => {
        await muxer.flush();
        this.logger.info("===== output ended =====, cost:", performance.now() - startTime);
        this.emit("export:progress", 1);
        this.destroy();
      },
      onError: (err) => {
        this.emit("error", err);
        muxer.close();
        this.destroy();
      },
    });

    this.stopOutput = () => {
      stopMuxer();
      muxer.close();
    };

    return muxer.stream;
  }

  /**
   * Destroy instance and release resources
   */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopOutput?.();
    this.off("export:progress");
    this.off("error");

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
        if (anyApp.ticker && typeof anyApp.ticker.stop === "function") {
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
        console.warn("Error while destroying Pixi application:", err);
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
    },
  ): () => void {
    let progress = 0;
    const aborter = { aborted: false };
    let err: Error | null = null;
    let renderSprites: ReturnType<typeof createSpritesRender> | null = null;

    const run = async () => {
      const { fps, backgroundColor, audio: outputAudio } = this.opts;
      const timeSlice = Math.round(1e6 / fps);

      // Check if any sprites actually have video capabilities
      const hasVideoSprites = this.sprites.some((sprite) => sprite.width > 0 && sprite.height > 0);

      // Calculate scale from original project dimensions to export dimensions
      const jsonWidth = this.jsonDimensions.width || this.opts.width || 1920;
      const jsonHeight = this.jsonDimensions.height || this.opts.height || 1080;
      const scaleX = this.opts.width > 0 ? this.opts.width / jsonWidth : 1;
      const scaleY = this.opts.height > 0 ? this.opts.height / jsonHeight : 1;

      renderSprites = createSpritesRender({
        pixiApp: this.pixiApp,
        backgroundColor,
        sprites: this.sprites,
        aborter,
        scaleX,
        scaleY,
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
      // Batch multiple frames between yields to reduce browser rendering
      // pipeline overhead.
      const FRAMES_PER_YIELD = 4;
      let framesSinceYield = 0;

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

        const { audios, mainSprDone, hasVideo } = await renderSprites.render(timestamp);
        if (mainSprDone) {
          exit();
          await onEnded();
          return;
        }

        if (aborter.aborted) return;

        // Yield to the scheduler periodically so the page stays responsive
        // and the GPU can flush.
        if (this.hasVideoTrack && hasVideo) {
          if (timestamp === 0) {
            // For the very first frame use a real setTimeout so the GPU has
            // time to finish shader compilation before we capture the canvas.
            await new Promise((resolve) => setTimeout(resolve, 50));
            framesSinceYield = 0;
          } else {
            framesSinceYield++;
            if (framesSinceYield >= FRAMES_PER_YIELD) {
              await yieldToScheduler();
              framesSinceYield = 0;
            }
          }
        }

        await encodeFrame(timestamp, audios, hasVideo);

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
    const clips: Record<string, ClipJSON> = {};
    for (const sprite of this.sprites) {
      clips[sprite.id] = clipToJSON(sprite, sprite.main);
    }

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
              (c instanceof Video || c instanceof Image),
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
        backgroundColor: this.opts.backgroundColor,
        format: this.opts.format,
        videoCodec: this.opts.videoCodec,
        bitrate: this.opts.bitrate,
        audio: this.opts.audio,
        audioCodec: this.opts.audioCodec,
        audioSampleRate: this.opts.audioSampleRate,
        metaDataTags: this.opts.metaDataTags,
      },
    };
  }

  /**
   * Load clips from JSON
   * @param json The JSON project data
   */
  async loadFromJSON(json: ProjectJSON): Promise<void> {
    console.log({ json });
    // Clear existing sprites
    this.sprites.forEach((sprite) => {
      sprite.destroy();
    });
    this.sprites = [];

    // Update settings if provided, but never overwrite options that were
    // explicitly passed to the constructor (e.g. user-chosen export settings).
    let dimensionsChanged = false;
    if (json.settings) {
      if (json.settings.width !== undefined && this.explicitOpts.width === undefined) {
        if (this.opts.width !== json.settings.width) dimensionsChanged = true;
        this.opts.width = json.settings.width;
      }
      if (json.settings.height !== undefined && this.explicitOpts.height === undefined) {
        if (this.opts.height !== json.settings.height) dimensionsChanged = true;
        this.opts.height = json.settings.height;
      }

      // Resize canvas and renderer if dimensions changed
      if (dimensionsChanged && this.opts.width > 0 && this.opts.height > 0) {
        this.canvas.width = this.opts.width;
        this.canvas.height = this.opts.height;
        if (this.pixiApp?.renderer) {
          this.pixiApp.renderer.resize(this.opts.width, this.opts.height);
        }
      }

      // Store original JSON dimensions for scaling clips during render
      if (json.settings.width && json.settings.height) {
        this.jsonDimensions = { width: json.settings.width, height: json.settings.height };
      }
      if (json.settings.fps !== undefined && this.explicitOpts.fps === undefined)
        this.opts.fps = json.settings.fps;
      if (
        json.settings.backgroundColor !== undefined &&
        this.explicitOpts.backgroundColor === undefined
      )
        this.opts.backgroundColor = json.settings.backgroundColor;
      if (json.settings.format !== undefined && this.explicitOpts.format === undefined)
        this.opts.format = json.settings.format;
      if (json.settings.videoCodec !== undefined && this.explicitOpts.videoCodec === undefined)
        this.opts.videoCodec = json.settings.videoCodec;
      if (json.settings.bitrate !== undefined && this.explicitOpts.bitrate === undefined)
        this.opts.bitrate = json.settings.bitrate;
      if (json.settings.audio !== undefined && this.explicitOpts.audio === undefined) {
        this.opts.audio = json.settings.audio === false ? false : (undefined as any);
      }
      if (json.settings.audioCodec !== undefined && this.explicitOpts.audioCodec === undefined)
        this.opts.audioCodec = json.settings.audioCodec;
      if (
        json.settings.audioSampleRate !== undefined &&
        this.explicitOpts.audioSampleRate === undefined
      )
        this.opts.audioSampleRate = json.settings.audioSampleRate;
      if (json.settings.metaDataTags !== undefined && this.explicitOpts.metaDataTags === undefined)
        this.opts.metaDataTags = json.settings.metaDataTags;
    }

    // Build map of clipId -> zIndex based on tracks
    const clipZIndices = new Map<string, number>();
    if (json.tracks) {
      const totalTracks = json.tracks.length;
      json.tracks.forEach((track, trackIndex) => {
        if (track.clipIds) {
          for (const cid of track.clipIds) {
            // Track 0 -> Highest Z-index
            clipZIndices.set(cid, (totalTracks - trackIndex) * 10);
          }
        }
      });
    }

    // Load all clips
    const clipsArray = Object.values(json.clips ?? {});

    for (const clipJSON of clipsArray) {
      const clip = await jsonToClip(clipJSON);

      // Apply zIndex from track order if available
      if (clipZIndices.has(clip.id)) {
        clip.zIndex = clipZIndices.get(clip.id)!;
      }

      await this.addSprite(clip, { main: clipJSON.main || false });
    }

    // Restore transition links on target clips and recalculate timing
    for (const clip of this.sprites) {
      if (clip instanceof Transition) {
        const fromClip = clip.fromClipId
          ? this.sprites.find((s) => s.id === clip.fromClipId)
          : null;
        const toClip = clip.toClipId ? this.sprites.find((s) => s.id === clip.toClipId) : null;

        // Recalculate transition timing based on actual clip positions
        // Transition should be centered at the junction between fromClip ending and toClip starting
        if (fromClip && toClip) {
          const toStart = toClip.display.from;

          // Transition is centered at the junction (overlap between fromClip ending and toClip starting)
          const transitionStart = Math.max(0, toStart - clip.duration / 2);
          const transitionEnd = transitionStart + clip.duration;
          // Update transition clip timing
          clip.display.from = transitionStart;
          clip.display.to = transitionEnd;
        }

        const transitionMeta = {
          name: clip.transitionKey,
          key: clip.transitionKey,
          duration: clip.duration,
          fromClipId: clip.fromClipId,
          toClipId: clip.toClipId,
          start: clip.display.from,
          end: clip.display.to,
        };

        if (fromClip) {
          (fromClip as any).transition = { ...transitionMeta };
        }

        if (toClip) {
          (toClip as any).transition = { ...transitionMeta };
        }
      }
    }
  }

  /**
   * Renders the frame at the given time and returns it as a base64-encoded PNG.
   *
   * Initialises the internal Pixi application on demand (if not already
   * initialised), performs a single-frame render using the same sprite
   * pipeline as {@link output}, and returns the result without modifying
   * the compositor's encoding state.
   *
   * @param timeMs Time in milliseconds
   * @returns Base64 data-URL string (e.g. "data:image/png;base64,...")
   *
   * @example
   * const compositor = new Compositor({ width: 1280, height: 720 });
   * await compositor.addSprite(videoClip);
   * const frame = await compositor.renderFrame(2000); // frame at 2 s
   */
  public async renderFrame(timeMs: number): Promise<string> {
    if (this.destroyed) {
      throw new Error("Compositor has been destroyed.");
    }

    // Lazily initialise Pixi so callers don't have to call initPixiApp() first
    if (this.pixiApp == null) {
      await this.initPixiApp();
    }

    if (this.pixiApp == null) {
      throw new Error(
        "Compositor Pixi application could not be initialised. " +
          "Ensure width and height are greater than 0.",
      );
    }

    // Convert milliseconds → microseconds (internal timeline unit)
    const timeUs = timeMs * 1000;

    // Use the same rendering pipeline as the encoder, but for a single frame.
    // Sprites must NOT be marked expired before this call — use a fresh aborter.
    const jsonWidth = this.jsonDimensions.width || this.opts.width || 1920;
    const jsonHeight = this.jsonDimensions.height || this.opts.height || 1080;
    const spriteRender = createSpritesRender({
      pixiApp: this.pixiApp,
      backgroundColor: this.opts.backgroundColor,
      sprites: this.sprites,
      aborter: { aborted: false },
      scaleX: this.opts.width > 0 ? this.opts.width / jsonWidth : 1,
      scaleY: this.opts.height > 0 ? this.opts.height / jsonHeight : 1,
    });

    try {
      await spriteRender.render(timeUs);
    } finally {
      // Clean up temporary containers / renderers created by createSpritesRender
      spriteRender.cleanup();
    }

    // Extract the rendered frame from the Pixi stage as a base64 PNG
    const base64 = await (this.pixiApp.renderer.extract as any).base64(
      this.pixiApp.stage,
      "image/png",
      1,
    );

    return base64;
  }
}
