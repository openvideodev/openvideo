import { Core, Patch, nanoid } from '@openvideo/core';
import Timeline from './timeline';

/**
 * TimelineBridge - Synchronizes Core state to the Timeline Canvas.
 */
export class TimelineBridge {
  private core: Core;
  private timeline: Timeline;
  private isSyncing = false;

  constructor(core: Core, timeline: Timeline) {
    this.core = core;
    this.timeline = timeline;

    this.init();
  }

  private init() {
    // 1. Core -> Timeline
    this.core.on('change', (patches: Patch[]) => {
      if (this.isSyncing) return;
      this.handlePatches(patches);
    });

    // 2. Timeline -> Core
    this.timeline.emitter.on('STATE_CHANGED', (data: any) =>
      this.handleTimelineStateChanged(data)
    );

    // 3. Initial Sync
    this.syncInitialState();
  }

  private handlePatches(patches: Patch[]) {
    let tracksChanged = false;
    let clipsChanged = false;
    let selectionChanged = false;

    patches.forEach((patch) => {
      const parts = patch.path.split('/').filter(Boolean);
      if (parts[0] === 'tracks') tracksChanged = true;
      if (parts[0] === 'clips') clipsChanged = true;
      if (parts[0] === 'selectedIds') selectionChanged = true;
    });

    const state = this.core.store.getState();

    if (tracksChanged || clipsChanged) {
      this.timeline.syncAddOrRemoveClips(this.transformState(state));
    }

    if (selectionChanged) {
      this.timeline.syncSelection(state.selectedIds);
    }
  }

  private handleTimelineStateChanged({ payload, options }: any) {
    if (this.isSyncing) return;

    // 1. Selection Sync
    if (options?.kind === 'layer:selection') {
      if (payload.activeIds) {
        const storeIds = this.core.store.getState().selectedIds;
        if (JSON.stringify(storeIds) !== JSON.stringify(payload.activeIds)) {
          this.isSyncing = true;
          try {
            this.core.store.getState().select(payload.activeIds);
          } finally {
            this.isSyncing = false;
          }
        }
      }
      return;
    }

    // 2. Structural Change Sync (Clips/Tracks)
    this.isSyncing = true;
    try {
      if (payload.clips) {
        Object.values(payload.clips).forEach((clip: any) => {
          const coreClip = this.core.store.getState().clips[clip.id];
          if (coreClip && JSON.stringify(coreClip) !== JSON.stringify(clip)) {
            this.core.execute({
              id: nanoid(),
              type: 'clip.update',
              payload: { id: clip.id, updates: clip },
            });
          }
        });
      }

      if (payload.tracks) {
        const storeTracksStr = JSON.stringify(this.core.store.getState().tracks);
        if (storeTracksStr !== JSON.stringify(payload.tracks)) {
          this.core.execute({
            id: nanoid(),
            type: 'track.set',
            payload: payload.tracks,
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private syncInitialState() {
    const state = this.core.store.getState();

    this.timeline.syncAddOrRemoveClips(this.transformState(state));

    this.timeline.syncSelection(state.selectedIds);
  }

  private transformState(state: any) {
    return {
      ...state,
      clips: Object.values(state.clips || {}),
      activeIds: state.selectedIds || [],
      duration: state.settings?.duration || 30_000_000,
    };
  }

  public dispose() {
    this.core.removeAllListeners();
  }
}
