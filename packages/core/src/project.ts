import { createStore } from "zustand/vanilla";
import { IProject, AnyClip, ITrack, IScaleState } from "./types";
import { loadClip } from "./utils/load-item";
import { manageTracks } from "./utils/manage-tracks";

export interface ProjectState extends IProject {
  selectedIds: string[];
  currentTime: number; // in microseconds
  isPlaying: boolean;
  scale: IScaleState;
}

export interface ProjectActions {
  // Selection
  select: (ids: string | string[], multi?: boolean) => void;
  deselect: (ids?: string | string[]) => void;

  // Clips
  addClip: (clip: Partial<AnyClip> & { type: string }, trackId?: string) => AnyClip;
  updateClip: (id: string, updates: Partial<AnyClip>) => void;
  removeClips: (ids: string[]) => void;

  // Tracks
  setTracks: (tracks: ITrack[]) => void;
  
  // Playback
  seek: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;

  // Scale
  setScale: (scale: Partial<IScaleState> | ((prev: IScaleState) => Partial<IScaleState>)) => void;

  // Project
  updateSettings: (settings: Partial<IProject["settings"]>) => void;
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
    scale: {
      zoom: 1,
      unit: 100,
      segments: 5,
      index: 0,
    },

    // Actions: Selection
    select: (ids, multi = false) => {
      const newIds = Array.isArray(ids) ? ids : [ids];
      set((state) => ({
        selectedIds: multi ? [...new Set([...state.selectedIds, ...newIds])] : newIds,
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

    // Actions: Scale
    setScale: (scale) =>
      set((state) => ({
        scale: { 
          ...state.scale, 
          ...(typeof scale === "function" ? scale(state.scale) : scale) 
        },
      })),

    // Actions: Clips
    addClip: (payload, trackId) => {
      const state = get();
      
      // 1. Load/Prepare Clip (Modularity: Step 1)
      const newClip = loadClip(payload, { 
        canvasSize: { width: state.settings.width, height: state.settings.height } 
      });

      set((state) => {
        // 2. Manage Tracks (Modularity: Step 2)
        const { tracks: nextTracks } = manageTracks(state.tracks, newClip, trackId);
        
        return { 
          clips: { ...state.clips, [newClip.id]: newClip }, 
          tracks: nextTracks 
        };
      });

      return newClip;
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
    },

    // Actions: Tracks
    setTracks: (tracks) => set({ tracks }),

    // Actions: Project
    updateSettings: (settings) =>
      set((state) => ({
        settings: { ...state.settings, ...settings },
      })),
  }));
};

export const projectStore = createProjectStore();
