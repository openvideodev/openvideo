import { Core, Patch } from '@openvideo/core';
import Timeline from './timeline';

/**
 * TimelineBridge - Synchronizes Core state to the Timeline Canvas.
 */
export class TimelineBridge {
  private core: Core;
  private timeline: Timeline;

  constructor(core: Core, timeline: Timeline) {
    this.core = core;
    this.timeline = timeline;

    this.init();
  }

  private init() {
    this.core.on('change', (patches: Patch[]) => this.handlePatches(patches));

    // 2. Initial Sync
    this.syncInitialState();
  }

  private handlePatches(patches: Patch[]) {
    // For now, we can just trigger a full sync when patches arrive
    // or be more granular. Granular is better.

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
