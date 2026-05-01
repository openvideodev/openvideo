import { StoreApi } from "zustand/vanilla";
import { ProjectStore, createProjectStore } from "./project";
import { AddClipOptions } from "./utils/manage-tracks";
import { PlaybackController } from "./playback";
import { EventEmitter } from "./events";
import { IProject, AnyClip, ITrack } from "./types";

/**
 * CoreEngine - The central orchestrator of the OpenVideo engine.
 * Following SOLID principles, this class decouples state management,
 * timing, and event emission.
 */
export class CoreEngine extends EventEmitter {
  public store: StoreApi<ProjectStore>;
  public playback: PlaybackController;

  constructor(initialState?: Partial<IProject>) {
    super();
    this.store = createProjectStore(initialState);
    this.playback = new PlaybackController(this.store);

    // Forward important state changes as domain events
    this.store.subscribe((state, prevState) => {
      this.handleStateChange(state, prevState);
    });
  }

  private handleStateChange(state: ProjectStore, prevState: ProjectStore) {
    // 1. Time events
    if (state.currentTime !== prevState.currentTime) {
      this.emit("timeupdate", state.currentTime);
    }

    // 2. Playback status events
    if (state.isPlaying !== prevState.isPlaying) {
      this.emit(state.isPlaying ? "play" : "pause");
    }

    // 3. Structural events (Clips)
    const currentIds = Object.keys(state.clips);
    const prevIds = Object.keys(prevState?.clips || {});

    // Added
    currentIds.filter(id => !prevIds.includes(id)).forEach(id => {
      this.emit("clip:added", state.clips[id]);
    });

    // Removed
    prevIds.filter(id => !currentIds.includes(id)).forEach(id => {
      this.emit("clip:removed", id);
    });

    // Updated
    currentIds.filter(id => prevIds.includes(id)).forEach(id => {
      if (state.clips[id] !== prevState.clips[id]) {
        this.emit("clip:updated", state.clips[id]);
      }
    });

    // 4. Structural events (Tracks)
    if (state.tracks !== prevState.tracks) {
      this.emit("tracks:updated", state.tracks);
    }
  }

  // Convenience Proxies
  public play() { this.playback.play(); }
  public pause() { this.playback.pause(); }
  public seek(time: number) { this.playback.seek(time); }
  
  public async addClip(clip: Partial<AnyClip> & { type: string }, options?: AddClipOptions | string) {
    return this.store.getState().addClip(clip, options);
  }

  public async addClips(clips: (Partial<AnyClip> & { type: string })[], options?: AddClipOptions | string) {
    return this.store.getState().addClips(clips, options);
  }

  public updateClip(id: string, updates: Partial<AnyClip>) {
    this.store.getState().updateClip(id, updates);
  }
  
  public updateClips(updatesList: { id: string; updates: Partial<AnyClip> }[]) {
    this.store.getState().updateClips(updatesList);
  }

  public removeClips(ids: string[]) {
    this.store.getState().removeClips(ids);
  }

  public addTrack(payload?: Partial<ITrack>) {
    return this.store.getState().addTrack(payload);
  }

  public removeTrack(id: string) {
    this.store.getState().removeTrack(id);
  }

  public moveTrack(id: string, newIndex: number) {
    this.store.getState().moveTrack(id, newIndex);
  }

  public updateSettings(settings: Partial<IProject["settings"]>) {
    this.store.getState().updateSettings(settings);
  }
}
