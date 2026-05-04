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
    prepare: async (
      payload: Partial<AnyClip> & { type: string },
      options?: { objectFit?: 'contain' | 'cover' }
    ) => {
      const state = this.store.getState();
      return await loadClip(payload, {
        canvasSize: {
          width: state.settings.width,
          height: state.settings.height,
        },
        objectFit: options?.objectFit,
      });
    },

    add: async (
      payload: Partial<AnyClip> & { type: string },
      options?: AddClipOptions | string
    ) => {
      const addOptions: AddClipOptions =
        typeof options === 'string' ? { trackId: options } : options || {};

      const fullClip = await this.clip.prepare(payload, {
        objectFit: addOptions.objectFit,
      });
      console.log('adding clip', fullClip, addOptions);
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
    split: (time?: number, id?: string) => {
      const state = this.store.getState();
      const splitId = id || state.selectedIds[0];
      const splitTime = time !== undefined ? time : state.currentTime;

      if (!splitId) return;

      this.execute({
        id: nanoid(),
        type: 'clip.split',
        payload: { id: splitId, time: splitTime },
      });
    },
    duplicate: (ids: string[]) => {
      this.execute({
        id: nanoid(),
        type: 'clip.duplicate',
        payload: { ids },
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

  public project = {
    new: () => {
      this.store.getState().reset({
        settings: {
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 30_000_000,
        },
        tracks: [],
        clips: {},
      });
    },

    export: () => {
      return this.store.getState().getSnapshot();
    },

    import: (json: any) => {
      // Basic validation
      if (!json.clips && !json.tracks) {
        throw new Error('Invalid project JSON: missing clips or tracks');
      }

      const clipsArr = Array.isArray(json.clips)
        ? json.clips
        : Object.values(json.clips || {});

      // Filter out clips with empty sources (except Text, Caption, and Effect)
      const validClipsArr = clipsArr.filter((clipJSON: any) => {
        if (
          ['Text', 'Caption', 'Effect', 'Transition'].includes(clipJSON.type)
        ) {
          return true;
        }
        return clipJSON.src && clipJSON.src.trim() !== '';
      });

      // Convert array back to record
      const clips: Record<string, AnyClip> = {};
      validClipsArr.forEach((c: any) => {
        clips[c.id] = c;
      });

      const project: IProject = {
        settings: json.settings || {
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 30_000_000,
        },
        tracks: json.tracks || [],
        clips,
      };

      this.store.getState().reset(project);
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

}

// Backward compatibility or singleton
export const core = new Core();
export { Core as CoreEngine }; // Alias for transition
