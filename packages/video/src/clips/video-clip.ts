import type { MP4Info, MP4Sample } from 'wrapbox';
import { file, tmpfile, write } from 'opfs-tools';
import { Log } from '../utils/log';
import {
  createVFRotater,
  extractFileConfig,
  parseMatrix,
  quickParseMP4File,
} from '../mp4-utils/mp4box-utils';
import { audioResample, extractPCM4AudioData, sleep } from '../utils';
import { BaseClip } from './base-clip';
import { DEFAULT_AUDIO_CONF, type IClip, type IPlaybackCapable } from './iclip';
import { type VideoClipJSON } from '../json-serialization';
import { AssetManager } from '../utils/asset-manager';

let CLIP_ID = 0;

type OPFSToolFile = ReturnType<typeof file>;
function isOTFile(obj: any): obj is OPFSToolFile {
  return obj.kind === 'file' && obj.createReader instanceof Function;
}

// Internally used for creating VideoClip instances
type MPClipCloneArgs = Awaited<ReturnType<typeof mp4FileToSamples>> & {
  localFile: OPFSToolFile;
};

interface MP4DecoderConf {
  video: VideoDecoderConfig | null;
  audio: AudioDecoderConfig | null;
}

export interface IMP4ClipOpts {
  audio?: boolean | { volume: number };
  /**
   * Unsafe, may be deprecated at any time
   */
  __unsafe_hardwareAcceleration__?: HardwarePreference;
}

type ExtMP4Sample = Omit<MP4Sample, 'data'> & {
  is_idr: boolean;
  deleted?: boolean;
  data: null | Uint8Array;
};

type LocalFileReader = Awaited<ReturnType<OPFSToolFile['createReader']>>;

/**
 * Video clip, parses MP4 files, uses {@link VideoClip.tick} to decode image frames at specified time on demand
 *
 * Can be used to implement video frame extraction, thumbnail generation, video editing and other functions
 *
 * @example
 * // Load video clip asynchronously
 * const videoClip = await VideoClip.fromUrl('clip.mp4', {
 *   x: 0,
 *   y: 0,
 *   width: 1920,
 *   height: 1080,
 * });
 *
 * // Set timeline position
 * videoClip.set({
 *   display: {
 *     from: 150, // frames
 *     to: 450, // frames (10 seconds at 30fps)
 *   },
 * });
 *
 */
export class VideoClip extends BaseClip implements IPlaybackCapable {
  readonly type = 'Video';
  private insId = CLIP_ID++;

  private logger = Log.create(`VideoClip id:${this.insId},`);

  ready: IClip['ready'];

  private _meta = {
    // microseconds
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0,
  };

  get meta() {
    return { ...this._meta };
  }

  private localFile: OPFSToolFile;

  /** Store binary data of video header (box: ftyp, moov) */
  private headerBoxPos: Array<{ start: number; size: number }> = [];
  /**
   * Provide binary data of video header (box: ftyp, moov)
   * Use any mp4 demuxer to parse and get detailed video information
   * Unit tests include sample code using mp4box.js
   */
  async getFileHeaderBinData() {
    await this.ready;
    const oFile = await this.localFile.getOriginFile();
    if (oFile == null) throw Error('VideoClip localFile is not origin file');

    return await new Blob(
      this.headerBoxPos.map(({ start, size }) =>
        oFile.slice(start, start + size)
      )
    ).arrayBuffer();
  }

  /** Store video transform and rotation info, currently only restores rotation */
  private parsedMatrix = {
    perspective: 1,
    rotationRad: 0,
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
  };
  private vfRotater: (vf: VideoFrame | null) => VideoFrame | null = (vf) => vf;

  private videoSamples: ExtMP4Sample[] = [];

  private audioSamples: ExtMP4Sample[] = [];

  private videoFrameFinder: VideoFrameFinder | null = null;
  private audioFrameFinder: AudioFrameFinder | null = null;

  private decoderConf: {
    video: VideoDecoderConfig | null;
    audio: AudioDecoderConfig | null;
  } = {
    video: null,
    audio: null,
  };

  private opts: IMP4ClipOpts = { audio: true };

  /**
   * Whether to include audio track (hybrid JSON structure)
   */
  audio: boolean = true;

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
   * Load a video clip from a URL
   * @param url Video URL
   * @param opts Position and size options
   * @returns Promise that resolves to a video clip
   *
   * @example
   * const videoClip = await VideoClip.fromUrl('clip.mp4', {
   *   x: 0,
   *   y: 0,
   *   width: 1920,
   *   height: 1080,
   * });
   */
  static async fromUrl(
    url: string,
    opts: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<VideoClip> {
    const cachedFile = await AssetManager.get(url);
    if (cachedFile) {
      const clip = new VideoClip(cachedFile, {}, url);
      await clip.ready;
      // Set position and size
      if (opts.x !== undefined) clip.left = opts.x;
      if (opts.y !== undefined) clip.top = opts.y;
      if (opts.width !== undefined) clip.width = opts.width;
      if (opts.height !== undefined) clip.height = opts.height;
      return clip;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch video from ${url}: ${response.status} ${response.statusText}`
      );
    }

    // Store in OPFS while loading
    const stream = response.body!;
    const [s1, s2] = stream.tee();

    const clipPromise = (async () => {
      const clip = new VideoClip(s1, {}, url);
      await clip.ready;
      return clip;
    })();

    const cachePromise = AssetManager.put(url, s2);

    const [clip] = await Promise.all([clipPromise, cachePromise]);

    // Set position and size
    if (opts.x !== undefined) clip.left = opts.x;
    if (opts.y !== undefined) clip.top = opts.y;
    if (opts.width !== undefined) clip.width = opts.width;
    if (opts.height !== undefined) clip.height = opts.height;

    return clip;
  }

  constructor(
    source: OPFSToolFile | ReadableStream<Uint8Array> | MPClipCloneArgs,
    opts: IMP4ClipOpts = {},
    src?: string
  ) {
    super();
    // Always set src, defaulting to empty string if not provided
    this.src = src !== undefined ? src : '';
    if (
      !(source instanceof ReadableStream) &&
      !isOTFile(source) &&
      !Array.isArray(source.videoSamples)
    ) {
      throw Error('Illegal argument');
    }

    this.opts = { audio: true, ...opts };
    this.audio = typeof this.opts.audio === 'boolean' ? this.opts.audio : true;
    this.volume =
      typeof opts.audio === 'object' && 'volume' in opts.audio
        ? opts.audio.volume
        : ((opts as any).volume ?? 1);

    const initByStream = async (s: ReadableStream) => {
      await write(this.localFile, s);
      return this.localFile;
    };

    this.localFile = isOTFile(source)
      ? source
      : 'localFile' in source
        ? source.localFile // from clone
        : tmpfile();

    // Override the ready promise from BaseClip with our initialization
    this.ready = (
      source instanceof ReadableStream
        ? initByStream(source).then((otFile) =>
            mp4FileToSamples(otFile, this.opts)
          )
        : isOTFile(source)
          ? mp4FileToSamples(source, this.opts)
          : Promise.resolve(source)
    ).then(
      async ({
        videoSamples,
        audioSamples,
        decoderConf,
        headerBoxPos,
        parsedMatrix,
      }) => {
        this.videoSamples = videoSamples;
        this.audioSamples = audioSamples;
        this.decoderConf = decoderConf;
        this.headerBoxPos = headerBoxPos;
        this.parsedMatrix = parsedMatrix;

        const { videoFrameFinder, audioFrameFinder } = genDecoder(
          {
            video:
              decoderConf.video == null
                ? null
                : {
                    ...decoderConf.video,
                    hardwareAcceleration:
                      this.opts.__unsafe_hardwareAcceleration__,
                  },
            audio: decoderConf.audio,
          },
          await this.localFile.createReader(),
          videoSamples,
          audioSamples,
          this.opts.audio !== false ? this.volume : 0
        );
        this.videoFrameFinder = videoFrameFinder;
        this.audioFrameFinder = audioFrameFinder;

        const { codedWidth, codedHeight } = decoderConf.video ?? {};
        if (codedWidth && codedHeight) {
          this.vfRotater = createVFRotater(
            codedWidth,
            codedHeight,
            parsedMatrix.rotationDeg
          );
        }

        this._meta = genMeta(
          decoderConf,
          videoSamples,
          audioSamples,
          parsedMatrix.rotationDeg
        );

        this.logger.info('VideoClip meta:', this._meta);
        const meta = { ...this._meta };
        // Update rect and duration from meta (BaseClip pattern)
        this.width = this.width === 0 ? meta.width : this.width;
        this.height = this.height === 0 ? meta.height : this.height;

        // Update trim.to if not set
        this.trim.to = this.trim.to === 0 ? meta.duration : this.trim.to;

        const effectiveDuration =
          (this.trim.to - this.trim.from) / this.playbackRate;
        this.duration = this.duration === 0 ? effectiveDuration : this.duration;

        // Update display.to when duration changes
        this.display.to = this.display.from + this.duration;

        // Listen for volume changes to update audio finder
        this.on('propsChange', (props) => {
          if (props.volume !== undefined && this.audioFrameFinder) {
            this.audioFrameFinder.setVolume(props.volume);
          }
        });

        return meta;
      }
    );
  }

  /**
   * Intercept data returned by {@link VideoClip.tick} method for secondary processing of image and audio data
   * @param time Time when tick was called
   * @param tickRet Data returned by tick
   *
   *    */
  tickInterceptor: <T extends Awaited<ReturnType<VideoClip['tick']>>>(
    time: number,
    tickRet: T
  ) => Promise<T> = async (_, tickRet) => tickRet;

  /**
   * Get image frame and audio data at specified time
   * @param time Time in microseconds
   */
  async tick(time: number): Promise<{
    video?: VideoFrame;
    audio: Float32Array[];
    state: 'success' | 'done';
  }> {
    const trimmedTime = time + this.trim.from;
    if (trimmedTime >= this.trim.to || trimmedTime >= this._meta.duration) {
      return await this.tickInterceptor(time, {
        audio: (await this.audioFrameFinder?.find(trimmedTime)) ?? [],
        state: 'done',
      });
    }

    const [audio, video] = await Promise.all([
      this.audioFrameFinder?.find(trimmedTime) ?? [],
      this.videoFrameFinder?.find(trimmedTime).then(this.vfRotater),
    ]);

    if (video == null) {
      return await this.tickInterceptor(time, {
        audio,
        state: 'success',
      });
    }

    return await this.tickInterceptor(time, {
      video,
      audio,
      state: 'success',
    });
  }

  async split(time: number) {
    await this.ready;

    if (time <= 0 || time >= this._meta.duration)
      throw Error('time out of bounds');

    const [preVideoSlice, postVideoSlice] = splitVideoSampleByTime(
      this.videoSamples,
      time
    );
    const [preAudioSlice, postAudioSlice] = splitAudioSampleByTime(
      this.audioSamples,
      time
    );
    const preClip = new VideoClip(
      {
        localFile: this.localFile,
        videoSamples: preVideoSlice ?? [],
        audioSamples: preAudioSlice ?? [],
        decoderConf: this.decoderConf,
        headerBoxPos: this.headerBoxPos,
        parsedMatrix: this.parsedMatrix,
      },
      this.opts,
      this.src
    );
    const postClip = new VideoClip(
      {
        localFile: this.localFile,
        videoSamples: postVideoSlice ?? [],
        audioSamples: postAudioSlice ?? [],
        decoderConf: this.decoderConf,
        headerBoxPos: this.headerBoxPos,
        parsedMatrix: this.parsedMatrix,
      },
      this.opts,
      this.src
    );
    await Promise.all([preClip.ready, postClip.ready]);

    return [preClip, postClip] as [this, this];
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

  async clone() {
    await this.ready;
    const clip = new VideoClip(
      {
        localFile: this.localFile,
        videoSamples: [...this.videoSamples],
        audioSamples: [...this.audioSamples],
        decoderConf: this.decoderConf,
        headerBoxPos: this.headerBoxPos,
        parsedMatrix: this.parsedMatrix,
      },
      this.opts,
      this.src
    );
    await clip.ready;
    clip.tickInterceptor = this.tickInterceptor;
    // Copy sprite state (animations, opacity, rect, etc.) to the cloned clip
    this.copyStateTo(clip);
    // Copy id and effects
    clip.id = this.id;
    clip.effects = [...this.effects];
    return clip as this;
  }

  /**
   * Split VideoClip into VideoClips containing only video track and audio track
   * @returns VideoClip[]
   */
  async splitTrack() {
    await this.ready;
    const clips: VideoClip[] = [];
    if (this.videoSamples.length > 0) {
      const videoClip = new VideoClip(
        {
          localFile: this.localFile,
          videoSamples: [...this.videoSamples],
          audioSamples: [],
          decoderConf: {
            video: this.decoderConf.video,
            audio: null,
          },
          headerBoxPos: this.headerBoxPos,
          parsedMatrix: this.parsedMatrix,
        },
        this.opts,
        this.src
      );
      await videoClip.ready;
      videoClip.tickInterceptor = this.tickInterceptor;
      clips.push(videoClip);
    }
    if (this.audioSamples.length > 0) {
      const audioClip = new VideoClip(
        {
          localFile: this.localFile,
          videoSamples: [],
          audioSamples: [...this.audioSamples],
          decoderConf: {
            audio: this.decoderConf.audio,
            video: null,
          },
          headerBoxPos: this.headerBoxPos,
          parsedMatrix: this.parsedMatrix,
        },
        this.opts,
        this.src
      );
      await audioClip.ready;
      audioClip.tickInterceptor = this.tickInterceptor;
      clips.push(audioClip);
    }

    return clips;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.logger.info('VideoClip destroy');
    super.destroy();

    this.videoFrameFinder?.destroy();
    this.audioFrameFinder?.destroy();
  }

  toJSON(main: boolean = false): VideoClipJSON {
    const base = super.toJSON(main);
    return {
      ...base,
      type: 'Video',
      audio: this.audio,
      volume: this.volume,
      id: this.id,
      effects: this.effects,
    } as VideoClipJSON;
  }

  /**
   * Create a VideoClip instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to a VideoClip instance
   */
  static async fromObject(json: VideoClipJSON): Promise<VideoClip> {
    if (json.type !== 'Video') {
      throw new Error(`Expected Video, got ${json.type}`);
    }

    const response = await fetch(json.src);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch video from ${json.src}: ${response.status} ${response.statusText}. Make sure the file exists in the public directory.`
      );
    }
    // Support both new flat structure and old options structure
    const options =
      json.audio !== undefined
        ? { audio: json.audio, volume: json.volume }
        : { volume: json.volume };
    const clip = new VideoClip(response.body!, options as any, json.src);
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

    // Apply trim if present
    if (json.trim) {
      clip.trim.from =
        json.trim.from < 1e6 ? json.trim.from * 1e6 : json.trim.from;
      clip.trim.to = json.trim.to < 1e6 ? json.trim.to * 1e6 : json.trim.to;
    }

    if (json.volume !== undefined) {
      clip.volume = json.volume;
    }

    return clip;
  }

  /**
   * Create HTMLVideoElement for playback
   */
  async createPlaybackElement(): Promise<{
    element: HTMLVideoElement;
    objectUrl?: string;
  }> {
    await this.ready;

    const mp4ClipAny = this as any;
    const localFile = mp4ClipAny.localFile;

    if (!localFile || typeof localFile.getOriginFile !== 'function') {
      throw new Error('VideoClip does not have a local file for playback');
    }

    const originFile = await localFile.getOriginFile();
    if (!originFile) {
      throw new Error('Failed to get origin file from VideoClip');
    }

    const objectUrl = URL.createObjectURL(originFile);
    const video = document.createElement('video');

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.autoplay = false;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;
    video.src = objectUrl;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      const onLoadedData = () => {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('error', onError);
        video.pause();
        video.currentTime = 0;
        resolve();
      };
      const onError = () => {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to load video'));
      };
      video.addEventListener('loadeddata', onLoadedData, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.load();
    });

    return { element: video, objectUrl };
  }

  async play(
    element: HTMLVideoElement | HTMLAudioElement,
    timeSeconds: number
  ): Promise<void> {
    const video = element as HTMLVideoElement;
    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    // Set time if needed
    if (Math.abs(video.currentTime - trimmedTime) > 0.1) {
      video.currentTime = trimmedTime;
    }

    video.muted = false;

    if (video.paused) {
      try {
        await video.play();
      } catch (err) {
        // Retry once on failure
        try {
          await video.play();
        } catch (retryErr) {
          console.warn('Failed to play video:', retryErr);
        }
      }
    }
  }

  pause(element: HTMLVideoElement | HTMLAudioElement): void {
    const video = element as HTMLVideoElement;
    video.pause();
    video.muted = true;
  }

  async seek(
    element: HTMLVideoElement | HTMLAudioElement,
    timeSeconds: number
  ): Promise<void> {
    const video = element as HTMLVideoElement;
    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    video.pause();
    video.currentTime = trimmedTime;

    // Wait for seek to complete
    return new Promise<void>((resolve) => {
      if (Math.abs(video.currentTime - timeSeconds) < 0.01) {
        resolve();
        return;
      }

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };

      video.addEventListener('seeked', onSeeked, { once: true });

      // Timeout after 500ms
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }, 500);
    });
  }

  syncPlayback(
    element: HTMLVideoElement | HTMLAudioElement,
    isPlaying: boolean,
    timeSeconds: number
  ): void {
    const video = element as HTMLVideoElement;
    const clipDuration = (this.trim.to - this.trim.from) / 1e6;
    const isWithinClip = timeSeconds >= 0 && timeSeconds < clipDuration;

    const trimmedTime = timeSeconds + this.trim.from / 1e6;
    // Sync volume
    video.volume = this.volume;

    if (isPlaying && isWithinClip) {
      // Should be playing
      if (video.paused) {
        this.play(video, timeSeconds).catch(console.warn);
      } else {
        // Already playing - minimal checks
        if (video.muted) {
          video.muted = false;
        }
        // Restart if ended
        if (video.ended || video.currentTime >= this.trim.to / 1e6) {
          video.currentTime = trimmedTime;
          video.play().catch(console.warn);
        }
      }
    } else {
      // Should be paused
      if (!video.paused) {
        video.pause();
      }
      video.muted = true;

      // Update time when paused
      if (isWithinClip && Math.abs(video.currentTime - trimmedTime) > 0.1) {
        video.currentTime = trimmedTime;
      }
    }
  }

  cleanupPlayback(
    element: HTMLVideoElement | HTMLAudioElement,
    objectUrl?: string
  ): void {
    const video = element as HTMLVideoElement;
    video.pause();
    video.removeAttribute('src');
    video.load();

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Scale clip to fit within the scene dimensions while maintaining aspect ratio
   * Similar to fabric.js scaleToFit
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
   * May crop parts of the clip. Similar to fabric.js scaleToFill
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
   * Similar to fabric.js center
   * @param sceneWidth Scene width
   * @param sceneHeight Scene height
   */
  centerInScene(sceneWidth: number, sceneHeight: number): void {
    this.left = (sceneWidth - this.width) / 2;
    this.top = (sceneHeight - this.height) / 2;
  }
}

function genMeta(
  decoderConf: MP4DecoderConf,
  videoSamples: ExtMP4Sample[],
  audioSamples: ExtMP4Sample[],
  rotationDeg: number
) {
  const meta = {
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0,
  };
  if (decoderConf.video != null && videoSamples.length > 0) {
    meta.width = decoderConf.video.codedWidth ?? 0;
    meta.height = decoderConf.video.codedHeight ?? 0;
    // 90, 270 degrees, need to swap width and height
    const normalizedRotation = (Math.round(rotationDeg / 90) * 90 + 360) % 360;
    if (normalizedRotation === 90 || normalizedRotation === 270) {
      [meta.width, meta.height] = [meta.height, meta.width];
    }
  }
  if (decoderConf.audio != null && audioSamples.length > 0) {
    meta.audioSampleRate = DEFAULT_AUDIO_CONF.sampleRate;
    meta.audioChanCount = DEFAULT_AUDIO_CONF.channelCount;
  }

  let vDuration = 0;
  let aDuration = 0;
  if (videoSamples.length > 0) {
    for (let i = videoSamples.length - 1; i >= 0; i--) {
      const s = videoSamples[i];
      if (s.deleted) continue;
      vDuration = s.cts + s.duration;
      break;
    }
  }
  if (audioSamples.length > 0) {
    const lastSampele = audioSamples.at(-1)!;
    aDuration = lastSampele.cts + lastSampele.duration;
  }
  meta.duration = Math.max(vDuration, aDuration);

  return meta;
}

function genDecoder(
  decoderConf: MP4DecoderConf,
  localFileReader: LocalFileReader,
  videoSamples: ExtMP4Sample[],
  audioSamples: ExtMP4Sample[],
  volume: number
) {
  return {
    audioFrameFinder:
      volume === 0 || decoderConf.audio == null || audioSamples.length === 0
        ? null
        : new AudioFrameFinder(
            localFileReader,
            audioSamples,
            decoderConf.audio,
            {
              volume,
              targetSampleRate: DEFAULT_AUDIO_CONF.sampleRate,
            }
          ),
    videoFrameFinder:
      decoderConf.video == null || videoSamples.length === 0
        ? null
        : new VideoFrameFinder(
            localFileReader,
            videoSamples,
            decoderConf.video
          ),
  };
}

async function mp4FileToSamples(otFile: OPFSToolFile, opts: IMP4ClipOpts = {}) {
  let mp4Info: MP4Info | null = null;
  const decoderConf: MP4DecoderConf = { video: null, audio: null };
  let videoSamples: ExtMP4Sample[] = [];
  let audioSamples: ExtMP4Sample[] = [];
  let headerBoxPos: Array<{ start: number; size: number }> = [];
  const parsedMatrix = {
    perspective: 1,
    rotationRad: 0,
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
  };

  let videoDeltaTS = -1;
  let audioDeltaTS = -1;
  const reader = await otFile.createReader();
  await quickParseMP4File(
    reader,
    async (data) => {
      mp4Info = data.info;
      const ftyp = data.mp4boxFile.ftyp!;
      headerBoxPos.push({ start: ftyp.start, size: ftyp.size });
      const moov = data.mp4boxFile.moov!;
      headerBoxPos.push({ start: moov.start, size: moov.size });

      Object.assign(parsedMatrix, parseMatrix(mp4Info.videoTracks[0]?.matrix));

      let { videoDecoderConf: vc, audioDecoderConf: ac } = extractFileConfig(
        data.mp4boxFile,
        data.info
      );
      decoderConf.video = vc ?? null;
      decoderConf.audio = ac ?? null;
      if (vc == null && ac == null) {
        Log.error('VideoClip no video and audio track');
      }
      if (ac != null) {
        const { supported } = await AudioDecoder.isConfigSupported(ac);
        if (!supported) {
          Log.error(`VideoClip audio codec is not supported: ${ac.codec}`);
        }
      }
      if (vc != null) {
        const { supported } = await VideoDecoder.isConfigSupported(vc);
        if (!supported) {
          Log.error(`VideoClip video codec is not supported: ${vc.codec}`);
        }
      }
      Log.info(
        'mp4BoxFile moov ready',
        {
          ...data.info,
          tracks: null,
          videoTracks: null,
          audioTracks: null,
        },
        decoderConf
      );
    },
    (_, type, samples) => {
      if (type === 'video') {
        if (videoDeltaTS === -1) videoDeltaTS = samples[0].dts;
        for (const s of samples) {
          videoSamples.push(normalizeTimescale(s, videoDeltaTS, 'video'));
        }
      } else if (type === 'audio' && opts.audio) {
        if (audioDeltaTS === -1) audioDeltaTS = samples[0].dts;
        for (const s of samples) {
          audioSamples.push(normalizeTimescale(s, audioDeltaTS, 'audio'));
        }
      }
    }
  );
  await reader.close();

  const lastSampele = videoSamples.at(-1) ?? audioSamples.at(-1);
  if (mp4Info == null) {
    throw Error('VideoClip stream is done, but not emit ready');
  } else if (lastSampele == null) {
    throw Error('VideoClip stream not contain any sample');
  }
  // Fix first black frame
  fixFirstBlackFrame(videoSamples);
  Log.info('mp4 stream parsed');
  return {
    videoSamples,
    audioSamples,
    decoderConf,
    headerBoxPos,
    parsedMatrix,
  };
}

function normalizeTimescale(
  s: MP4Sample,
  delta = 0,
  sampleType: 'video' | 'audio'
) {
  // todo: perf discard redundant fields, small objects perform better
  let offset = s.offset;
  // When IDR frame contains non-image data (like SEI) before it, decoding may fail
  const idrOffset =
    sampleType === 'video' && s.is_sync
      ? idrNALUOffset(s.data, s.description.type)
      : -1;

  let size = s.size;
  if (idrOffset > 0) {
    // Skip non-image data by controlling offset and size fields
    offset += idrOffset;
    size -= idrOffset;
  }

  return {
    ...s,
    is_idr: idrOffset >= 0,
    offset,
    size,
    cts: ((s.cts - delta) / s.timescale) * 1e6,
    dts: ((s.dts - delta) / s.timescale) * 1e6,
    duration: (s.duration / s.timescale) * 1e6,
    timescale: 1e6,
    // Audio data volume is controllable, save directly in memory
    data: sampleType === 'video' ? null : s.data,
  };
}

class VideoFrameFinder {
  private decoder: VideoDecoder | null = null;
  constructor(
    public localFileReader: LocalFileReader,
    public samples: ExtMP4Sample[],
    public conf: VideoDecoderConfig
  ) {}

  private timestamp = 0;
  private curAborter = { abort: false, st: performance.now() };
  find = async (time: number): Promise<VideoFrame | null> => {
    if (
      this.decoder == null ||
      this.decoder.state === 'closed' ||
      time <= this.timestamp ||
      time - this.timestamp > 3e6
    ) {
      this.reset(time);
    }

    this.curAborter.abort = true;
    this.timestamp = time;

    this.curAborter = { abort: false, st: performance.now() };
    const vf = await this.parseFrame(time, this.decoder, this.curAborter);
    this.sleepCnt = 0;
    return vf;
  };

  // Fix VideoFrame duration is null
  private lastVfDur = 0;

  private downgradeSoftDecode = false;
  private videoDecCursorIdx = 0;
  private videoFrames: VideoFrame[] = [];
  private outputFrameCnt = 0;
  private inputChunkCnt = 0;
  private sleepCnt = 0;
  private predecodeErr = false;
  private parseFrame = async (
    time: number,
    dec: VideoDecoder | null,
    aborter: { abort: boolean; st: number }
  ): Promise<VideoFrame | null> => {
    if (dec == null || dec.state === 'closed' || aborter.abort) return null;

    if (this.videoFrames.length > 0) {
      const vf = this.videoFrames[0];
      if (time < vf.timestamp) return null;
      // Pop first frame
      this.videoFrames.shift();
      // First frame expired, find next frame
      if (time > vf.timestamp + (vf.duration ?? 0)) {
        vf.close();
        return await this.parseFrame(time, dec, aborter);
      }

      if (!this.predecodeErr && this.videoFrames.length < 10) {
        // Pre-decode to avoid waiting
        this.startDecode(dec).catch((err) => {
          this.predecodeErr = true;
          this.reset(time);
          throw err;
        });
      }
      // Matches expectation
      return vf;
    }

    // Missing frame data
    if (
      this.decoding ||
      (this.outputFrameCnt < this.inputChunkCnt && dec.decodeQueueSize > 0)
    ) {
      if (performance.now() - aborter.st > 6e3) {
        throw Error(
          `VideoClip.tick video timeout, ${JSON.stringify(this.getState())}`
        );
      }
      // Decoding, wait, then retry
      this.sleepCnt += 1;
      await sleep(15);
    } else if (this.videoDecCursorIdx >= this.samples.length) {
      // Decode completed
      return null;
    } else {
      try {
        await this.startDecode(dec);
      } catch (err) {
        this.reset(time);
        throw err;
      }
    }
    return await this.parseFrame(time, dec, aborter);
  };

  private decoding = false;
  private startDecode = async (dec: VideoDecoder) => {
    if (this.decoding || dec.decodeQueueSize > 600) return;

    // Start decode task, then retry
    let endIdx = this.videoDecCursorIdx + 1;
    if (endIdx > this.samples.length) return;

    this.decoding = true;
    // Frames in this GOP time range that have time matches and are not deleted
    let hasValidFrame = false;
    for (; endIdx < this.samples.length; endIdx++) {
      const s = this.samples[endIdx];
      if (!hasValidFrame && !s.deleted) {
        hasValidFrame = true;
      }
      // Find a GOP, so end at next IDR frame
      if (s.is_idr) break;
    }

    if (hasValidFrame) {
      const samples = this.samples.slice(this.videoDecCursorIdx, endIdx);
      if (samples[0]?.is_idr !== true) {
        Log.warn('First sample not idr frame');
      } else {
        const readStartTime = performance.now();
        const chunks = await videosamples2Chunks(samples, this.localFileReader);

        const readCost = performance.now() - readStartTime;
        if (readCost > 1000) {
          const first = samples[0];
          const last = samples.at(-1)!;
          const rangSize = last.offset + last.size - first.offset;
          Log.warn(
            `Read video samples time cost: ${Math.round(
              readCost
            )}ms, file chunk size: ${rangSize}`
          );
        }
        // Wait for the previous asynchronous operation to complete, at which point the task may have already been terminated
        if (dec.state === 'closed') return;

        this.lastVfDur = chunks[0]?.duration ?? 0;
        decodeGoP(dec, chunks, {
          onDecodingError: (err) => {
            if (this.downgradeSoftDecode) {
              throw err;
            } else if (this.outputFrameCnt === 0) {
              this.downgradeSoftDecode = true;
              Log.warn('Downgrade to software decode');
              this.reset();
            }
          },
        });

        this.inputChunkCnt += chunks.length;
      }
    }
    this.videoDecCursorIdx = endIdx;
    this.decoding = false;
  };

  private reset = (time?: number) => {
    this.decoding = false;
    this.videoFrames.forEach((f) => f.close());
    this.videoFrames = [];
    if (time == null || time === 0) {
      this.videoDecCursorIdx = 0;
    } else {
      let keyIdx = 0;
      for (let i = 0; i < this.samples.length; i++) {
        const s = this.samples[i];
        if (s.is_idr) keyIdx = i;
        if (s.cts < time) continue;
        this.videoDecCursorIdx = keyIdx;
        break;
      }
    }
    this.inputChunkCnt = 0;
    this.outputFrameCnt = 0;
    if (this.decoder?.state !== 'closed') this.decoder?.close();
    const encoderConf = {
      ...this.conf,
      ...(this.downgradeSoftDecode
        ? { hardwareAcceleration: 'prefer-software' }
        : {}),
    } as VideoDecoderConfig;
    this.decoder = new VideoDecoder({
      output: (vf) => {
        this.outputFrameCnt += 1;
        if (vf.timestamp === -1) {
          vf.close();
          return;
        }
        let rsVf = vf;
        if (vf.duration == null) {
          rsVf = new VideoFrame(vf, {
            duration: this.lastVfDur,
          });
          vf.close();
        }
        this.videoFrames.push(rsVf);
      },
      error: (err) => {
        if (err.message.includes('Codec reclaimed due to inactivity')) {
          // todo: Should decoder that was auto-closed due to inactivity be auto-restarted?
          this.decoder = null;
          Log.warn(err.message);
          return;
        }

        const errMsg = `VideoFinder VideoDecoder err: ${
          err.message
        }, config: ${JSON.stringify(encoderConf)}, state: ${JSON.stringify(
          this.getState()
        )}`;
        Log.error(errMsg);
        throw Error(errMsg);
      },
    });
    this.decoder.configure(encoderConf);
  };

  private getState = () => ({
    time: this.timestamp,
    decState: this.decoder?.state,
    decQSize: this.decoder?.decodeQueueSize,
    decCursorIdx: this.videoDecCursorIdx,
    sampleLen: this.samples.length,
    inputCnt: this.inputChunkCnt,
    outputCnt: this.outputFrameCnt,
    cacheFrameLen: this.videoFrames.length,
    softDecode: this.downgradeSoftDecode,
    clipIdCnt: CLIP_ID,
    sleepCnt: this.sleepCnt,
    memInfo: memoryUsageInfo(),
  });

  destroy = () => {
    if (this.decoder?.state !== 'closed') this.decoder?.close();
    this.decoder = null;
    this.curAborter.abort = true;
    this.videoFrames.forEach((f) => f.close());
    this.videoFrames = [];
    this.localFileReader.close();
  };
}

function findIndexOfSamples(time: number, samples: ExtMP4Sample[]) {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (time >= s.cts && time < s.cts + s.duration) {
      return i;
    }
    if (s.cts > time) break;
  }
  return 0;
}

class AudioFrameFinder {
  private volume = 1;
  private sampleRate: number;
  constructor(
    public localFileReader: LocalFileReader,
    public samples: ExtMP4Sample[],
    public conf: AudioDecoderConfig,
    opts: { volume: number; targetSampleRate: number }
  ) {
    this.volume = opts.volume;
    this.sampleRate = opts.targetSampleRate;
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.reset();
  }

  private decoder: ReturnType<typeof createAudioChunksDecoder> | null = null;
  private curAborter = { abort: false, st: performance.now() };
  find = async (time: number): Promise<Float32Array[]> => {
    const needResetTime =
      time <= this.timestamp || time - this.timestamp > 0.1e6;
    if (
      this.decoder == null ||
      this.decoder.state === 'closed' ||
      needResetTime
    ) {
      this.reset();
    }

    if (needResetTime) {
      // Audio data difference before/after cannot exceed 100ms (empirical value), otherwise treat as seek operation, reset decoder
      // Seek operation, reset time
      this.timestamp = time;
      this.decCursorIdx = findIndexOfSamples(time, this.samples);
    }

    this.curAborter.abort = true;
    const deltaTime = time - this.timestamp;
    this.timestamp = time;

    this.curAborter = { abort: false, st: performance.now() };

    const pcmData = await this.parseFrame(
      Math.ceil(deltaTime * (this.sampleRate / 1e6)),
      this.decoder,
      this.curAborter
    );
    this.sleepCnt = 0;

    return pcmData;
  };

  private timestamp = 0;
  private decCursorIdx = 0;
  private pcmData: {
    frameCnt: number;
    data: [Float32Array, Float32Array][];
  } = {
    frameCnt: 0,
    data: [],
  };
  private sleepCnt = 0;
  private parseFrame = async (
    emitFrameCnt: number,
    dec: ReturnType<typeof createAudioChunksDecoder> | null = null,
    aborter: { abort: boolean; st: number }
  ): Promise<Float32Array[]> => {
    if (
      dec == null ||
      aborter.abort ||
      dec.state === 'closed' ||
      emitFrameCnt === 0
    ) {
      return [];
    }

    // Data satisfies requirement
    const remainFrameCnt = this.pcmData.frameCnt - emitFrameCnt;
    if (remainFrameCnt > 0) {
      // Remaining audio data less than 100ms, pre-decode
      if (remainFrameCnt < DEFAULT_AUDIO_CONF.sampleRate / 10) {
        this.startDecode(dec);
      }
      return emitAudioFrames(this.pcmData, emitFrameCnt);
    }

    if (dec.decoding) {
      if (performance.now() - aborter.st > 3e3) {
        aborter.abort = true;
        throw Error(
          `VideoClip.tick audio timeout, ${JSON.stringify(this.getState())}`
        );
      }
      // Decoding, wait
      this.sleepCnt += 1;
      await sleep(15);
    } else if (this.decCursorIdx >= this.samples.length - 1) {
      // Last fragment, return remaining data
      return emitAudioFrames(this.pcmData, this.pcmData.frameCnt);
    } else {
      this.startDecode(dec);
    }
    return this.parseFrame(emitFrameCnt, dec, aborter);
  };

  private startDecode = (dec: ReturnType<typeof createAudioChunksDecoder>) => {
    const onceDecodeCnt = 10;
    if (dec.decodeQueueSize > onceDecodeCnt) return;
    // Start decode task
    const samples = [];
    let i = this.decCursorIdx;
    while (i < this.samples.length) {
      const s = this.samples[i];
      i += 1;
      if (s.deleted) continue;
      samples.push(s);
      if (samples.length >= onceDecodeCnt) break;
    }
    this.decCursorIdx = i;

    dec.decode(
      samples.map(
        (s) =>
          new EncodedAudioChunk({
            type: 'key',
            timestamp: s.cts,
            duration: s.duration,
            data: s.data!,
          })
      )
    );
  };

  private reset = () => {
    this.timestamp = 0;
    this.decCursorIdx = 0;
    this.pcmData = {
      frameCnt: 0,
      data: [],
    };
    this.decoder?.close();
    this.decoder = createAudioChunksDecoder(
      this.conf,
      {
        resampleRate: DEFAULT_AUDIO_CONF.sampleRate,
        volume: this.volume,
      },
      (pcmArr) => {
        this.pcmData.data.push(pcmArr as [Float32Array, Float32Array]);
        this.pcmData.frameCnt += pcmArr[0].length;
      }
    );
  };

  private getState = () => ({
    time: this.timestamp,
    decState: this.decoder?.state,
    decQSize: this.decoder?.decodeQueueSize,
    decCursorIdx: this.decCursorIdx,
    sampleLen: this.samples.length,
    pcmLen: this.pcmData.frameCnt,
    clipIdCnt: CLIP_ID,
    sleepCnt: this.sleepCnt,
    memInfo: memoryUsageInfo(),
  });

  destroy = () => {
    this.decoder = null;
    this.curAborter.abort = true;
    this.pcmData = {
      frameCnt: 0,
      data: [],
    };
    this.localFileReader.close();
  };
}

function createAudioChunksDecoder(
  decoderConf: AudioDecoderConfig,
  opts: { resampleRate: number; volume: number },
  outputCb: (pcm: Float32Array[]) => void
) {
  let inputCnt = 0;
  let outputCnt = 0;
  const outputHandler = (pcmArr: Float32Array[]) => {
    outputCnt += 1;
    if (pcmArr.length === 0) return;

    if (opts.volume !== 1) {
      for (const pcm of pcmArr)
        for (let i = 0; i < pcm.length; i++) pcm[i] *= opts.volume;
    }

    // Ensure stereo
    if (pcmArr.length === 1) pcmArr = [pcmArr[0], pcmArr[0]];

    outputCb(pcmArr);
  };
  const resampleQ = createPromiseQueue<Float32Array[]>(outputHandler);

  const needResample = opts.resampleRate !== decoderConf.sampleRate;
  let adec = new AudioDecoder({
    output: (ad) => {
      const pcm = extractPCM4AudioData(ad);
      if (needResample) {
        resampleQ(() =>
          audioResample(pcm, ad.sampleRate, {
            rate: opts.resampleRate,
            chanCount: ad.numberOfChannels,
          })
        );
      } else {
        outputHandler(pcm);
      }
      ad.close();
    },
    error: (err) => {
      if (err.message.includes('Codec reclaimed due to inactivity')) {
        return;
      }
      handleDecodeError('VideoClip AudioDecoder err', err as Error);
    },
  });
  adec.configure(decoderConf);

  function handleDecodeError(prefixStr: string, err: Error) {
    const errMsg = `${prefixStr}: ${
      (err as Error).message
    }, state: ${JSON.stringify({
      qSize: adec.decodeQueueSize,
      state: adec.state,
      inputCnt,
      outputCnt,
    })}`;
    Log.error(errMsg);
    throw Error(errMsg);
  }

  return {
    decode(chunks: EncodedAudioChunk[]) {
      inputCnt += chunks.length;
      try {
        for (const chunk of chunks) adec.decode(chunk);
      } catch (err) {
        handleDecodeError('decode audio chunk error', err as Error);
      }
    },
    close() {
      if (adec.state !== 'closed') adec.close();
    },
    get decoding() {
      return inputCnt > outputCnt && adec.decodeQueueSize > 0;
    },
    get state() {
      return adec.state;
    },
    get decodeQueueSize() {
      return adec.decodeQueueSize;
    },
  };
}

// Parallel execution, but emit results in order
function createPromiseQueue<T extends any>(onResult: (data: T) => void) {
  const rsCache: T[] = [];
  let waitingIdx = 0;

  function updateRs(rs: T, emitIdx: number) {
    rsCache[emitIdx] = rs;
    emitRs();
  }

  function emitRs() {
    const rs = rsCache[waitingIdx];
    if (rs == null) return;
    onResult(rs);

    waitingIdx += 1;
    emitRs();
  }

  let addIdx = 0;
  return (task: () => Promise<T>) => {
    const emitIdx = addIdx;
    addIdx += 1;
    task()
      .then((rs) => updateRs(rs, emitIdx))
      .catch((err) => updateRs(err, emitIdx));
  };
}

function emitAudioFrames(
  pcmData: { frameCnt: number; data: [Float32Array, Float32Array][] },
  emitCnt: number
) {
  // todo: perf reuse memory space
  const audio = [new Float32Array(emitCnt), new Float32Array(emitCnt)];
  let offset = 0;
  let i = 0;
  for (; i < pcmData.data.length; ) {
    const [chan0, chan1] = pcmData.data[i];
    if (offset + chan0.length > emitCnt) {
      const gapCnt = emitCnt - offset;
      audio[0].set(chan0.subarray(0, gapCnt), offset);
      audio[1].set(chan1.subarray(0, gapCnt), offset);
      pcmData.data[i][0] = chan0.subarray(gapCnt, chan0.length);
      pcmData.data[i][1] = chan1.subarray(gapCnt, chan1.length);
      break;
    } else {
      audio[0].set(chan0, offset);
      audio[1].set(chan1, offset);
      offset += chan0.length;
      i++;
    }
  }
  pcmData.data = pcmData.data.slice(i);
  pcmData.frameCnt -= emitCnt;
  return audio;
}

async function videosamples2Chunks(
  samples: ExtMP4Sample[],
  reader: Awaited<ReturnType<OPFSToolFile['createReader']>>
): Promise<EncodedVideoChunk[]> {
  const first = samples[0];
  const last = samples.at(-1);
  if (last == null) return [];

  const rangSize = last.offset + last.size - first.offset;
  if (rangSize < 30e6) {
    // Single read data < 30M, read all at once to reduce IO frequency
    const data = new Uint8Array(
      await reader.read(rangSize, { at: first.offset })
    );
    return samples.map((s) => {
      const offset = s.offset - first.offset;
      return new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: s.cts,
        duration: s.duration,
        data: data.subarray(offset, offset + s.size),
      });
    });
  }

  return await Promise.all(
    samples.map(async (s) => {
      return new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: s.cts,
        duration: s.duration,
        data: await reader.read(s.size, {
          at: s.offset,
        }),
      });
    })
  );
}

function splitVideoSampleByTime(videoSamples: ExtMP4Sample[], time: number) {
  if (videoSamples.length === 0) return [];
  let gopStartIdx = 0;
  let gopEndIdx = 0;
  let hitIdx = -1;
  for (let i = 0; i < videoSamples.length; i++) {
    const s = videoSamples[i];
    if (hitIdx === -1 && time < s.cts) hitIdx = i - 1;
    if (s.is_idr) {
      if (hitIdx === -1) {
        gopStartIdx = i;
      } else {
        gopEndIdx = i;
        break;
      }
    }
  }

  const hitSample = videoSamples[hitIdx];
  if (hitSample == null) throw Error('Not found video sample by time');

  const preSlice = videoSamples
    .slice(0, gopEndIdx === 0 ? videoSamples.length : gopEndIdx)
    .map((s) => ({ ...s }));
  for (let i = gopStartIdx; i < preSlice.length; i++) {
    const s = preSlice[i];
    if (time < s.cts) {
      s.deleted = true;
      s.cts = -1;
    }
  }
  fixFirstBlackFrame(preSlice);

  const postSlice = videoSamples
    .slice(hitSample.is_idr ? hitIdx : gopStartIdx)
    .map((s) => ({ ...s, cts: s.cts - time }));

  for (const s of postSlice) {
    if (s.cts < 0) {
      s.deleted = true;
      s.cts = -1;
    }
  }
  fixFirstBlackFrame(postSlice);

  return [preSlice, postSlice];
}

function splitAudioSampleByTime(audioSamples: ExtMP4Sample[], time: number) {
  if (audioSamples.length === 0) return [];
  let hitIdx = -1;
  for (let i = 0; i < audioSamples.length; i++) {
    const s = audioSamples[i];
    if (time > s.cts) continue;
    hitIdx = i;
    break;
  }
  if (hitIdx === -1) throw Error('Not found audio sample by time');
  const preSlice = audioSamples.slice(0, hitIdx).map((s) => ({ ...s }));
  const postSlice = audioSamples
    .slice(hitIdx)
    .map((s) => ({ ...s, cts: s.cts - time }));
  return [preSlice, postSlice];
}

// Support decoding errors
function decodeGoP(
  dec: VideoDecoder,
  chunks: EncodedVideoChunk[],
  opts: {
    onDecodingError?: (err: Error) => void;
  }
) {
  if (dec.state !== 'configured') return;
  for (let i = 0; i < chunks.length; i++) dec.decode(chunks[i]);

  // todo: The next frame after flush must be an IDR frame. Decide whether to call flush based on context?
  // flush may not be resolved on some Windows devices, so do not await flush
  dec.flush().catch((err) => {
    if (!(err instanceof Error)) throw err;
    if (
      err.message.includes('Decoding error') &&
      opts.onDecodingError != null
    ) {
      opts.onDecodingError(err);
      return;
    }
    // reset interrupts the decoder, expected to throw AbortedError
    if (!err.message.includes('Aborted due to close')) {
      throw err;
    }
  });
}

function idrNALUOffset(
  u8Arr: Uint8Array,
  type: MP4Sample['description']['type']
) {
  if (type !== 'avc1' && type !== 'hvc1') return 0;

  const dv = new DataView(u8Arr.buffer);
  for (let i = 0; i < u8Arr.byteLength - 4; ) {
    if (type === 'avc1') {
      const nalUnitType = dv.getUint8(i + 4) & 0x1f;
      // 5: IDR frame, 7: SPS, 8: PPS
      if (nalUnitType === 5 || nalUnitType === 7 || nalUnitType === 8) return i;
    } else if (type === 'hvc1') {
      const nalUnitType = (dv.getUint8(i + 4) >> 1) & 0x3f;
      // 19-20: IDR frame, 32-34: VPS SPS PPS
      if (
        nalUnitType === 19 ||
        nalUnitType === 20 ||
        nalUnitType === 32 ||
        nalUnitType === 33 ||
        nalUnitType === 34
      )
        return i;
    }
    // Jump to next NALU to continue checking
    i += dv.getUint32(i) + 4;
  }
  return -1;
}

// Large time offset for the first frame may lead to a black frame. Attempt to eliminate it automatically.
function fixFirstBlackFrame(samples: ExtMP4Sample[]) {
  let iframeCnt = 0;
  let minCtsSample: ExtMP4Sample | null = null;
  // cts minimum represents the first frame of the video
  for (const s of samples) {
    if (s.deleted) continue;
    // Detect frames between up to two I-frames
    if (s.is_sync) iframeCnt += 1;
    if (iframeCnt >= 2) break;

    if (minCtsSample == null || s.cts < minCtsSample.cts) {
      minCtsSample = s;
    }
  }
  // 200ms is an empirical value; automatically eliminate black frames within 200ms, otherwise do not process
  if (minCtsSample != null && minCtsSample.cts < 200e3) {
    minCtsSample.duration += minCtsSample.cts;
    minCtsSample.cts = 0;
  }
}

function memoryUsageInfo() {
  try {
    // @ts-ignore
    const mem = performance.memory;
    return {
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      totalJSHeapSize: mem.totalJSHeapSize,
      usedJSHeapSize: mem.usedJSHeapSize,
      percentUsed: (mem.usedJSHeapSize / mem.jsHeapSizeLimit).toFixed(3),
      percentTotal: (mem.totalJSHeapSize / mem.jsHeapSizeLimit).toFixed(3),
    };
  } catch (err) {
    return {};
  }
}
