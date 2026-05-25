import { type Core, type Patch, nanoid } from "@openvideo/core";
import type Timeline from "./timeline";

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
    this.core.on("change", (patches: Patch[]) => {
      if (this.isSyncing) return;
      this.handlePatches(patches);
    });

    // 2. Timeline -> Core
    this.timeline.emitter.on("STATE_CHANGED", (data: any) => this.handleTimelineStateChanged(data));

    // 3. Initial Sync
    this.syncInitialState();
  }

  private handlePatches(patches: Patch[]) {
    let tracksChanged = false;
    let clipsChanged = false;
    let selectionChanged = false;

    patches.forEach((patch) => {
      const parts = patch.path.split("/").filter(Boolean);
      if (parts[0] === "tracks") tracksChanged = true;
      if (parts[0] === "clips") clipsChanged = true;
      if (parts[0] === "selectedIds") selectionChanged = true;
    });

    const state = this.core.store.getState();

    if (tracksChanged || clipsChanged) {
      this.timeline.syncAddOrRemoveClips(this.transformState(state));
    }

    if (selectionChanged) {
      this.timeline.syncSelection(state.selectedIds);
    }
  }

  private isDeepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") {
      return Math.abs(a - b) <= 0.01;
    }
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
      return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!this.isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  private isClipEqual(coreClip: any, timelineClip: any): boolean {
    if (!coreClip || !timelineClip) return false;

    // 1. Basic properties (excluding playbackRate and duration which are timing-dependent)
    const basicProps = [
      "left",
      "top",
      "width",
      "height",
      "angle",
      "zIndex",
      "opacity",
      "volume",
      "locked",
    ];

    for (const prop of basicProps) {
      const val1 = coreClip[prop];
      const val2 = timelineClip[prop];
      if (val1 === val2) continue;
      if (typeof val1 === "number" && typeof val2 === "number") {
        if (Math.abs(val1 - val2) <= 0.01) continue;
      }
      return false;
    }

    // 2. Timing-dependent properties (display, trim, duration, playbackRate)
    const coreDisplay = coreClip.timing?.display || coreClip.display;
    const timelineDisplay = timelineClip.timing?.display || timelineClip.display;
    if (!this.isDeepEqual(coreDisplay, timelineDisplay)) return false;

    const coreTrim = coreClip.timing?.trim || coreClip.trim;
    const timelineTrim = timelineClip.timing?.trim || timelineClip.trim;
    if (!this.isDeepEqual(coreTrim, timelineTrim)) return false;

    const coreDuration = coreClip.timing?.duration ?? coreClip.duration;
    const timelineDuration = timelineClip.timing?.duration ?? timelineClip.duration;
    if (typeof coreDuration === "number" && typeof timelineDuration === "number") {
      if (Math.abs(coreDuration - timelineDuration) > 0.01) return false;
    } else if (coreDuration !== timelineDuration) {
      return false;
    }

    const corePlaybackRate = coreClip.timing?.playbackRate ?? coreClip.playbackRate;
    const timelinePlaybackRate = timelineClip.timing?.playbackRate ?? timelineClip.playbackRate;
    if (typeof corePlaybackRate === "number" && typeof timelinePlaybackRate === "number") {
      if (Math.abs(corePlaybackRate - timelinePlaybackRate) > 0.01) return false;
    } else if (corePlaybackRate !== timelinePlaybackRate) {
      return false;
    }

    // 3. Style / complex properties
    if (!this.isDeepEqual(coreClip.style, timelineClip.style)) return false;

    return true;
  }

  private handleTimelineStateChanged({ payload, options }: any) {
    if (this.isSyncing) return;

    // 1. Selection Sync
    if (options?.kind === "layer:selection") {
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
          if (coreClip && !this.isClipEqual(coreClip, clip)) {
            this.core.execute({
              id: nanoid(),
              type: "clip.update",
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
            type: "track.set",
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
