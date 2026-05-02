import { clipToJSON, type IClip as StudioClip, Studio, jsonToClip } from "openvideo";
import CanvasTimeline, { TIMELINE_SEEK } from "@openvideo/timeline";
import { IClip } from "@/types/timeline";
import { engine, projectStore } from "@/lib/project";

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
  let isSyncingFromStudio = false;
  const handleClipTransforming = ({ clip }: { clip: IClip }) => {
    const serialized = clipToJSON(clip as unknown as StudioClip) as any;
    // Emit real-time event through the engine WITHOUT updating the store
    // This allows UI components to react without the overhead of a full state commit
    engine.emit("clip:transforming", { id: clip.id, updates: serialized });
  };

  const handleClipUpdatedFromStudio = ({ clip }: { clip: IClip }) => {
    const serialized = clipToJSON(clip as unknown as StudioClip) as any;
    isSyncingFromStudio = true;
    try {
      // Commit to Core store only when finalized or explicitly updated
      projectStore.getState().updateClip(clip.id, serialized);
    } finally {
      isSyncingFromStudio = false;
    }
  };

  const handleSelectionFromStudio = (data: { selected: any[] }) => {
    const ids = data.selected.map(c => c.id);
    projectStore.getState().select(ids);
  };

  const handleStudioTime = ({ currentTime }: any) => projectStore.getState().seek(currentTime);
  const handleStudioPlay = () => projectStore.getState().setIsPlaying(true);
  const handleStudioPause = () => projectStore.getState().setIsPlaying(false);
  const handleSelectionClearedFromStudio = () => projectStore.getState().deselect();

  studio.on("clip:updated", handleClipUpdatedFromStudio as any);
  studio.on("clip:transforming", handleClipTransforming as any);
  studio.on("selection:created", handleSelectionFromStudio);
  studio.on("selection:updated", handleSelectionFromStudio);
  studio.on("selection:cleared", handleSelectionClearedFromStudio);
  studio.on("currentTime", handleStudioTime);
  studio.on("play", handleStudioPlay);
  studio.on("pause", handleStudioPause);

  // Captures changes from Timeline UI (dragging, resizing)
  let isSyncingFromTimeline = false;

  const handleTimelineStateChanged = async ({ payload, options }: any) => {
    // Only propagate back to core if it's a structural or property change
    if (options?.kind !== "layer:selection") {
      isSyncingFromTimeline = true;
      try {
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
      } finally {
        isSyncingFromTimeline = false;
      }
    } else if (payload.activeIds) {
      if (JSON.stringify(payload.activeIds) !== JSON.stringify(projectStore.getState().selectedIds)) {
        projectStore.getState().select(payload.activeIds);
      }
    }

    console.log("Timeline state changed", {payload, options});
  };

  timeline.emitter.on("STATE_CHANGED", handleTimelineStateChanged);

  const handleTimelineSeek = ({ payload }: any) => {
    projectStore.getState().seek(payload.time);
  };

  timeline.emitter.on(TIMELINE_SEEK, handleTimelineSeek);

  // Captures "Add" events from Drop interactions
  const handleAddClip = ({ payload, options }: any) => {
    console.log("timeline add event: ", { payload, options });
    engine.addClip(payload, options);
  };

  timeline.emitter.on("add:video", handleAddClip);
  timeline.emitter.on("add:image", handleAddClip);
  timeline.emitter.on("add:audio", handleAddClip);
  timeline.emitter.on("add:text", handleAddClip);
  timeline.emitter.on("add:transition", handleAddClip);
  timeline.emitter.on("add:effect", handleAddClip);

  // --- 2. CORE -> ENGINES (Reconciliation) ---

  let prevState = projectStore.getState();

  const unsubCore = projectStore.subscribe(async (state) => {
    if (isSyncingFromTimeline || isSyncingFromStudio) return;

    const currentPrevState = prevState;
    prevState = state;

    try {
      // 3. Sync to Timeline (Engine)
      // Scale
      if (state.scale !== currentPrevState.scale) {
        timeline.syncScale({ scale: state.scale });
      }

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

      // 4. Sync Selection
      if (state.selectedIds !== currentPrevState.selectedIds) {
        const timelineActiveIds = timeline.activeIds;
        if (JSON.stringify(timelineActiveIds) !== JSON.stringify(state.selectedIds)) {
          timeline.syncSelection(state.selectedIds);
        }

        // Sync to Studio if not already selected (StudioBridge doesn't handle selection)
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
    studio.off("clip:transforming", handleClipTransforming as any);
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
