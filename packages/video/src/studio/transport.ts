import type { Studio } from '../studio';
import type { IClip, IPlaybackCapable } from '../clips/iclip';

export interface PlaybackElementInfo {
  element: HTMLVideoElement | HTMLAudioElement;
  objectUrl?: string;
}

export class Transport {
  public isPlaying = false;
  public currentTime = 0; // in microseconds
  public maxDuration = 0; // in microseconds

  private playStartTime = 0; // in microseconds - time when playback started
  private playStartTimestamp = 0; // performance.now() when playback started
  private rafId: number | null = null;

  // Playback elements for clips that support playback
  public playbackElements = new Map<IClip, PlaybackElementInfo>();

  constructor(private studio: Studio) {}

  public setMaxDuration(duration: number) {
    this.maxDuration = duration;
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    if (this.isPlaying || this.studio.destroyed) return;
    if (
      this.maxDuration <= 0 ||
      this.maxDuration === Infinity ||
      isNaN(this.maxDuration)
    ) {
      console.warn('Cannot play: invalid duration', this.maxDuration);
      return;
    }

    if (!this.isPlaying) {
      this.isPlaying = true; // Set flag immediately to allow renderLoop to start
    }
    this.playStartTime = this.currentTime;
    this.playStartTimestamp = performance.now();

    // Start all playback elements
    for (const [clip, { element }] of this.playbackElements.entries()) {
      // Check if clip should be active at current time
      const shouldBeActive =
        this.currentTime >= clip.display.from &&
        (clip.display.to === 0 || this.currentTime <= clip.display.to);

      if (!shouldBeActive) {
        if (this.isPlaybackCapable(clip)) {
          clip.pause(element);
        }
        continue;
      }

      const relativeTime = (this.currentTime - clip.display.from) / 1e6;
      if (this.isPlaybackCapable(clip)) {
        await clip.play(element, relativeTime);
      }
    }

    // Start render loop
    this.renderLoop();
    this.studio.emit('play', { isPlaying: true });
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Pause all playback elements
    for (const [clip, { element }] of this.playbackElements.entries()) {
      if (this.isPlaybackCapable(clip)) {
        clip.pause(element);
      }
    }
    this.studio.emit('pause', { isPlaying: false });
  }

  /**
   * Stop playback and reset to start
   */
  async stop(): Promise<void> {
    this.pause();
    await this.seek(0);
  }

  /**
   * Seek to a specific time (in microseconds)
   */
  async seek(time: number): Promise<void> {
    if (this.studio.destroyed) return;

    // Store current play state
    const wasPlaying = this.isPlaying;

    // Update play start time/timestamp for accurate timing after seek
    this.playStartTime = Math.max(0, Math.min(time, this.maxDuration));
    this.playStartTimestamp = performance.now();

    // Set new time (already set above with playStartTime)
    this.currentTime = this.playStartTime;

    // Seek all playback elements
    for (const [clip, { element }] of this.playbackElements.entries()) {
      // Check if clip should be active at current time
      const shouldBeActive =
        this.currentTime >= clip.display.from &&
        (clip.display.to === 0 || this.currentTime <= clip.display.to);

      if (!shouldBeActive) {
        if (this.isPlaybackCapable(clip)) {
          clip.pause(element);
        }
        continue;
      }

      const relativeTime = (this.currentTime - clip.display.from) / 1e6;
      if (this.isPlaybackCapable(clip)) {
        await clip.seek(element, relativeTime);
      }
    }

    // Update frame to render the sought position
    await this.studio.updateFrame(this.currentTime);
    this.studio.emit('currentTime', { currentTime: this.currentTime });

    // Restore play state if it was playing
    if (wasPlaying) {
      this.isPlaying = true;
      for (const [clip, { element }] of this.playbackElements.entries()) {
        // Check if clip should be active at current time
        const shouldBeActive =
          this.currentTime >= clip.display.from &&
          (clip.display.to === 0 || this.currentTime <= clip.display.to);

        if (!shouldBeActive) {
          continue;
        }

        const relativeTime = (this.currentTime - clip.display.from) / 1e6;
        if (this.isPlaybackCapable(clip)) {
          await clip.play(element, relativeTime);
        }
      }
    }
  }

  /**
   * Move to the next frame
   */
  async frameNext(): Promise<void> {
    const fps = this.studio.opts.fps || 30;
    const frameDuration = 1_000_000 / fps;
    const nextTime = Math.min(
      this.currentTime + frameDuration,
      this.maxDuration
    );
    await this.seek(nextTime);
  }

  /**
   * Move to the previous frame
   */
  async framePrev(): Promise<void> {
    const fps = this.studio.opts.fps || 30;
    const frameDuration = 1_000_000 / fps;
    const prevTime = Math.max(0, this.currentTime - frameDuration);
    await this.seek(prevTime);
  }

  private async renderLoop(): Promise<void> {
    if (!this.isPlaying || this.studio.destroyed || this.studio.pixiApp == null)
      return;
    if (
      this.maxDuration <= 0 ||
      this.maxDuration === Infinity ||
      isNaN(this.maxDuration)
    ) {
      this.pause();
      return;
    }

    const render = async () => {
      if (
        !this.isPlaying ||
        this.studio.destroyed ||
        this.studio.pixiApp == null
      )
        return;
      if (this.currentTime >= this.maxDuration) {
        this.currentTime = this.maxDuration;
        this.pause();
        return;
      }

      // Calculate current time based on actual elapsed time
      // This ensures playback speed matches the configured fps
      const elapsedMs = performance.now() - this.playStartTimestamp;
      const elapsedMicroseconds = elapsedMs * 1000;
      this.currentTime = Math.min(
        this.playStartTime + elapsedMicroseconds,
        this.maxDuration
      );
      this.studio.emit('currentTime', { currentTime: this.currentTime });

      // Await frame update to ensure it completes before moving to next frame
      // This prevents blinking caused by overlapping frame updates
      try {
        await this.studio.updateFrame(this.currentTime);
      } catch (err) {
        console.warn('Error updating frame:', err);
      }

      // Continue with next frame using requestAnimationFrame
      // This gives the browser time to update video textures smoothly
      if (this.isPlaying) {
        this.rafId = requestAnimationFrame(render);
      }
    };

    render();
  }

  public isPlaybackCapable(clip: any): clip is IPlaybackCapable {
    return 'play' in clip && 'pause' in clip && 'seek' in clip;
  }
}
