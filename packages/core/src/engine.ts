import { StoreApi } from 'zustand/vanilla';
import { ProjectStore, createProjectStore } from './project';
import { AddClipOptions } from './utils/manage-tracks';
import { PlaybackController } from './playback';
import { EventEmitter } from './events';
import { IProject, AnyClip, ITrack } from './types';
import { Command } from './commands/types';
import { loadClip } from './utils/load-item';
import { nanoid } from 'nanoid';

/**
 * Core - The central "Brain" of OpenVideo.
 * Headless, deterministic, and command-driven.
 */
export class Core extends EventEmitter {
  public store: StoreApi<ProjectStore>;
  public playback: PlaybackController;

  constructor(initialState?: Partial<IProject>) {
    super();
    this.store = createProjectStore(initialState);
    this.playback = new PlaybackController(this.store);

    // Forward patches and state changes
    this.store.subscribe((state, prevState) => {
      this.handleStateChange(state, prevState);
    });
  }

  private handleStateChange(state: ProjectStore, prevState: ProjectStore) {
    // 1. Emit patches for the latest command if any
    const latestHistory = state.history[state.history.length - 1];
    const prevHistoryLength = prevState?.history?.length || 0;

    if (state.history.length > prevHistoryLength && latestHistory) {
      this.emit('change', latestHistory.patches);
    }

    // 2. Playback & Time events
    if (state.currentTime !== prevState.currentTime) {
      this.emit('timeupdate', state.currentTime);
    }
    if (state.isPlaying !== prevState.isPlaying) {
      this.emit(state.isPlaying ? 'play' : 'pause');
    }
  }

  // --- COMMAND API ---

  public execute<T>(command: Command<T>) {
    this.store.getState().execute(command);
  }

  public batch(commands: Command[]) {
    this.store.getState().batch(commands);
  }

  public undo() {
    this.store.getState().undo();
  }

  public redo() {
    this.store.getState().redo();
  }

  // --- DX LAYER (Convenience Methods) ---

  public clip = {
    prepare: async (payload: Partial<AnyClip> & { type: string }) => {
      const state = this.store.getState();
      return await loadClip(payload, {
        canvasSize: {
          width: state.settings.width,
          height: state.settings.height,
        },
      });
    },

    add: async (
      payload: Partial<AnyClip> & { type: string },
      options?: AddClipOptions | string
    ) => {
      const fullClip = await this.clip.prepare(payload);

      const addOptions: AddClipOptions =
        typeof options === 'string' ? { trackId: options } : options || {};

      this.execute({
        id: nanoid(),
        type: 'clip.add',
        payload: { clip: fullClip, trackId: addOptions.trackId },
      });

      return fullClip;
    },
    remove: (ids: string[]) => {
      this.execute({
        id: nanoid(),
        type: 'clip.remove',
        payload: { ids },
      });
    },
    update: (id: string, updates: Partial<AnyClip>) => {
      this.execute({
        id: nanoid(),
        type: 'clip.update',
        payload: { id, updates },
      });
    },
  };

  public track = {
    add: (payload?: Partial<ITrack>) => {
      this.execute({
        id: nanoid(),
        type: 'track.add',
        payload,
      });
    },
    remove: (id: string) => {
      this.execute({
        id: nanoid(),
        type: 'track.remove',
        payload: { id },
      });
    },
    move: (id: string, newIndex: number) => {
      this.execute({
        id: nanoid(),
        type: 'track.move',
        payload: { id, newIndex },
      });
    },
  };

  // Playback proxies
  public play() {
    this.playback.play();
  }
  public pause() {
    this.playback.pause();
  }
  public seek(time: number) {
    this.playback.seek(time);
  }

  // --- LEGACY API SHIMS (keep old CoreEngine callers working) ---

  /** @deprecated use core.clip.add */
  public async addClip(
    payload: Partial<AnyClip> & { type: string },
    options?: AddClipOptions | string
  ) {
    return this.clip.add(payload, options);
  }

  /** @deprecated use core.clip.add in a loop or batch */
  public async addClips(
    clips: (Partial<AnyClip> & { type: string })[],
    options?: AddClipOptions | string
  ) {
    const addOptions: AddClipOptions =
      typeof options === 'string' ? { trackId: options } : options || {};

    const fullClips = await Promise.all(
      clips.map((clip) => this.clip.prepare(clip))
    );

    const commands = fullClips.map((clip) => ({
      id: nanoid(),
      type: 'clip.add',
      payload: { clip, trackId: addOptions.trackId },
    }));

    this.batch(commands as any[]);
  }

  /** @deprecated use core.clip.update */
  public updateClip(id: string, updates: Partial<AnyClip>) {
    this.clip.update(id, updates);
  }

  /** @deprecated use core.clip.update in a loop or batch */
  public updateClips(list: { id: string; updates: Partial<AnyClip> }[]) {
    const commands = list.map(({ id, updates }) => ({
      id: nanoid(),
      type: 'clip.update',
      payload: { id, updates },
    }));
    this.batch(commands as any[]);
  }

  /** @deprecated use core.clip.remove */
  public removeClips(ids: string[]) {
    this.execute({
      id: nanoid(),
      type: 'clip.remove',
      payload: { ids },
    });
  }

  /** @deprecated use core.track.add */
  public addTrack(payload?: Partial<ITrack>) {
    const id = payload?.id || 'track_' + nanoid(10);
    this.track.add({ ...payload, id });
    return { id, ...payload };
  }
}

// Backward compatibility or singleton
export const core = new Core();
export { Core as CoreEngine }; // Alias for transition
