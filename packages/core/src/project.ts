import { createStore } from 'zustand/vanilla';
import { IProject, AnyClip, ITrack, IScaleState } from './types';
import { loadClip } from './utils/load-item';
import { manageTracks, AddClipOptions } from './utils/manage-tracks';
import { nanoid } from 'nanoid';
import { Command, HistoryEntry, Patch } from './commands/types';
import { commandRegistry } from './commands/registry';
import { applyPatches, invertPatches } from './utils/patch';

export interface ProjectState extends IProject {
  selectedIds: string[];
  currentTime: number; // in microseconds
  isPlaying: boolean;
  scale: IScaleState;
  volume: number;
  muted: boolean;
  speed: number;
  history: HistoryEntry[];
  future: HistoryEntry[]; // for redo
}

export interface ProjectActions {
  // Selection
  select: (ids: string | string[], multi?: boolean) => void;
  deselect: (ids?: string | string[]) => void;

  // Clips
  addClip: (
    clip: Partial<AnyClip> & { type: string },
    options?: AddClipOptions | string
  ) => Promise<AnyClip>;
  addClips: (
    clips: (Partial<AnyClip> & { type: string })[],
    options?: AddClipOptions | string
  ) => Promise<AnyClip[]>;
  updateClip: (id: string, updates: Partial<AnyClip>) => void;
  updateClips: (
    updatesList: { id: string; updates: Partial<AnyClip> }[]
  ) => void;
  removeClips: (ids: string[]) => void;

  // Tracks
  addTrack: (track?: Partial<ITrack>) => ITrack;
  removeTrack: (id: string) => void;
  moveTrack: (id: string, newIndex: number) => void;
  setTracks: (tracks: ITrack[]) => void;

  // Playback
  seek: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setSpeed: (speed: number) => void;

  // Scale
  setScale: (
    scale: Partial<IScaleState> | ((prev: IScaleState) => Partial<IScaleState>)
  ) => void;

  // Project
  updateSettings: (settings: Partial<IProject['settings']>) => void;
  recalculateDuration: () => void;

  // Command API
  execute: <T>(command: Command<T>) => void;
  batch: (commands: Command[]) => void;
  undo: () => void;
  redo: () => void;
}

export type ProjectStore = ProjectState & ProjectActions;

export const createProjectStore = (initialState?: Partial<IProject>) => {
  return createStore<ProjectStore>((set, get) => ({
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 30_000_000,
      ...initialState?.settings,
    },
    tracks: initialState?.tracks || [],
    clips: initialState?.clips || {},
    selectedIds: [],
    currentTime: 0,
    isPlaying: false,
    volume: 1,
    muted: false,
    speed: 1,
    scale: {
      zoom: 1,
      unit: 100,
      segments: 5,
      index: 0,
    },
    history: [],
    future: [],

    // --- COMMAND SYSTEM ---

    execute: (command) => {
      const handler = commandRegistry.get(command.type);
      if (!handler) {
        console.warn(`No handler registered for command: ${command.type}`);
        return;
      }

      const state = get();
      const patches = handler(state, command);
      const inversePatches = invertPatches(patches);

      // Apply patches to local state
      set((state) => {
        const nextState = { ...state };
        applyPatches(nextState, patches);

        return {
          ...nextState,
          history: [...state.history, { command, patches, inversePatches }],
          future: [], // Clear redo stack on new command
        };
      });

      // TODO: Emit change event for collaborators/engines
    },

    batch: (commands) => {
      // For batching, we wrap multiple commands into a single history entry if needed,
      // or just execute them sequentially. Requirement says "emits ONE change event".
      const allPatches: Patch[] = [];
      const allInversePatches: Patch[] = [];
      const commandLogs: Command[] = [];

      set((currentState) => {
        const nextState = { ...currentState };

        commands.forEach((command) => {
          const handler = commandRegistry.get(command.type);
          if (handler) {
            const patches = handler(nextState, command);
            applyPatches(nextState, patches);
            allPatches.push(...patches);
            allInversePatches.push(...invertPatches(patches));
            commandLogs.push(command);
          }
        });

        return {
          ...nextState,
          history: [
            ...currentState.history,
            {
              command: {
                id: nanoid(),
                type: 'batch',
                payload: commandLogs,
              },
              patches: allPatches,
              inversePatches: allInversePatches.reverse(), // Reverse order for inverse patches
            },
          ],
          future: [],
        };
      });
    },

    undo: () => {
      const { history } = get();
      if (history.length === 0) return;

      const entry = history[history.length - 1];
      const nextHistory = history.slice(0, -1);

      set((state) => {
        const nextState = { ...state };
        applyPatches(nextState, entry.inversePatches);
        return {
          ...nextState,
          history: nextHistory,
          future: [entry, ...state.future],
        };
      });
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return;

      const entry = future[0];
      const nextFuture = future.slice(1);

      set((state) => {
        const nextState = { ...state };
        applyPatches(nextState, entry.patches);
        return {
          ...nextState,
          history: [...state.history, entry],
          future: nextFuture,
        };
      });
    },

    // Actions: Selection
    select: (ids, multi = false) => {
      const newIds = Array.isArray(ids) ? ids : [ids];
      set((state) => ({
        selectedIds: multi
          ? [...new Set([...state.selectedIds, ...newIds])]
          : newIds,
      }));
    },

    deselect: (ids) => {
      if (!ids) {
        set({ selectedIds: [] });
        return;
      }
      const toRemove = Array.isArray(ids) ? ids : [ids];
      set((state) => ({
        selectedIds: state.selectedIds.filter((id) => !toRemove.includes(id)),
      }));
    },

    // Actions: Playback
    seek: (time) => {
      set((state) => ({
        currentTime: Math.max(0, Math.min(state.settings.duration, time)),
      }));
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setVolume: (volume) => set({ volume }),
    setMuted: (muted) => set({ muted }),
    setSpeed: (speed) => set({ speed }),

    // Actions: Scale
    setScale: (scale) =>
      set((state) => ({
        scale: {
          ...state.scale,
          ...(typeof scale === 'function' ? scale(state.scale) : scale),
        },
      })),

    // Actions: Clips
    addClip: async (payload, options) => {
      const state = get();
      const addOptions: AddClipOptions =
        typeof options === 'string' ? { trackId: options } : options || {};

      // Auto-calculate transition timing and placement if junction clips are provided
      if (
        payload.type === 'Transition' &&
        payload.fromClipId &&
        payload.toClipId
      ) {
        const fromClip = state.clips[payload.fromClipId];
        const toClip = state.clips[payload.toClipId];
        if (fromClip && toClip) {
          const junction = fromClip.display.to;
          const duration = payload.duration || 1_000_000;
          payload.display = {
            from: junction - duration / 2,
            to: junction + duration / 2,
          };

          // Also ensure transition is on the same track as the clips it connects
          if (!addOptions.trackId) {
            const track = state.tracks.find((t) =>
              t.clipIds.includes(payload.fromClipId!)
            );
            if (track) {
              addOptions.trackId = track.id;
            }
          }
        }
      }

      const newClip = await loadClip(payload, {
        canvasSize: {
          width: state.settings.width,
          height: state.settings.height,
        },
      });

      set((state) => {
        const { tracks: nextTracks } = manageTracks(
          state.tracks,
          newClip,
          addOptions
        );

        return {
          clips: { ...state.clips, [newClip.id]: newClip },
          tracks: nextTracks,
        };
      });

      get().recalculateDuration();
      return newClip;
    },

    addClips: async (payloads, options) => {
      const state = get();
      const addOptions: AddClipOptions =
        typeof options === 'string' ? { trackId: options } : options || {};

      const newClips = await Promise.all(
        payloads.map((payload) =>
          loadClip(payload, {
            canvasSize: {
              width: state.settings.width,
              height: state.settings.height,
            },
          })
        )
      );

      set((state) => {
        let currentTracks = state.tracks;
        const nextClips = { ...state.clips };

        newClips.forEach((newClip) => {
          const { tracks: nextTracks } = manageTracks(
            currentTracks,
            newClip,
            addOptions
          );
          currentTracks = nextTracks;
          nextClips[newClip.id] = newClip;
        });

        return {
          clips: nextClips,
          tracks: currentTracks,
        };
      });

      get().recalculateDuration();
      return newClips;
    },

    updateClip: (id, updates) => {
      set((state) => {
        const clip = state.clips[id];
        if (!clip) return state;

        const updatedClip = { ...clip, ...updates } as AnyClip;
        if (updates.display) {
          updatedClip.duration = updates.display.to - updates.display.from;
        }

        return {
          clips: { ...state.clips, [id]: updatedClip },
        };
      });
      get().recalculateDuration();
    },

    updateClips: (updatesList) => {
      set((state) => {
        const nextClips = { ...state.clips };
        updatesList.forEach(({ id, updates }) => {
          const clip = nextClips[id];
          if (!clip) return;
          const updatedClip = { ...clip, ...updates } as AnyClip;
          if (updates.display) {
            updatedClip.duration = updates.display.to - updates.display.from;
          }
          nextClips[id] = updatedClip;
        });
        return { clips: nextClips };
      });
      get().recalculateDuration();
    },

    removeClips: (ids) => {
      set((state) => {
        const nextClips = { ...state.clips };
        ids.forEach((id) => delete nextClips[id]);

        const nextTracks = state.tracks.map((track) => ({
          ...track,
          clipIds: track.clipIds.filter((id) => !ids.includes(id)),
        }));

        return {
          clips: nextClips,
          tracks: nextTracks,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        };
      });
      get().recalculateDuration();
    },

    // Actions: Tracks
    addTrack: (payload) => {
      const newTrack: ITrack = {
        id: payload?.id || 'track_' + nanoid(10),
        name: payload?.name || 'Track ' + (get().tracks.length + 1),
        type: payload?.type || 'Video',
        clipIds: payload?.clipIds || [],
        accepts: payload?.accepts,
      };

      set((state) => ({
        tracks: [newTrack, ...state.tracks],
      }));

      return newTrack;
    },

    removeTrack: (id) => {
      const track = get().tracks.find((t) => t.id === id);
      if (!track) return;
      get().removeClips(track.clipIds);
      set((state) => ({
        tracks: state.tracks.filter((t) => t.id !== id),
      }));
    },

    moveTrack: (id, newIndex) => {
      set((state) => {
        const currentIndex = state.tracks.findIndex((t) => t.id === id);
        if (currentIndex === -1) return state;
        const newTracks = [...state.tracks];
        const [movedTrack] = newTracks.splice(currentIndex, 1);
        newTracks.splice(newIndex, 0, movedTrack);
        return { tracks: newTracks };
      });
    },

    setTracks: (tracks) => set({ tracks }),

    // Actions: Project
    updateSettings: (settings) => {
      set((state) => ({
        settings: { ...state.settings, ...settings },
      }));
    },

    recalculateDuration: () => {
      const { clips } = get();
      let maxUs = 0;
      Object.values(clips).forEach((clip) => {
        const endUs =
          clip.display.to > 0
            ? clip.display.to
            : clip.display.from + clip.duration;
        if (endUs > maxUs) maxUs = endUs;
      });

      const finalDuration = Math.max(30_000_000, maxUs + 1_000_000);

      if (get().settings.duration !== finalDuration) {
        get().updateSettings({ duration: finalDuration });
      }
    },
  }));
};

export const projectStore = createProjectStore();
