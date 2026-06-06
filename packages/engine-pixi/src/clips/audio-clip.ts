import { Log } from "../utils/log";
import { extractPCM4AudioBuffer, ringSliceFloat32Array, getEaseFactor } from "../utils";
import { BaseClip } from "./base-clip";
import { DEFAULT_AUDIO_CONF, type IClip, type IPlaybackCapable } from "./iclip";
import type { AudioJSON } from "../json-serialization";
import { ResourceManager } from "../studio/resource-manager";

interface IAudioOpts {
  loop?: boolean;
  volume?: number;
}

/**
 * Audio clip providing audio data for creating and editing audio/video
 *
 * @example
 * // Load audio clip asynchronously
 * const audioClip = await Audio.fromUrl('path/to/audio.mp3', {
 *   loop: true,
 * });
 *
 * @example
 * // Traditional approach (for advanced use)
 * new Audio((await fetch('<mp3 url>')).body, {
 *   loop: true,
 * }),
 */
export class Audio extends BaseClip implements IPlaybackCapable {
  readonly type = "Audio";
  static ctx: AudioContext | null = null;

  ready: IClip["ready"];

  private _meta = {
    // microseconds
    duration: 0,
    width: 0,
    height: 0,
  };

  /**
   * Audio metadata
   *
   * ⚠️ Note, these are converted (normalized) metadata, not original audio metadata
   */
  get meta() {
    return {
      ...this._meta,
      sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
      chanCount: 2,
    };
  }

  // Use type assertion to avoid type compatibility issues between ArrayBufferLike and ArrayBuffer
  private chan0Buf: Float32Array = new Float32Array();
  private chan1Buf: Float32Array = new Float32Array();
  /**
   * Get complete PCM data from audio clip
   */
  getPCMData(): Float32Array[] {
    return [this.chan0Buf, this.chan1Buf];
  }

  private opts;

  /**
   * Whether to loop the audio (hybrid JSON structure)
   */
  loop: boolean = false;

  /**
   * Load an audio clip from a URL
   * @param url Audio URL
   * @param opts Audio configuration (loop, volume)
   * @returns Promise that resolves to an audio clip
   *
   * @example
   * const audioClip = await Audio.fromUrl('path/to/audio.mp3', {
   *   loop: true,
   *   volume: 0.8,
   * });
   */
  static async fromUrl(url: string, opts: IAudioOpts = {}): Promise<Audio> {
    const stream = await ResourceManager.getReadableStream(url);
    const clip = new Audio(stream, opts, url);
    // await clip.ready; - Removed for performance
    return clip;
  }

  /**
   * Create an Audio instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to an Audio instance
   */
  static async fromObject(json: AudioJSON): Promise<Audio> {
    if (json.type !== "Audio") {
      throw new Error(`Expected Audio, got ${json.type}`);
    }
    if (!json.src || json.src.trim() === "") {
      throw new Error("Audio requires a valid source URL");
    }

    // Support both new flat structure and old options structure
    const options: IAudioOpts = {};
    if (json.loop !== undefined) options.loop = json.loop;
    if (json.volume !== undefined) options.volume = json.volume;
    const clip = await Audio.fromUrl(json.src, options);
    // clip.ready is not awaited here for performance

    // Apply properties
    if (json.transform) {
      clip.left = json.transform.x;
      clip.top = json.transform.y;
      clip.width = json.transform.width;
      clip.height = json.transform.height;
      clip.angle = json.transform.angle;
      clip.zIndex = json.transform.zIndex;
      clip.opacity = json.transform.opacity;
    }

    const timing = json.timing || {
      display: json.display || { from: 0, to: 0 },
      trim: json.trim || { from: 0, to: 0 },
      duration: json.duration ?? 0,
      playbackRate: json.playbackRate ?? 1,
    };

    clip.display.from = timing.display.from;
    clip.display.to = timing.display.to;
    clip.duration = timing.duration;
    clip.playbackRate = timing.playbackRate;
    if (timing.fadeIn !== undefined) clip.timing.fadeIn = timing.fadeIn;
    if (timing.fadeOut !== undefined) clip.timing.fadeOut = timing.fadeOut;

    // Apply animation if present
    if (json.animation) {
      clip.setAnimation(json.animation.keyFrames, json.animation.options);
    }

    // Apply trim if present
    const trim = json.trim || timing.trim;
    if (trim) {
      clip.trim.from = trim.from;
      clip.trim.to = trim.to;
    }

    return clip;
  }

  /**
   *
   * @param dataSource Audio file stream
   * @param opts Audio configuration, controls volume and whether to loop
   */
  constructor(
    dataSource: ReadableStream<Uint8Array> | Float32Array[],
    opts: IAudioOpts = {},
    src?: string,
  ) {
    super();
    // Always set src, defaulting to empty string if not provided
    this.src = src !== undefined ? src : "";
    this.opts = {
      loop: false,
      volume: 1,
      ...opts,
    };
    this.loop = this.opts.loop ?? false;
    this.volume = this.opts.volume ?? 1;

    // Override the ready promise from BaseClip with our initialization
    this.ready = this.init(dataSource).then((_meta_t) => {
      // audio has no width/height, no need to draw
      const clipMeta = {
        width: 0,
        height: 0,
        duration: opts.loop ? Infinity : this._meta.duration,
      };
      // Update rect and duration from meta (BaseClip pattern)
      this.width = this.width === 0 ? clipMeta.width : this.width;
      this.height = this.height === 0 ? clipMeta.height : this.height;
      this.duration = this.duration === 0 ? clipMeta.duration : this.duration;
      // Update display.to when duration changes
      this.display.to = this.display.from + this.duration;

      // Update trim.to if not set or exceeds meta duration
      this.trim.to =
        this.trim.to === 0 ? this._meta.duration : Math.min(this.trim.to, this._meta.duration);
      this.trim.from = Math.min(this.trim.from, this.trim.to);

      return clipMeta;
    });
  }

  private async init(dataSource: ReadableStream<Uint8Array> | Float32Array[]): Promise<void> {
    if (Audio.ctx == null) {
      Audio.ctx = new AudioContext({
        sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
      });
    }

    const pcm =
      dataSource instanceof ReadableStream
        ? await parseStream2PCM(dataSource, Audio.ctx)
        : dataSource;

    this._meta.duration = (pcm[0].length / DEFAULT_AUDIO_CONF.sampleRate) * 1e6;

    this.chan0Buf = pcm[0];
    // Mono to stereo conversion
    this.chan1Buf = pcm[1] ?? this.chan0Buf;
  }

  /**
   * Intercept data returned by {@link Audio.tick} method for secondary processing of audio data
   * @param time Time when tick was called
   * @param tickRet Data returned by tick
   *
   */
  tickInterceptor: <T extends Awaited<ReturnType<Audio["tick"]>>>(
    time: number,
    tickRet: T,
  ) => Promise<T> = async (_, tickRet) => tickRet;

  // microseconds
  private timestamp = 0;
  private frameOffset = 0;
  /**
   * Return audio PCM data corresponding to the time difference between last and current moments
   *
   * If the difference exceeds 3s or current time is less than last time, reset state
   * @example
   * tick(0) // => []
   * tick(1e6) // => [leftChanPCM(1s), rightChanPCM(1s)]
   *
   */
  async tick(time: number): Promise<{
    audio: Float32Array[];
    state: "success" | "done";
  }> {
    const trimmedTime = time + this.trim.from;
    const deltaTime = trimmedTime - this.timestamp;

    // reset
    if (trimmedTime < this.timestamp || deltaTime > 3e6) {
      this.timestamp = trimmedTime;
      this.frameOffset = Math.ceil((this.timestamp / 1e6) * DEFAULT_AUDIO_CONF.sampleRate);
      return await this.tickInterceptor(time, {
        audio: [new Float32Array(0), new Float32Array(0)],
        state: "success",
      });
    }

    this.timestamp = trimmedTime;
    const frameCnt = Math.ceil((deltaTime / 1e6) * DEFAULT_AUDIO_CONF.sampleRate);
    const endIdx = this.frameOffset + frameCnt;
    const audio = this.opts.loop
      ? [
          ringSliceFloat32Array(this.chan0Buf, this.frameOffset, endIdx),
          ringSliceFloat32Array(this.chan1Buf, this.frameOffset, endIdx),
        ]
      : [
          this.chan0Buf.slice(this.frameOffset, endIdx),
          this.chan1Buf.slice(this.frameOffset, endIdx),
        ];

    if (this.volume !== 1) {
      for (const chan of audio) {
        for (let i = 0; i < chan.length; i++) {
          chan[i] *= this.volume;
        }
      }
    }

    this.frameOffset = endIdx;

    return await this.tickInterceptor(time, { audio, state: "success" });
  }

  /**
   * Split is handled by core state, not implemented here
   */
  async split(_time: number): Promise<[this, this]> {
    throw new Error("Audio.split is not implemented - use core state instead");
  }

  async clone() {
    await this.ready;
    const clip = new Audio(this.getPCMData(), this.opts, this.src) as this;
    await clip.ready;
    // Copy sprite state (animations, opacity, rect, etc.) to the cloned clip
    this.copyStateTo(clip);
    return clip;
  }

  /**
   * Destroy instance and release resources
   */
  destroy(): void {
    this.chan0Buf = new Float32Array(0);
    this.chan1Buf = new Float32Array(0);
    Log.info("---- audioclip destroy ----");
    super.destroy();
  }

  toJSON(_main: boolean = false): AudioJSON {
    return {
      id: this.id,
      type: "Audio",
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
      loop: this.loop,
      volume: this.volume,
      locked: this.locked,
      metadata: this.metadata,
    } as AudioJSON;
  }

  /**
   * Create HTMLAudioElement for playback
   */
  async createPlaybackElement(): Promise<{
    element: HTMLAudioElement;
    objectUrl?: string;
  }> {
    await this.ready;

    if (!this.src || this.src.trim() === "") {
      throw new Error("Audio requires a source URL for playback");
    }

    // For AudioClip, src is already a URL (from fromUrl or JSON)
    const objectUrl = this.src.startsWith("blob:") ? this.src : undefined;
    const audio = document.createElement("audio");

    audio.crossOrigin = "anonymous";
    audio.autoplay = false;
    audio.preload = "auto";
    audio.loop = this.opts.loop || false;
    audio.src = this.src;

    // Wait for audio to be ready
    await new Promise<void>((resolve, reject) => {
      const onLoadedData = () => {
        audio.removeEventListener("loadeddata", onLoadedData);
        audio.removeEventListener("error", onError);
        audio.pause();
        audio.currentTime = 0;
        resolve();
      };
      const onError = () => {
        audio.removeEventListener("loadeddata", onLoadedData);
        audio.removeEventListener("error", onError);
        reject(new Error("Failed to load audio"));
      };
      audio.addEventListener("loadeddata", onLoadedData, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });

    return { element: audio, objectUrl };
  }

  async play(element: HTMLVideoElement | HTMLAudioElement, timeSeconds: number): Promise<void> {
    const audio = element as HTMLAudioElement;
    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    // Set time if needed
    if (Math.abs(audio.currentTime - trimmedTime) > 0.1) {
      audio.currentTime = trimmedTime;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch (_err) {
        // Retry once on failure
        try {
          await audio.play();
        } catch (retryErr) {
          console.warn("Failed to play audio:", retryErr);
        }
      }
    }
  }

  pause(element: HTMLVideoElement | HTMLAudioElement): void {
    const audio = element as HTMLAudioElement;
    audio.pause();
  }

  async seek(element: HTMLVideoElement | HTMLAudioElement, timeSeconds: number): Promise<void> {
    const audio = element as HTMLAudioElement;
    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    audio.pause();
    audio.currentTime = trimmedTime;

    // Wait for seek to complete
    return new Promise<void>((resolve) => {
      if (Math.abs(audio.currentTime - timeSeconds) < 0.01) {
        resolve();
        return;
      }

      const onSeeked = () => {
        audio.removeEventListener("seeked", onSeeked);
        resolve();
      };

      audio.addEventListener("seeked", onSeeked, { once: true });

      // Timeout after 500ms
      setTimeout(() => {
        audio.removeEventListener("seeked", onSeeked);
        resolve();
      }, 500);
    });
  }

  syncPlayback(
    element: HTMLVideoElement | HTMLAudioElement,
    isPlaying: boolean,
    timeSeconds: number,
  ): void {
    const audio = element as HTMLAudioElement;
    const clipDuration =
      this.duration && this.duration !== Infinity
        ? this.duration / 1e6
        : (this.display.to - this.display.from) / 1e6;
    const isWithinClip = timeSeconds >= 0 && timeSeconds < clipDuration;

    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    // Compute fade volume multiplier for preview
    const clipDurationMs = clipDuration * 1000;
    const timeMs = timeSeconds * 1000;
    let fadeMultiplier = 1.0;
    if (
      this.timing.fadeIn &&
      this.timing.fadeIn.duration > 0 &&
      timeMs < this.timing.fadeIn.duration
    ) {
      fadeMultiplier *= getEaseFactor(
        timeMs / this.timing.fadeIn.duration,
        this.timing.fadeIn.curve,
      );
    }
    if (this.timing.fadeOut && this.timing.fadeOut.duration > 0) {
      const fadeOutStartMs = clipDurationMs - this.timing.fadeOut.duration;
      if (timeMs >= fadeOutStartMs) {
        const t = 1.0 - (timeMs - fadeOutStartMs) / this.timing.fadeOut.duration;
        fadeMultiplier *= getEaseFactor(t, this.timing.fadeOut.curve);
      }
    }
    // Sync volume with fade applied
    audio.volume = Math.max(0, Math.min(1, this.volume * fadeMultiplier));

    if (isPlaying && isWithinClip) {
      // Should be playing
      if (audio.paused) {
        this.play(audio, timeSeconds).catch(console.warn);
      }
    } else {
      // Should be paused
      if (!audio.paused) {
        audio.pause();
      }

      // Update time when paused
      if (isWithinClip && Math.abs(audio.currentTime - trimmedTime) > 0.1) {
        audio.currentTime = trimmedTime;
      }
    }
  }

  cleanupPlayback(element: HTMLVideoElement | HTMLAudioElement, objectUrl?: string): void {
    const audio = element as HTMLAudioElement;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    if (objectUrl && objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

async function parseStream2PCM(
  stream: ReadableStream<Uint8Array>,
  ctx: AudioContext | OfflineAudioContext,
): Promise<Float32Array[]> {
  const buf = await new Response(stream).arrayBuffer();
  return extractPCM4AudioBuffer(await ctx.decodeAudioData(buf));
}
