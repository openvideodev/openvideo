import {
  clipToJSON,
  type IClip as StudioClip,
  Studio,
  jsonToClip,
} from '@openvideo/engine-pixi';
import CanvasTimeline, { TIMELINE_SEEK } from '@openvideo/timeline';
import { IClip } from '@/types/timeline';
import { core, projectStore } from '@/lib/project';
import { nanoid } from 'nanoid';

/**
 * Connects the Timeline instance to the Zustand store for Store -> Engine sync.
 */
// Note: addTimelineStoreSync has been consolidated into addStudioSync
// to follow a pure Core-First synchronization flow.

/**
 * Connects the Studio instance to the Store and Timeline.
 */
export const addStudioSync = (
  studio: Studio,
  timeline: CanvasTimeline
): (() => void) => {
  console.log('Adding studio sync with Core-First flow');
  // --- 1. ENGINES -> CORE (Interaction Capture) ---

  // Captures changes from Studio (e.g. property panel or direct canvas edits)
  // After a transform ends, the SelectionManager already calls core.execute internally
  // (when core is attached). Here we only listen to emit real-time transforming events.
  const handleClipTransforming = ({ clip }: { clip: IClip }) => {
    const serialized = clipToJSON(clip as unknown as StudioClip) as any;
    // Real-time signaling only — no state commit yet
    core.emit('clip:transforming', { id: clip.id, updates: serialized });
  };

  // When Core is attached (via StudioBridge) the Studio no longer needs to write
  // back to the store directly — the core command pipeline handles it. We only
  // sync selection which is still a lightweight store write.
  const handleSelectionFromStudio = (data: { selected: any[] }) => {
    const ids = data.selected.map((c: any) => c.id);
    projectStore.getState().select(ids);
  };

  const handleSelectionClearedFromStudio = () =>
    projectStore.getState().deselect();

  studio.on('clip:transforming', handleClipTransforming as any);
  studio.on('selection:created', handleSelectionFromStudio);
  studio.on('selection:updated', handleSelectionFromStudio);
  studio.on('selection:cleared', handleSelectionClearedFromStudio);

  // Captures timeline drag/resize events → route through core commands
  const handleTimelineStateChanged = async ({ payload, options }: any) => {
    if (options?.kind === 'layer:selection') {
      // Selection only
      if (payload.activeIds) {
        const storeIds = projectStore.getState().selectedIds;
        if (JSON.stringify(storeIds) !== JSON.stringify(payload.activeIds)) {
          projectStore.getState().select(payload.activeIds);
        }
      }
      return;
    }

    // Structural change: tracks/clips
    if (payload.clips) {
      Object.values(payload.clips).forEach((clip: any) => {
        const coreClip = projectStore.getState().clips[clip.id];
        if (coreClip && JSON.stringify(coreClip) !== JSON.stringify(clip)) {
          core.execute({
            id: nanoid(),
            type: 'clip.update',
            payload: { id: clip.id, updates: clip },
          });
        }
      });
    }
    if (payload.tracks) {
      const storeTracksStr = JSON.stringify(projectStore.getState().tracks);
      if (storeTracksStr !== JSON.stringify(payload.tracks)) {
        core.execute({
          id: nanoid(),
          type: 'track.set',
          payload: payload.tracks,
        });
      }
    }
  };

  timeline.emitter.on('STATE_CHANGED', handleTimelineStateChanged);

  const handleTimelineSeek = ({ payload }: any) => {
    projectStore.getState().seek(payload.time);
  };

  timeline.emitter.on(TIMELINE_SEEK, handleTimelineSeek);

  // Timeline drop events → route through core.clip.add
  const handleAddClip = async ({ payload, options }: any) => {
    console.log('timeline add event: ', { payload, options });
    await core.clip.add(payload, options);
  };

  timeline.emitter.on('add:video', handleAddClip);
  timeline.emitter.on('add:image', handleAddClip);
  timeline.emitter.on('add:audio', handleAddClip);
  timeline.emitter.on('add:text', handleAddClip);
  timeline.emitter.on('add:transition', handleAddClip);
  timeline.emitter.on('add:effect', handleAddClip);

  // --- 2. CORE -> ENGINES (Reconciliation via store subscription) ---
  // The StudioBridge + TimelineBridge handle patch-driven reconciliation.
  // This subscription handles scale sync and selection cross-sync only.
  let prevState = projectStore.getState();

  const unsubCore = projectStore.subscribe(async (state) => {
    const currentPrevState = prevState;
    prevState = state;

    try {
      // Scale
      if (state.scale !== currentPrevState.scale) {
        timeline.syncScale({ scale: state.scale });
      }

      // Selection cross-sync (Studio <-> Core)
      if (state.selectedIds !== currentPrevState.selectedIds) {
        const timelineActiveIds = timeline.activeIds;
        if (
          JSON.stringify(timelineActiveIds) !==
          JSON.stringify(state.selectedIds)
        ) {
          timeline.syncSelection(state.selectedIds);
        }

        const currentStudioSelection = studio.selection
          .getSelection()
          .map((c: any) => c.id);
        if (
          JSON.stringify(currentStudioSelection) !==
          JSON.stringify(state.selectedIds)
        ) {
          studio.selectClipsByIds(state.selectedIds);
        }
      }
    } catch (e) {
      console.warn('Core subscription error:', e);
    }
  });

  return () => {
    studio.off('clip:transforming', handleClipTransforming as any);
    studio.off('selection:created', handleSelectionFromStudio);
    studio.off('selection:updated', handleSelectionFromStudio);
    studio.off('selection:cleared', handleSelectionClearedFromStudio);
    timeline.emitter.off('STATE_CHANGED', handleTimelineStateChanged);
    timeline.emitter.off(TIMELINE_SEEK, handleTimelineSeek);
    timeline.emitter.off('add:video', handleAddClip);
    timeline.emitter.off('add:image', handleAddClip);
    timeline.emitter.off('add:audio', handleAddClip);
    timeline.emitter.off('add:text', handleAddClip);
    timeline.emitter.off('add:transition', handleAddClip);
    timeline.emitter.off('add:effect', handleAddClip);
    unsubCore();
  };
};
