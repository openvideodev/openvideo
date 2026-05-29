import type { Core, AnyClip, Patch } from "@openvideo/core";
import type { Studio } from "./studio";
import type { IClip } from "./clips/iclip";
import { jsonToClip } from "./json-serialization";
import { fontManager } from "./utils/fonts";

/**
 * StudioBridge - The "Reconciler" between Core and Studio.
 * Now driven by Patches for deterministic rendering.
 */
export class StudioBridge {
  private core: Core;
  private studio: Studio;

  constructor(core: Core, studio: Studio) {
    this.core = core;
    this.studio = studio;

    this.init();
  }

  private isSyncing = false;

  private async init() {
    await this.studio.ready;

    // 1. Sync Playback
    this.core.on("timeupdate", async (time: number) => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        // If we're not playing, seek the studio to match core
        // If we ARE playing, the studio's own loop is already updating time,
        // but we still want to allow external seeks (scrubbing) to take precedence.
        if (!this.studio.isPlaying) {
          await this.studio.transport.seek(time);
        }
      } finally {
        this.isSyncing = false;
      }
    });

    this.core.on("play", () => {
      this.studio.play();
    });

    this.core.on("pause", () => {
      this.studio.pause();
    });

    // 2. Sync Back from Studio to Core (Source of Truth)
    this.studio.on("currentTime", ({ currentTime }) => {
      if (this.studio.isPlaying && !this.isSyncing) {
        this.isSyncing = true;
        try {
          this.core.seek(currentTime);
        } finally {
          this.isSyncing = false;
        }
      }
    });

    // 4. Selection Sync (Studio -> Core)
    const handleSelectionFromStudio = (data: { selected: any[] }) => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        const ids = data.selected.map((c: any) => c.id);
        const currentSelectedIds = this.core.store.getState().selectedIds;
        if (JSON.stringify(ids) !== JSON.stringify(currentSelectedIds)) {
          this.core.store.getState().select(ids);
        }
      } finally {
        this.isSyncing = false;
      }
    };

    this.studio.on("selection:created", handleSelectionFromStudio);
    this.studio.on("selection:updated", handleSelectionFromStudio);
    this.studio.on("selection:cleared", () => handleSelectionFromStudio({ selected: [] }));

    // 5. Sync via Patches
    this.core.on("change", (patches: Patch[]) => this.handlePatches(patches));

    // 6. Initial Sync
    await this.syncInitialState();
  }

  private syncSelectionToStudio(ids: string[]) {
    const currentStudioSelection = this.studio.selection.getSelection().map((c: any) => c.id);
    if (JSON.stringify(ids) !== JSON.stringify(currentStudioSelection)) {
      this.studio.selectClipsByIds(ids);
    }
  }

  private async handlePatches(patches: Patch[]) {
    // Only trigger a full re-sync for root replacements or settings changes.
    // Structural changes like tracks and clips are now handled granularly.
    const structuralProps = ["settings"];
    const hasRootUpdate = patches.some((patch) => {
      if (patch.path === "/") return true;
      const parts = patch.path.split("/").filter(Boolean);
      return parts.length === 1 && patch.op === "update" && structuralProps.includes(parts[0]);
    });

    if (hasRootUpdate) {
      await this.syncInitialState();
      return;
    }

    for (const patch of patches) {
      const parts = patch.path.split("/").filter(Boolean);

      // Handle Clips
      if (parts[0] === "clips") {
        const clipId = parts[1];
        if (patch.op === "add" && !parts[2]) {
          await this.handleAddClip(patch.value);
        } else if (patch.op === "remove" && !parts[2]) {
          await this.handleRemoveClip(clipId);
        } else if (patch.op === "update") {
          await this.handleUpdateClip(clipId, parts.slice(2), patch.value);
        }
      }

      // Handle Tracks
      if (parts[0] === "tracks") {
        await this.studio.setTracks(this.core.store.getState().tracks as any);
      }

      // Handle Settings
      if (parts[0] === "settings") {
        const settings = this.core.store.getState().settings;
        this.studio.setSize(settings.width, settings.height);
      }

      // Handle Selection
      if (parts[0] === "selectedIds") {
        this.syncSelectionToStudio(this.core.store.getState().selectedIds);
      }
    }
  }

  private async handleAddClip(coreClip: AnyClip) {
    if (coreClip.type === "Transition") {
      await this.studio.addTransition(
        coreClip.transitionKey || "none",
        coreClip.duration,
        coreClip.fromClipId,
        coreClip.toClipId,
        coreClip.id, // Preserve core clip ID so removal by that ID works
      );
    } else {
      // Pre-load any font referenced by this clip before constructing the Pixi clip.
      // This ensures document.fonts is ready when refreshText() runs.
      await this.ensureFontForClip(coreClip);
      const clip = await jsonToClip(coreClip);
      const trackId = this.findTrackIdForClip(coreClip.id);
      await this.studio.addClip(clip, { trackId });
    }
  }

  private async handleRemoveClip(clipId: string) {
    const clip = this.studio.timeline.getClipById(clipId);
    if (clip) {
      await this.studio.removeClip(clip);
    }
  }

  private async handleUpdateClip(clipId: string, pathParts: string[], value: any) {
    const clip = this.studio.timeline.getClipById(clipId);
    if (!clip) return;

    // Simple property update
    if (pathParts.length === 0) {
      // Full clip update
      const wasLocked = clip.locked;
      const changed = this.syncClipProperties(clip, value);

      if (changed) {
        // If lock status changed and it's selected, refresh transformer
        if (wasLocked !== clip.locked && this.studio.selection.selectedClips.has(clip)) {
          this.studio.selection.recreateTransformer();
        }
        await this.studio.timeline.recalculateMaxDuration();
        this.studio.updateFrame(this.studio.currentTime);
      }
    } else {
      // Granular update (e.g. /clips/c1/left or /clips/c1/timing)
      const prop = pathParts[0];
      let changed = false;

      if (prop === "timing") {
        if (pathParts.length === 1) {
          if (value) {
            if (value.display) {
              clip.display = { ...value.display };
            }
            if (value.trim) {
              clip.trim = { ...value.trim };
            }
            if (value.duration !== undefined) {
              clip.duration = value.duration;
            }
            if (value.playbackRate !== undefined) {
              clip.playbackRate = value.playbackRate;
            }
            changed = true;
          }
        } else {
          const subProp = pathParts[1];
          if (subProp === "display") {
            clip.display = { ...value };
            changed = true;
          } else if (subProp === "trim") {
            clip.trim = { ...value };
            changed = true;
          } else if (subProp === "duration") {
            clip.duration = value;
            changed = true;
          } else if (subProp === "playbackRate") {
            clip.playbackRate = value;
            changed = true;
          }
        }
      } else if (prop === "display") {
        if (!clip.display || clip.display.from !== value.from || clip.display.to !== value.to) {
          clip.display = { ...value };
          changed = true;
        }
      } else if (prop === "transform") {
        if (pathParts.length === 1) {
          if (value) {
            if (value.x !== undefined && clip.left !== value.x) {
              clip.left = value.x;
              changed = true;
            }
            if (value.y !== undefined && clip.top !== value.y) {
              clip.top = value.y;
              changed = true;
            }
            if (value.width !== undefined && clip.width !== value.width) {
              clip.width = value.width;
              changed = true;
            }
            if (value.height !== undefined && clip.height !== value.height) {
              clip.height = value.height;
              changed = true;
            }
            if (value.angle !== undefined && clip.angle !== value.angle) {
              clip.angle = value.angle;
              changed = true;
            }
            if (value.opacity !== undefined && clip.opacity !== value.opacity) {
              clip.opacity = value.opacity;
              changed = true;
            }
            if (value.zIndex !== undefined && clip.zIndex !== value.zIndex) {
              clip.zIndex = value.zIndex;
              changed = true;
            }
            if (
              value.flip !== undefined &&
              JSON.stringify(clip.flip) !== JSON.stringify(value.flip)
            ) {
              clip.flip = value.flip;
              changed = true;
            }
          }
        } else {
          const subProp = pathParts[1];
          if (subProp === "x" && clip.left !== value) {
            clip.left = value;
            changed = true;
          } else if (subProp === "y" && clip.top !== value) {
            clip.top = value;
            changed = true;
          } else if (subProp === "width" && clip.width !== value) {
            clip.width = value;
            changed = true;
          } else if (subProp === "height" && clip.height !== value) {
            clip.height = value;
            changed = true;
          } else if (subProp === "angle" && clip.angle !== value) {
            clip.angle = value;
            changed = true;
          } else if (subProp === "opacity" && clip.opacity !== value) {
            clip.opacity = value;
            changed = true;
          } else if (subProp === "zIndex" && clip.zIndex !== value) {
            clip.zIndex = value;
            changed = true;
          } else if (subProp === "flip" && JSON.stringify(clip.flip) !== JSON.stringify(value)) {
            clip.flip = value;
            changed = true;
          }
        }
      } else {
        const wasLocked = clip.locked;
        const currentValue = (clip as any)[prop];

        if (currentValue !== value) {
          Object.assign(clip, { [prop]: value });

          if (
            prop === "locked" &&
            wasLocked !== value &&
            this.studio.selection.selectedClips.has(clip)
          ) {
            this.studio.selection.recreateTransformer();
          }
          changed = true;
        }
      }

      if (changed) {
        await this.studio.timeline.recalculateMaxDuration();
        this.studio.updateFrame(this.studio.currentTime);
      }
    }
  }

  private async syncInitialState() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.studio.clear();
      const state = this.core.store.getState();
      this.studio.setSize(state.settings.width, state.settings.height);
      for (const id in state.clips) {
        await this.handleAddClip(state.clips[id]);
      }

      this.studio.setTracks(state.tracks as any);
      this.syncSelectionToStudio(state.selectedIds);

      this.studio.updateFrame(state.currentTime);
    } finally {
      this.isSyncing = false;
    }
  }

  private findTrackIdForClip(clipId: string): string | undefined {
    return this.core.store.getState().tracks.find((t) => t.clipIds.includes(clipId))?.id;
  }

  /**
   * Pre-load a font referenced by a clip's style.fontUrl (or top-level fontUrl).
   * Must be called before jsonToClip() so document.fonts is populated when
   * the Text constructor calls refreshText().
   */
  private async ensureFontForClip(coreClip: AnyClip): Promise<void> {
    const style = (coreClip as any).style;
    const fontUrl = style?.fontUrl || (coreClip as any).fontUrl;
    const fontFamily = style?.fontFamily || (coreClip as any).fontFamily;
    if (!fontUrl || !fontFamily) return;
    try {
      await fontManager.addFont({ name: fontFamily, url: fontUrl });
    } catch (err) {
      console.warn(`[StudioBridge] Failed to pre-load font "${fontFamily}":`, err);
    }
  }

  private syncClipProperties(clip: IClip, coreClip: AnyClip): boolean {
    let changed = false;

    // Sync transform properties (Phase 2 / Modernized)
    const trans = coreClip.transform;
    if (trans) {
      if (trans.x !== undefined && Math.abs((clip.left ?? 0) - trans.x) >= 0.01) {
        clip.left = trans.x;
        changed = true;
      }
      if (trans.y !== undefined && Math.abs((clip.top ?? 0) - trans.y) >= 0.01) {
        clip.top = trans.y;
        changed = true;
      }
      if (trans.width !== undefined && Math.abs((clip.width ?? 0) - trans.width) >= 0.01) {
        clip.width = trans.width;
        changed = true;
      }
      if (trans.height !== undefined && Math.abs((clip.height ?? 0) - trans.height) >= 0.01) {
        clip.height = trans.height;
        changed = true;
      }
      if (trans.angle !== undefined && Math.abs((clip.angle ?? 0) - trans.angle) >= 0.01) {
        clip.angle = trans.angle;
        changed = true;
      }
      if (trans.opacity !== undefined && Math.abs((clip.opacity ?? 1) - trans.opacity) >= 0.01) {
        clip.opacity = trans.opacity;
        changed = true;
      }
      if (trans.zIndex !== undefined && clip.zIndex !== trans.zIndex) {
        clip.zIndex = trans.zIndex;
        changed = true;
      }
      if (trans.flip !== undefined && JSON.stringify(clip.flip) !== JSON.stringify(trans.flip)) {
        clip.flip = trans.flip;
        changed = true;
      }
    }

    // Legacy sync logic for other/fallback properties
    const props: (
      | keyof AnyClip
      | "text"
      | "words"
      | "caption"
      | "textBoxStyle"
      | "wordsPerLine"
      | "videoWidth"
      | "videoHeight"
      | "fontUrl"
      | "mediaId"
      | "bottomOffset"
      | "transitionKey"
      | "effectKey"
      | "values"
    )[] = [
      "volume",
      "text",
      "words",
      "style",
      "chromaKey",
      "colorAdjustment",
      "animations",
      "locked",
      "caption",
      "textBoxStyle",
      "wordsPerLine",
      "videoWidth",
      "videoHeight",
      "fontUrl",
      "mediaId",
      "bottomOffset",
      "transitionKey",
      "effectKey",
      "values",
    ];
    props.forEach((prop) => {
      const newValue = (coreClip as any)[prop];
      if (newValue === undefined) return;

      const currentValue = (clip as any)[prop];

      // Equality check to avoid triggering setters
      if (currentValue === newValue) return;

      // Handle numeric precision for position/size
      if (typeof currentValue === "number" && typeof newValue === "number") {
        if (Math.abs(currentValue - newValue) < 0.01) return;
      }

      // Handle style and values (JSON check)
      if (prop === "style" || prop === "values") {
        if (JSON.stringify(currentValue) === JSON.stringify(newValue)) return;
      }

      Object.assign(clip, { [prop]: newValue });
      changed = true;
    });

    // Timing synchronization (Phase 1 Refactoring)
    const t = coreClip.timing;
    if (t) {
      if (t.display) {
        if (
          !clip.display ||
          clip.display.from !== t.display.from ||
          clip.display.to !== t.display.to
        ) {
          clip.display = { ...t.display };
          changed = true;
        }
      }
      if (t.trim) {
        if (!clip.trim || clip.trim.from !== t.trim.from || clip.trim.to !== t.trim.to) {
          clip.trim = { ...t.trim };
          changed = true;
        }
      }
      if (t.duration !== undefined) {
        if (clip.duration !== t.duration) {
          clip.duration = t.duration;
          changed = true;
        }
      }
      if (t.playbackRate !== undefined) {
        if (clip.playbackRate !== t.playbackRate) {
          clip.playbackRate = t.playbackRate;
          changed = true;
        }
      }
    } else {
      // Fallback legacy support
      const d = coreClip.display;
      if (d && (!clip.display || clip.display.from !== d.from || clip.display.to !== d.to)) {
        clip.display = { ...d };
        changed = true;
      }
      const trim = (coreClip as any).trim;
      if (trim && (!clip.trim || clip.trim.from !== trim.from || clip.trim.to !== trim.to)) {
        clip.trim = { ...trim };
        changed = true;
      }
      const duration = (coreClip as any).duration;
      if (duration !== undefined && clip.duration !== duration) {
        clip.duration = duration;
        changed = true;
      }
      const playbackRate = (coreClip as any).playbackRate;
      if (playbackRate !== undefined && clip.playbackRate !== playbackRate) {
        clip.playbackRate = playbackRate;
        changed = true;
      }
    }

    return changed;
  }

  public dispose() {
    this.core.removeAllListeners();
  }
}
