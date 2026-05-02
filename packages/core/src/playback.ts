import { IRenderer } from './types';

export class PlaybackController {
  private rafId: any = null;
  private lastTimestamp: number = 0;
  private isBrowser =
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function';
  private renderers: Set<IRenderer> = new Set();

  constructor(private store: any) {}

  public attachRenderer(renderer: IRenderer) {
    this.renderers.add(renderer);
  }

  public detachRenderer(renderer: IRenderer) {
    this.renderers.delete(renderer);
  }

  public play() {
    const state = this.store.getState();
    if (state.isPlaying) return;

    this.store.getState().setIsPlaying(true);
    this.lastTimestamp = this.isBrowser ? performance.now() : Date.now();
    this.startLoop();
  }

  public pause() {
    this.store.getState().setIsPlaying(false);
    this.stopLoop();
  }

  public toggle() {
    if (this.store.getState().isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(timeUs: number) {
    this.store.getState().seek(timeUs);
    this.triggerRender(timeUs);
    // Reset lastTimestamp to ensure that if the loop is running,
    // it starts its next delta from this new seek position.
    this.lastTimestamp = this.isBrowser ? performance.now() : Date.now();
  }

  private triggerRender(timeUs: number) {
    this.renderers.forEach((renderer) => {
      renderer.render(timeUs);
    });
  }

  private startLoop() {
    if (this.isBrowser) {
      this.rafId = window.requestAnimationFrame(this.tick);
    } else {
      this.rafId = setInterval(
        this.tick,
        1000 / (this.store.getState().settings.fps || 30)
      );
    }
  }

  private stopLoop() {
    if (this.isBrowser) {
      if (this.rafId) window.cancelAnimationFrame(this.rafId);
    } else {
      if (this.rafId) clearInterval(this.rafId);
    }
    this.rafId = null;
  }

  private tick = () => {
    const state = this.store.getState();
    if (!state.isPlaying) return;

    const now = this.isBrowser ? performance.now() : Date.now();
    const elapsedMs = now - this.lastTimestamp;
    this.lastTimestamp = now;

    const deltaUs = elapsedMs * 1000;
    const nextTimeUs = state.currentTime + deltaUs;

    if (nextTimeUs >= state.settings.duration) {
      this.seek(state.settings.duration);
      this.pause();
    } else {
      this.seek(nextTimeUs);
      if (this.isBrowser) {
        this.rafId = window.requestAnimationFrame(this.tick);
      }
    }
  };
}
