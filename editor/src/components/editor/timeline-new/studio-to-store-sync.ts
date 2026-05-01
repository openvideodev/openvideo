import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { clipToJSON, type IClip as StudioClip, Studio, jsonToClip } from "openvideo";
import CanvasTimeline, { TIMELINE_SEEK } from "@openvideo/timeline";
import { IClip } from "@/types/timeline";
import { projectStore } from "@/lib/project";

/**
 * Connects the Timeline instance to the Zustand store for Store -> Engine sync.
 */
// Note: addTimelineStoreSync has been consolidated into addStudioSync
// to follow a pure Core-First synchronization flow.

/**
 * Connects the Studio instance to the Store and Timeline.
 */
export const addStudioSync = (studio: Studio, timeline: CanvasTimeline): (() => void) => {
  console.log("Adding studio sync with Core-First flow");
  // --- 1. ENGINES -> CORE (Interaction Capture) ---
  
  // Captures changes from Studio (e.g. property panel or direct canvas edits)
  const handleClipUpdatedFromStudio = ({ clip }: { clip: IClip }) => {
    const serialized = clipToJSON(clip as unknown as StudioClip) as any;
    projectStore.getState().updateClip(clip.id, serialized);
  };

  const handleSelectionFromStudio = (data: { selected: any[] }) => {
    const ids = data.selected.map(c => c.id);
    projectStore.getState().select(ids);
  };

  // Captures playback from Studio
  const handleStudioTime = ({ currentTime }: any) => projectStore.getState().seek(currentTime);
  const handleStudioPlay = () => projectStore.getState().setIsPlaying(true);
  const handleStudioPause = () => projectStore.getState().setIsPlaying(false);
  const handleSelectionClearedFromStudio = () => projectStore.getState().deselect();

  studio.on("clip:updated", handleClipUpdatedFromStudio as any);
  studio.on("selection:created", handleSelectionFromStudio);
  studio.on("selection:updated", handleSelectionFromStudio);
  studio.on("selection:cleared", handleSelectionClearedFromStudio);
  studio.on("currentTime", handleStudioTime);
  studio.on("play", handleStudioPlay);
  studio.on("pause", handleStudioPause);

  // Captures changes from Timeline UI (dragging, resizing)
  const handleTimelineStateChanged = async ({ payload, options }: any) => {
    // Only propagate back to core if it's a structural or property change
    if (options?.kind !== "layer:selection") {
      if (payload.clips) {
        Object.values(payload.clips).forEach((clip: any) => {
          const coreClip = projectStore.getState().clips[clip.id];
          if (coreClip && JSON.stringify(coreClip) !== JSON.stringify(clip)) {
            projectStore.getState().updateClip(clip.id, clip);
          }
        });
      }
      if (payload.tracks) {
        if (JSON.stringify(payload.tracks) !== JSON.stringify(projectStore.getState().tracks)) {
          projectStore.getState().setTracks(payload.tracks);
        }
      }
    } else if (payload.activeIds) {
      if (JSON.stringify(payload.activeIds) !== JSON.stringify(projectStore.getState().selectedIds)) {
        projectStore.getState().select(payload.activeIds);
      }
    }
  };

  timeline.emitter.on("STATE_CHANGED", handleTimelineStateChanged);

  const handleTimelineSeek = ({ payload }: any) => {
    projectStore.getState().seek(payload.time);
  };

  timeline.emitter.on(TIMELINE_SEEK, handleTimelineSeek);

  // --- 2. CORE -> ENGINES (Reconciliation) ---
  
  let prevState = projectStore.getState();

  const unsubCore = projectStore.subscribe(async (state) => {
    
    const currentPrevState = prevState;
    prevState = state;

    try {
      // A. Sync to Zustand (React UI) - Atomic update to prevent double-sync
      useTimelineStore.setState({ 
        clips: state.clips, 
        tracks: state.tracks as any,
        selectedClipIds: state.selectedIds 
      });

      // B. Sync to Playback Store (React UI)
      if (state.currentTime !== currentPrevState.currentTime || state.isPlaying !== currentPrevState.isPlaying) {
        usePlaybackStore.setState({
          currentTime: state.currentTime / 1_000_000,
          isPlaying: state.isPlaying
        });
      }

      // C. Sync to Studio (Renderer)
      // Playback
      if (state.currentTime !== currentPrevState.currentTime) {
        if (Math.abs(studio.currentTime - state.currentTime) > 1000) { // 1ms threshold
          studio.seek(state.currentTime);
        }
      }
      if (state.isPlaying !== currentPrevState.isPlaying) {
        if (state.isPlaying) studio.play();
        else studio.pause();
      }

      // D. Sync to Timeline (Engine)
      // Scale
      if (state.scale !== currentPrevState.scale) {
        timeline.syncScale({ scale: state.scale });
      }

      // Clips & Tracks
      const studioClipsMap = new Map(studio.clips.map((c: any) => [c.id, c]));
      const coreClips = Object.values(state.clips);

      // Handle Additions & Updates
      for (const clipJSON of coreClips) {
        const sClip = studioClipsMap.get(clipJSON.id);
        if (!sClip) {
          const newClip = await jsonToClip(clipJSON as any);
          const track = state.tracks.find(t => t.clipIds.includes(clipJSON.id));
          await studio.addClip(newClip, { trackId: track?.id });
        } else {
          // Sync properties if changed
          const hasTimingChanged = 
            clipJSON.display.from !== sClip.display.from || 
            clipJSON.display.to !== sClip.display.to;
          
          if (hasTimingChanged) {
            studio.updateClips([{ 
              id: clipJSON.id, 
              updates: { display: clipJSON.display, duration: clipJSON.duration, trim: clipJSON.trim } 
            }]);
          }
        }
        studioClipsMap.delete(clipJSON.id);
      }

      // Handle Removals
      const removedIds = Array.from(studioClipsMap.keys());
      if (removedIds.length > 0) {
        await studio.removeClipsById(removedIds);
      }

      // D. Sync to Timeline (Engine)
      const timelineState = timeline.getUpdatedState();
      const isTimelineStateSynced = 
        JSON.stringify(timelineState.clips) === JSON.stringify(Object.values(state.clips)) &&
        JSON.stringify(timelineState.tracks) === JSON.stringify(state.tracks);

      if (!isTimelineStateSynced) {
        const clipsIds = Object.keys(state.clips);
        const prevClipsIds = Object.keys(currentPrevState.clips);
        const structuralChange = 
          clipsIds.length !== prevClipsIds.length || 
          !clipsIds.every(id => prevClipsIds.includes(id)) ||
          state.tracks !== currentPrevState.tracks;

        if (structuralChange) {
          timeline.syncAddOrRemoveClips({
            ...state,
            activeIds: state.selectedIds,
            clips: Object.values(state.clips)
          } as any);
        } else if (state.clips !== currentPrevState.clips) {
          timeline.syncClipProperties({
            clips: Object.values(state.clips) as any,
            state: state as any
          });
        }
      }

      // E. Sync Selection
      if (state.selectedIds !== currentPrevState.selectedIds) {
        const timelineActiveIds = timeline.activeIds;
        if (JSON.stringify(timelineActiveIds) !== JSON.stringify(state.selectedIds)) {
          timeline.syncSelection(state.selectedIds);
        }
        
        // Sync to Studio if not already selected
        const currentStudioSelection = studio.selection.getSelection().map(c => c.id);
        if (JSON.stringify(currentStudioSelection) !== JSON.stringify(state.selectedIds)) {
          studio.selectClipsByIds(state.selectedIds);
        }
      }
    } finally {
    }
  });

  return () => {
    studio.off("clip:updated", handleClipUpdatedFromStudio as any);
    studio.off("selection:created", handleSelectionFromStudio);
    studio.off("selection:updated", handleSelectionFromStudio);
    studio.off("selection:cleared", handleSelectionClearedFromStudio);
    studio.off("currentTime", handleStudioTime);
    studio.off("play", handleStudioPlay);
    studio.off("pause", handleStudioPause);
    timeline.emitter.off("STATE_CHANGED", handleTimelineStateChanged);
    timeline.emitter.off(TIMELINE_SEEK, handleTimelineSeek);
    unsubCore();
  };
};
