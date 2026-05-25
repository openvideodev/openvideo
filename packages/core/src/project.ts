import { createStore } from "zustand/vanilla";
import { IProject, AnyClip, IScaleState } from "./types";
import { nanoid } from "nanoid";
import { Command, HistoryEntry, Patch } from "./commands/types";
import { commandRegistry } from "./commands/registry";
import { applyPatches, invertPatches } from "./utils/patch";

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

  // Tracks

  // Playback
  seek: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setSpeed: (speed: number) => void;

  // Scale
  setScale: (scale: Partial<IScaleState> | ((prev: IScaleState) => Partial<IScaleState>)) => void;

  // Project
  updateSettings: (settings: Partial<IProject["settings"]>) => void;
  reset: (project: IProject) => void;
  recalculateDuration: () => void;

  // Command API
  execute: <T>(command: Command<T>) => void;
  batch: (commands: Command[]) => void;
  undo: () => void;
  redo: () => void;

  // Patch stream
  /** Subscribe to patches emitted after every mutation. Returns an unsubscribe function. */
  onChange: (handler: (patches: Patch[]) => void) => () => void;
  /** Apply patches from a remote source without recording history (client-side sync). */
  applyPatch: (patches: Patch[]) => void;
  /** Return a plain serializable snapshot of the project (settings, tracks, clips). */
  getSnapshot: () => IProject;
}

export type ProjectStore = ProjectState & ProjectActions;

export const createProjectStore = (initialState?: Partial<IProject>) => {
  // Patch listeners live outside Zustand state (not serializable)
  const patchListeners = new Set<(patches: Patch[]) => void>();

  const emitPatches = (patches: Patch[]) => {
    if (patches.length === 0) return;
    patchListeners.forEach((handler) => handler(patches));
  };

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
      zoom: 0.75,
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

      // Resolve TODO: emit patches for collaborators/engines
      emitPatches(patches);
      get().recalculateDuration();
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
          } else {
            console.warn(`[Core.batch] No handler registered for command: ${command.type}`);
          }
        });

        return {
          ...nextState,
          history: [
            ...currentState.history,
            {
              command: {
                id: nanoid(),
                type: "batch",
                payload: commandLogs,
              },
              patches: allPatches,
              inversePatches: allInversePatches.reverse(),
            },
          ],
          future: [],
        };
      });

      emitPatches(allPatches);
      get().recalculateDuration();
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
      emitPatches(entry.inversePatches);
      get().recalculateDuration();
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
      emitPatches(entry.patches);
      get().recalculateDuration();
    },

    // Patch stream
    onChange: (handler) => {
      patchListeners.add(handler);
      return () => patchListeners.delete(handler);
    },

    applyPatch: (patches) => {
      // Applies remote patches silently — no history, no onChange emission
      set((state) => {
        const nextState = { ...state };
        applyPatches(nextState, patches);
        return nextState;
      });
      get().recalculateDuration();
    },

    getSnapshot: (): IProject => {
      const { settings, tracks, clips } = get();
      return {
        settings: { ...settings },
        tracks: tracks.map((t) => ({ ...t, clipIds: [...t.clipIds] })),
        clips: Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, { ...v }])) as Record<
          string,
          AnyClip
        >,
      };
    },

    // Actions: Selection
    select: (ids, multi = false) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      get().execute({
        id: nanoid(),
        type: "project.select",
        payload: { ids: idArray, multi },
      });
    },

    deselect: (ids) => {
      const idArray = ids ? (Array.isArray(ids) ? ids : [ids]) : undefined;
      get().execute({
        id: nanoid(),
        type: "project.deselect",
        payload: idArray,
      });
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
          ...(typeof scale === "function" ? scale(state.scale) : scale),
        },
      })),

    // Actions: Project
    updateSettings: (settings) => {
      set((state) => ({
        settings: { ...state.settings, ...settings },
      }));
    },

    reset: (project) => {
      get().execute({
        id: nanoid(),
        type: "project.reset",
        payload: project,
      });
    },

    recalculateDuration: () => {
      const { clips } = get();
      let maxUs = 0;
      Object.values(clips).forEach((clip) => {
        const display = clip.timing?.display || clip.display;
        const duration = clip.timing?.duration ?? clip.duration ?? 0;
        if (!display) return;
        const endUs = display.to > 0 ? display.to : display.from + duration;
        if (endUs > maxUs) maxUs = endUs;
      });
      const finalDuration = maxUs;

      if (get().settings.duration !== finalDuration) {
        get().updateSettings({ duration: finalDuration });
      }
    },
  }));
};

export const projectStore = createProjectStore();
