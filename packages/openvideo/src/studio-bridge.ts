import { CoreEngine, AnyClip } from "@openvideo/core";
import { Studio } from "./studio";
import { jsonToClip } from "./json-serialization";

/**
 * StudioBridge - The "Reconciler" between CoreEngine and Studio.
 * Following SOLID principles, this class decouples the PIXI Renderer (Studio)
 * from the Core Engine.
 */
export class StudioBridge {
  private engine: CoreEngine;
  private studio: Studio;

  constructor(engine: CoreEngine, studio: Studio) {
    this.engine = engine;
    this.studio = studio;

    this.init();
  }

  private handleTimeUpdate = (time: number) => {
    this.studio.updateFrame(time);
  };

  private handleClipAdded = async (coreClip: AnyClip) => {
    if (coreClip.type === "Transition") {
      await this.studio.addTransition(
        coreClip.transitionEffect?.key || "none",
        coreClip.duration,
        coreClip.fromClipId,
        coreClip.toClipId
      );
    } else {
      const clip = await jsonToClip(coreClip);
      const trackId = this.findTrackIdForClip(coreClip.id);
      await this.studio.addClip(clip, { trackId });
    }
  };

  private handleClipRemoved = async (clipId: string) => {
    const clip = this.studio.timeline.getClipById(clipId);
    if (clip) {
      await this.studio.removeClip(clip);
    }
  };

  private handleClipUpdated = async (coreClip: AnyClip) => {
    const clip = this.studio.timeline.getClipById(coreClip.id);
    if (clip) {
      this.syncClipProperties(clip, coreClip);
    }
  };

  private init() {
    // 1. Sync Playback
    this.engine.on("timeupdate", this.handleTimeUpdate);

    // 2. Sync Clips
    this.engine.on("clip:added", this.handleClipAdded);

    // 3. Sync Removals
    this.engine.on("clip:removed", this.handleClipRemoved);

    // 4. Sync Updates
    this.engine.on("clip:updated", this.handleClipUpdated);

    // Initial Sync
    this.syncInitialState();
  }

  private async syncInitialState() {
    const state = this.engine.store.getState();
    
    // Set initial size
    this.studio.setSize(state.settings.width, state.settings.height);

    // Add all clips
    for (const id in state.clips) {
      const coreClip = state.clips[id];
      if (coreClip.type === "Transition") {
        await this.studio.addTransition(
          coreClip.transitionEffect?.key || "none",
          coreClip.duration,
          coreClip.fromClipId,
          coreClip.toClipId
        );
      } else {
        const clip = await jsonToClip(coreClip);
        const trackId = this.findTrackIdForClip(id);
        await this.studio.addClip(clip, { trackId });
      }
    }

    // Set initial time
    this.studio.updateFrame(state.currentTime);
  }

  private findTrackIdForClip(clipId: string): string | undefined {
    const state = this.engine.store.getState();
    return state.tracks.find(t => t.clipIds.includes(clipId))?.id;
  }

  private syncClipProperties(clip: any, coreClip: AnyClip) {
    let changed = false;
    
    const props: (keyof AnyClip)[] = ["left", "top", "width", "height", "angle", "opacity", "zIndex"];
    props.forEach(prop => {
      if (clip[prop] !== coreClip[prop]) {
        clip[prop] = coreClip[prop];
        changed = true;
      }
    });

    if (coreClip.display && (clip.display.from !== coreClip.display.from || clip.display.to !== coreClip.display.to)) {
      clip.display = { ...coreClip.display };
      changed = true;
    }

    if (changed) {
      this.studio.updateFrame(this.studio.currentTime);
    }
  }

  public dispose() {
    this.engine.off("timeupdate", this.handleTimeUpdate);
    this.engine.off("clip:added", this.handleClipAdded);
    this.engine.off("clip:removed", this.handleClipRemoved);
    this.engine.off("clip:updated", this.handleClipUpdated);
  }
}
