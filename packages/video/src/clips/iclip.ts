import type { BaseSprite, BaseSpriteEvents } from '../sprite/base-sprite';
import {
  getDefaultAudioCodec,
  getCachedAudioCodec,
} from '../utils/audio-codec-detector';

export interface IClipMeta {
  width: number;
  height: number;
  duration: number;
}

export interface ITransitionInfo {
  name: string;
  duration: number; // in microseconds
  textureUrl?: string;
  prevClipId?: string;
  fromClipId?: string;
  toClipId?: string;
  start?: number;
  end?: number;
}

/**
 * Interface that all clips must implement
 *
 * Clips are abstractions of different data types, providing data to other modules
 *
 *
 * You only need to implement this interface to create custom clips, giving you maximum flexibility to generate video content such as animations and transition effects
 *
 */
export interface IClip<T extends BaseSpriteEvents = BaseSpriteEvents>
  extends Omit<BaseSprite<T>, 'destroy' | 'ready'> {
  // Override destroy to be public (BaseSprite has it as protected)
  // Override ready to return IClipMeta instead of Promise<void>
  destroy: () => void;
  readonly ready: Promise<IClipMeta>;

  /**
   * Clip type (e.g., 'video', 'image', 'text', 'audio')
   */
  readonly type: string;

  /**
   * Source URL or identifier for this clip
   */
  src: string;

  // Clip-specific methods
  /**
   * Extract data from clip at specified time
   * @param time Time in microseconds
   */
  tick: (time: number) => Promise<{
    video?: VideoFrame | ImageBitmap | null;
    audio?: Float32Array[];
    state: 'done' | 'success';
  }>;

  /**
   * Get video frame and audio at specified time
   * This method is provided by BaseClip and used by Compositor
   */
  getFrame(time: number): Promise<{
    video: ImageBitmap | null;
    audio: Float32Array[];
    done: boolean;
  }>;

  /**
   * Data metadata
   */
  readonly meta: IClipMeta;

  /**
   * Clone and return a new clip
   */
  clone: () => Promise<this>;

  /**
   * Split at specified time, return two new clips before and after that moment, commonly used in editing scenarios to split clips by time
   *
   * This method will not corrupt original clip data
   *
   * @param time Time in microseconds
   * @returns
   */
  split?: (time: number) => Promise<[this, this]>;

  /**
   * Serialize clip to JSON format
   * Returns a plain object with only serializable data (no circular references)
   * @param main Whether this is the main clip (for Compositor)
   */
  toJSON(main?: boolean): any;

  /**
   * Set an external renderer (e.g., from Studio)
   * This is called by Studio when adding clips to provide a shared renderer
   * @param renderer The PixiJS renderer to use
   */
  setRenderer?(renderer: any): void;

  /**
   * Transition info (optional)
   */
  transition?: ITransitionInfo;

  /**
   * Audio volume level (0-1)
   */
  volume: number;

  /**
   * Styling properties (e.g., stroke, dropShadow, borderRadius)
   */
  style: any;

  /**
   * Get the list of visible transformer handles for this clip type
   * Similar to Fabric.js v6 controls visibility pattern
   * @returns Array of handle kinds that should be visible
   */
  getVisibleHandles?: () => Array<
    'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb' | 'rot'
  >;

  /**
   * Scale clip to fit within the scene dimensions while maintaining aspect ratio
   */
  scaleToFit(sceneWidth: number, sceneHeight: number): Promise<void>;

  /**
   * Scale clip to fill the scene dimensions while maintaining aspect ratio
   */
  scaleToFill(sceneWidth: number, sceneHeight: number): Promise<void>;

  /**
   * Center the clip within the scene dimensions
   */
  centerInScene(sceneWidth: number, sceneHeight: number): void;
}

/**
 * Optional interface for clips that support HTML media element playback
 * Used by Studio for interactive preview
 */
export interface IPlaybackCapable {
  /**
   * Create and initialize HTML media element for playback
   * @returns Promise resolving to the media element and optional object URL for cleanup
   */
  createPlaybackElement(): Promise<{
    element: HTMLVideoElement | HTMLAudioElement;
    objectUrl?: string;
  }>;

  /**
   * Start playback at a specific time
   * @param element The HTML media element
   * @param timeSeconds Time in seconds (relative to clip start)
   */
  play(
    element: HTMLVideoElement | HTMLAudioElement,
    timeSeconds: number
  ): Promise<void>;

  /**
   * Pause playback
   * @param element The HTML media element
   */
  pause(element: HTMLVideoElement | HTMLAudioElement): void;

  /**
   * Seek to a specific time
   * @param element The HTML media element
   * @param timeSeconds Time in seconds (relative to clip start)
   */
  seek(
    element: HTMLVideoElement | HTMLAudioElement,
    timeSeconds: number
  ): Promise<void>;

  /**
   * Sync playback state during preview
   * @param element The HTML media element
   * @param isPlaying Whether playback should be active
   * @param timeSeconds Current time in seconds (relative to clip start)
   */
  syncPlayback(
    element: HTMLVideoElement | HTMLAudioElement,
    isPlaying: boolean,
    timeSeconds: number
  ): void;

  /**
   * Clean up playback element and resources
   * @param element The HTML media element
   * @param objectUrl Optional object URL to revoke
   */
  cleanupPlayback(
    element: HTMLVideoElement | HTMLAudioElement,
    objectUrl?: string
  ): void;
}

/**
 * Default audio settings, ⚠️ do not change its values ⚠️
 * Automatically selects the best supported audio codec:
 * - Prefers AAC (mp4a.40.2) for better quality and compatibility
 * - Falls back to Opus when AAC is not supported (e.g., some Linux browsers)
 */

// Initialize codec detection immediately
let audioCodecPromise: Promise<{
  codec: string;
  sampleRate: number;
  channelCount: number;
}> | null = null;

/**
 * Get the default audio configuration
 * This function returns a promise that resolves to the best supported audio codec
 */
export async function getDefaultAudioConf() {
  if (audioCodecPromise === null) {
    audioCodecPromise = getDefaultAudioCodec();
  }
  return await audioCodecPromise;
}

/**
 * Synchronous version that returns cached codec or a default fallback
 * Use this only when you need synchronous access (e.g., in constants)
 * Prefer getDefaultAudioConf() for async contexts
 */
export const DEFAULT_AUDIO_CONF = {
  get codec() {
    return getCachedAudioCodec()?.codec ?? 'mp4a.40.2';
  },
  get codecType(): 'aac' | 'opus' {
    return getCachedAudioCodec()?.codecType ?? 'aac';
  },
  get sampleRate() {
    return getCachedAudioCodec()?.sampleRate ?? 48000;
  },
  get channelCount() {
    return getCachedAudioCodec()?.channelCount ?? 2;
  },
} as const;
