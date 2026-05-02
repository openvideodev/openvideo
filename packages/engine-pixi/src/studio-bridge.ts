import { Core, AnyClip, Patch } from '@openvideo/core';
import { Studio } from './studio';
import { jsonToClip } from './json-serialization';

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

  private init() {
    console.log('StudioBridge.init');
    // 1. Sync Playback
    this.core.on('timeupdate', async (time: number) => {
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

    this.core.on('play', () => {
      console.log('core:play -> studio.play()');
      this.studio.play();
    });

    this.core.on('pause', () => {
      console.log('core:pause -> studio.pause()');
      this.studio.pause();
    });

    // 2. Sync Back from Studio to Core (Source of Truth)
    this.studio.on('currentTime', ({ currentTime }) => {
      if (this.studio.isPlaying && !this.isSyncing) {
        this.isSyncing = true;
        try {
          this.core.seek(currentTime);
        } finally {
          this.isSyncing = false;
        }
      }
    });

    // 3. Sync via Patches
    this.core.on('change', (patches: Patch[]) => this.handlePatches(patches));

    // 4. Initial Sync
    this.syncInitialState();
  }

  private handlePatches(patches: Patch[]) {
    console.log('handlePatches', patches);
    patches.forEach((patch) => {
      const parts = patch.path.split('/').filter(Boolean);

      // Handle Clips
      if (parts[0] === 'clips') {
        const clipId = parts[1];
        if (patch.op === 'add' && !parts[2]) {
          this.handleAddClip(patch.value);
        } else if (patch.op === 'remove' && !parts[2]) {
          this.handleRemoveClip(clipId);
        } else if (patch.op === 'update') {
          this.handleUpdateClip(clipId, parts.slice(2), patch.value);
        }
      }

      // Handle Tracks
      if (parts[0] === 'tracks') {
        this.studio.setTracks(this.core.store.getState().tracks as any);
      }

      // Handle Settings
      if (parts[0] === 'settings') {
        const settings = this.core.store.getState().settings;
        this.studio.setSize(settings.width, settings.height);
      }
    });
  }

  private async handleAddClip(coreClip: AnyClip) {
    if (coreClip.type === 'Transition') {
      await this.studio.addTransition(
        coreClip.transitionEffect?.key || 'none',
        coreClip.duration,
        coreClip.fromClipId,
        coreClip.toClipId
      );
    } else {
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

  private handleUpdateClip(clipId: string, pathParts: string[], value: any) {
    console.log('handleUpdateClip', clipId, pathParts, value);
    const clip = this.studio.timeline.getClipById(clipId);
    if (!clip) return;

    // Simple property update
    if (pathParts.length === 0) {
      // Full clip update
      this.syncClipProperties(clip, value);
    } else {
      // Granular update (e.g. /clips/c1/left)
      const prop = pathParts[0];
      if (prop === 'display') {
        clip.display = { ...value };
      } else {
        (clip as any)[prop] = value;
      }
      this.studio.updateFrame(this.studio.currentTime);
    }
  }

  private async syncInitialState() {
    const state = this.core.store.getState();
    this.studio.setSize(state.settings.width, state.settings.height);
    this.studio.setTracks(state.tracks as any);

    for (const id in state.clips) {
      await this.handleAddClip(state.clips[id]);
    }

    this.studio.updateFrame(state.currentTime);
  }

  private findTrackIdForClip(clipId: string): string | undefined {
    return this.core.store
      .getState()
      .tracks.find((t) => t.clipIds.includes(clipId))?.id;
  }

  private syncClipProperties(clip: any, coreClip: AnyClip) {
    // Legacy sync logic for full updates
    const props: (keyof AnyClip)[] = [
      'left',
      'top',
      'width',
      'height',
      'angle',
      'opacity',
      'zIndex',
      'flip',
      'playbackRate',
      'trim',
      'volume',
      'style',
      'chromaKey',
      'colorAdjustment',
      'animations',
    ];
    props.forEach((prop) => {
      if (coreClip[prop] !== undefined) {
        clip[prop] = coreClip[prop];
      }
    });
    clip.display = { ...coreClip.display };
    this.studio.updateFrame(this.studio.currentTime);
  }

  public dispose() {
    this.core.removeAllListeners();
  }
}
