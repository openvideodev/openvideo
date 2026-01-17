import { Texture, Sprite } from 'pixi.js';
import type { Studio, StudioTrack } from '../studio';
import type { IClip, IPlaybackCapable } from '../clips/iclip';
import { Text } from '../clips/text-clip';
import { Transition } from '../clips/transition-clip';
import { PixiSpriteRenderer } from '../sprite/pixi-sprite-renderer';
import {
  clipToJSON,
  jsonToClip,
  ProjectJSON,
  ClipJSON,
  GlobalTransitionJSON as TransitionJSON,
} from '../json-serialization';
import { fontManager, IFont } from '../utils/fonts';

export class TimelineModel {
  public tracks: StudioTrack[] = [];
  public clips: IClip[] = [];

  constructor(private studio: Studio) {}

  public getTrackById(trackId: string): StudioTrack | undefined {
    return this.tracks.find((t) => t.id === trackId);
  }

  public getClipById(clipId: string): IClip | undefined {
    return this.clips.find((c) => c.id === clipId);
  }

  public findTrackIdByClipId(clipId: string): string | undefined {
    for (const track of this.tracks) {
      if (track.clipIds.includes(clipId)) return track.id;
    }
    return undefined;
  }

  public getTrackIndex(trackId: string): number {
    return this.tracks.findIndex((t) => t.id === trackId);
  }

  /**
   * Add a new track to the studio
   */
  addTrack(track: { name: string; type: string; id?: string }): StudioTrack {
    const newTrack: StudioTrack = {
      id:
        track.id ||
        `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: track.name,
      type: track.type,
      clipIds: [],
    };
    this.tracks.push(newTrack);
    this.studio.emit('track:added', { track: newTrack });
    return newTrack;
  }

  /**
   * Remove a track and all its clips
   */
  async removeTrack(trackId: string): Promise<void> {
    const index = this.tracks.findIndex((t) => t.id === trackId);
    if (index === -1) return;

    const track = this.tracks[index];
    const clipIds = [...track.clipIds];

    for (const clipId of clipIds) {
      await this.removeClipById(clipId);
    }

    this.tracks.splice(index, 1);
    this.studio.emit('track:removed', { trackId });
  }

  /**
   * Add a Transition clip at the join where the selected clip starts.
   */
  async addTransition(
    transitionKey: string,
    duration: number = 2000000,
    fromClipId?: string | null,
    toClipId?: string | null
  ): Promise<void> {
    if (this.studio.destroyed) return;

    let clipA: IClip | null = null;
    let clipB: IClip | null = null;

    if (fromClipId && toClipId) {
      clipA = this.getClipById(fromClipId) ?? null;
      clipB = this.getClipById(toClipId) ?? null;
    }

    if (!clipA || !clipB) {
      console.warn('[Studio] Invalid fromClipId or toClipId', {
        fromClipId,
        toClipId,
      });
      return;
    }

    const transitionDuration = duration;

    const transitionStart = clipB.display.from - transitionDuration / 2;
    const transitionEnd = transitionStart + transitionDuration;

    const transitionMeta = {
      key: transitionKey,
      name: transitionKey,
      duration: transitionDuration,
      fromClipId: clipA.id,
      toClipId: clipB.id,
      start: Math.max(0, transitionStart),
      end: transitionEnd,
    };

    // Remove any existing transition clip between these two clips
    const targetTrackId = this.findTrackIdByClipId(clipB.id);
    if (targetTrackId) {
      const track = this.tracks.find((t) => t.id === targetTrackId);
      if (track) {
        const existingTransitions = track.clipIds
          .map((id) => this.getClipById(id))
          .filter((c): c is IClip => {
            if (!c || c.type !== 'Transition') return false;
            const tc = c as any;
            return tc.fromClipId === clipA!.id && tc.toClipId === clipB!.id;
          });
        // Remove existing transition clips
        for (const existingTransition of existingTransitions) {
          await this.removeClip(existingTransition);
        }
      }
    }

    // Clear cached transition renderers to ensure new transition type is used
    if (this.studio.transitionRenderers.has(clipA.id)) {
      this.studio.transitionRenderers.get(clipA.id)?.destroy();
      this.studio.transitionRenderers.delete(clipA.id);
    }
    if (this.studio.transitionRenderers.has(clipB.id)) {
      this.studio.transitionRenderers.get(clipB.id)?.destroy();
      this.studio.transitionRenderers.delete(clipB.id);
    }

    // Force set transition property
    (clipA as any).transition = { ...transitionMeta };
    (clipB as any).transition = { ...transitionMeta };

    const tClip = new Transition(transitionKey as any);
    tClip.duration = transitionDuration;
    tClip.fromClipId = Math.max(0, transitionStart) === 0 ? null : clipA.id;
    tClip.toClipId = clipB.id;

    if (tClip.fromClipId === null && clipA) {
      tClip.fromClipId = clipA.id;
    }

    tClip.display.from = Math.max(0, transitionStart);
    tClip.display.to = transitionEnd;

    await this.addClip(tClip, { trackId: targetTrackId });

    this.studio.seek(this.studio.currentTime);
  }

  /**
   * Add a clip (or clips) to the studio
   */
  async addClip(
    clipOrClips: IClip | IClip[],
    options?:
      | {
          trackId?: string;
          audioSource?: string | File | Blob;
        }
      | string
      | File
      | Blob
  ): Promise<void> {
    const clips = Array.isArray(clipOrClips) ? clipOrClips : [clipOrClips];
    if (clips.length === 0) return;

    // 1. Normalize Options
    const { trackId, audioSource } = this.normalizeAddClipOptions(options);

    // 2. Validate Context
    if (this.studio.destroyed) return;
    if (this.studio.pixiApp == null) {
      throw new Error('Failed to initialize Pixi.js Application');
    }

    // 3. Prepare Internal Logic (IDs, Tracks, Listeners)
    const addedClips: IClip[] = [];
    for (const clip of clips) {
      await this.prepareClipForTimeline(clip, trackId);
      addedClips.push(clip);
    }

    // 4. Update Time Limits
    await this.recalculateMaxDuration();

    // 5. Setup Visuals & Playback
    for (const clip of addedClips) {
      await this.setupClipVisuals(clip, audioSource);
    }

    // 6. Update Render
    await this.studio.updateFrame(this.studio.currentTime);

    // 7. Emit Events
    this.emitAddClipEvents(addedClips, trackId);
  }

  private normalizeAddClipOptions(
    options?:
      | { trackId?: string; audioSource?: string | File | Blob }
      | string
      | File
      | Blob
  ) {
    let audioSource: string | File | Blob | undefined;
    let trackId: string | undefined;

    if (
      options &&
      (typeof options === 'string' ||
        options instanceof File ||
        options instanceof Blob)
    ) {
      audioSource = options;
    } else if (
      typeof options === 'object' &&
      options !== null &&
      !('size' in options)
    ) {
      const opts = options as {
        trackId?: string;
        audioSource?: string | File | Blob;
      };
      audioSource = opts.audioSource;
      trackId = opts.trackId;
    }
    return { trackId, audioSource };
  }

  private async prepareClipForTimeline(clip: IClip, trackId?: string) {
    // A. Listen for property changes
    const onPropsChange = async () => {
      await this.studio.updateFrame(this.studio.currentTime);
      const interactionManager = this.studio.selection;
      if (
        interactionManager.activeTransformer != null &&
        interactionManager.selectedClips.has(clip) &&
        typeof (interactionManager.activeTransformer as any).updateBounds ===
          'function'
      ) {
        (interactionManager.activeTransformer as any).updateBounds();
      }
    };
    clip.on('propsChange', onPropsChange);
    this.studio.clipListeners.set(clip, onPropsChange);

    // B. Link Renderer
    if (this.studio.pixiApp != null && typeof clip.setRenderer === 'function') {
      clip.setRenderer(this.studio.pixiApp.renderer);
    }

    // C. Wait for Ready
    await clip.ready;

    // D. Ensure ID
    if (!clip.id) {
      (clip as any).id = `clip_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    // E. Add to internal list
    if (!this.clips.includes(clip)) {
      this.clips.push(clip);
    }

    // F. Add to Track
    this.addClipToTrack(clip, trackId);
  }

  private addClipToTrack(clip: IClip, trackId?: string) {
    if (trackId) {
      // Try to find existing track (could be newly added in same batch)
      const track = this.tracks.find((t) => t.id === trackId);
      if (track) {
        if (!track.clipIds.includes(clip.id)) {
          track.clipIds.push(clip.id);
        }
      } else {
        // Track ID provided but doesn't exist -> Create it
        this.tracks.unshift({
          id: trackId,
          name: `Track ${this.tracks.length + 1}`,
          type: clip.type,
          clipIds: [clip.id],
        });
      }
    } else {
      // Auto-create new track
      const newTrackId = `track_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      this.tracks.unshift({
        id: newTrackId,
        name: `Track ${this.tracks.length + 1}`,
        type: clip.type,
        clipIds: [clip.id],
      });
    }
  }

  private async setupClipVisuals(
    clip: IClip,
    audioSource?: string | File | Blob
  ) {
    const meta = await clip.ready;

    // Playback
    await this.setupPlaybackForClip(clip, audioSource);

    // Renderer (Video/Image)
    if (meta.width > 0 && meta.height > 0) {
      const container = this.studio.clipsNormalContainer!;
      // Simple logic as both branches did the same thing in previous code
      const isVideo = clip.type === 'Video' && this.isPlaybackCapable(clip);
      if (!isVideo || (isVideo && (clip as any).tickInterceptor != null)) {
        const renderer = new PixiSpriteRenderer(
          this.studio.pixiApp!,
          clip,
          container
        );
        this.studio.spriteRenderers.set(clip, renderer);
      }
    }

    // Interactivity
    if (this.studio.opts.interactivity) {
      this.studio.selection.setupSpriteInteractivity(clip);
    }
  }

  private emitAddClipEvents(addedClips: IClip[], trackId?: string) {
    if (addedClips.length === 0) return;

    if (addedClips.length === 1) {
      const clip = addedClips[0];
      const actualTrackId =
        trackId ||
        this.tracks.find((t) => t.clipIds.includes(clip.id))?.id ||
        '';

      this.studio.emit('clip:added', {
        clip,
        trackId: actualTrackId,
      });
    } else {
      this.studio.emit('clips:added', {
        clips: addedClips,
        trackId,
      });
    }
  }

  async removeClip(clip: IClip): Promise<void> {
    const index = this.clips.findIndex((c) => c === clip);
    if (index === -1) return;

    // Separate cleanup for Transition to remove 'transition' property from linked clips
    if (clip instanceof Transition) {
      if (clip.fromClipId) {
        const fromClip = this.getClipById(clip.fromClipId);
        if (fromClip && 'transition' in fromClip) {
          delete (fromClip as any).transition;
        }
      }
      if (clip.toClipId) {
        const toClip = this.getClipById(clip.toClipId);
        if (toClip && 'transition' in toClip) {
          delete (toClip as any).transition;
        }
      }
    }

    // Deselect
    if (this.studio.selection.selectedClips.has(clip)) {
      this.studio.selection.deselectClip();
    }

    // Remove from generic clips list
    this.clips.splice(index, 1);

    // Remove ID from tracks
    for (const track of this.tracks) {
      const idx = track.clipIds.indexOf(clip.id);
      if (idx !== -1) {
        track.clipIds.splice(idx, 1);
      }
    }

    // Remove from interactive tracking
    this.studio.selection.interactiveClips.delete(clip);

    // Clean up listener
    const onPropsChange = this.studio.clipListeners.get(clip);
    if (onPropsChange) {
      clip.off('propsChange', onPropsChange);
      this.studio.clipListeners.delete(clip);
    }

    // Clean up renderer
    const renderer = this.studio.spriteRenderers.get(clip);
    if (renderer != null) {
      renderer.destroy();
      this.studio.spriteRenderers.delete(clip);
    }

    // Clean up playback element
    const playbackInfo = this.studio.transport.playbackElements.get(clip);
    if (playbackInfo != null) {
      if (this.isPlaybackCapable(clip)) {
        clip.cleanupPlayback(playbackInfo.element, playbackInfo.objectUrl);
      }
      this.studio.transport.playbackElements.delete(clip);
    }

    // Clean up video sprite
    const sprite = this.studio.videoSprites.get(clip);
    if (sprite != null && this.studio.pixiApp != null) {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
      this.studio.videoSprites.delete(clip);
    }

    // Recalculate max duration
    await this.recalculateMaxDuration();

    this.studio.emit('clip:removed', { clipId: clip.id });
  }

  async removeClipById(clipId: string): Promise<void> {
    const clip = this.clips.find((c) => c.id === clipId);
    if (clip) {
      await this.removeClip(clip);
    }
  }

  async updateClip(clipId: string, updates: Partial<IClip>): Promise<void> {
    const clip = this.clips.find((c) => c.id === clipId);
    if (!clip) return;

    await this.applyClipUpdate(clip, updates);

    // Recalculate max duration
    await this.recalculateMaxDuration();

    // Trigger update
    await this.studio.updateFrame(this.studio.currentTime);

    // Update transformer if selected
    this.updateTransformer(clip);

    this.studio.emit('clip:updated', { clip });
  }

  async updateClips(
    updates: { id: string; updates: Partial<IClip> }[]
  ): Promise<void> {
    const updatedClips: IClip[] = [];

    for (const { id, updates: clipUpdates } of updates) {
      const clip = this.clips.find((c) => c.id === id);
      if (clip) {
        await this.applyClipUpdate(clip, clipUpdates);
        updatedClips.push(clip);
      }
    }

    if (updatedClips.length === 0) return;

    // Recalculate max duration once
    await this.recalculateMaxDuration();

    // Trigger update once
    await this.studio.updateFrame(this.studio.currentTime);

    // Update transformer for any selected clips
    for (const clip of updatedClips) {
      this.updateTransformer(clip);
      this.studio.emit('clip:updated', { clip });
    }
  }

  /**
   * Replace all clips with the same source with new clips generated by a factory.
   * Useful for replacing placeholders with actual assets.
   */
  async replaceClipsBySource(
    src: string,
    newClipFactory: (oldClip: IClip) => Promise<IClip>
  ): Promise<void> {
    // Collect all clips that match the source first to avoid issues with array modification
    const toReplace = this.clips.filter((c) => c.src === src);
    if (toReplace.length === 0) return;

    this.studio.suspendRendering();

    for (const oldClip of toReplace) {
      // Verify the clip is still in the list (might have been removed in a previous iteration)
      if (!this.clips.includes(oldClip)) continue;

      const trackId = this.findTrackIdByClipId(oldClip.id);
      if (!trackId) continue;

      const track = this.getTrackById(trackId);
      if (!track) continue;

      const newClip = await newClipFactory(oldClip);

      // 1. Setup listeners for the new clip (matches prepareClipForTimeline logic)
      const onPropsChange = async () => {
        await this.studio.updateFrame(this.studio.currentTime);
        this.updateTransformer(newClip);
      };
      newClip.on('propsChange', onPropsChange);
      this.studio.clipListeners.set(newClip, onPropsChange);

      if (
        this.studio.pixiApp != null &&
        typeof (newClip as any).setRenderer === 'function'
      ) {
        (newClip as any).setRenderer(this.studio.pixiApp.renderer);
      }

      // 2. Wait for Ready
      await newClip.ready;

      // 3. Replace in internal clips list at the same index
      const clipIdx = this.clips.indexOf(oldClip);
      if (clipIdx !== -1) {
        this.clips[clipIdx] = newClip;
      }

      // 4. Replace in track
      const trackClipIdx = track.clipIds.indexOf(oldClip.id);
      if (trackClipIdx !== -1) {
        track.clipIds[trackClipIdx] = newClip.id;
      }

      // 5. Setup visuals for the new clip
      await this.setupClipVisuals(newClip);

      // 6. Cleanup old visuals and listeners MANUALLY
      // Search for any renderer associated with this clip and destroy it
      const oldRenderer = this.studio.spriteRenderers.get(oldClip);
      if (oldRenderer) {
        oldRenderer.destroy();
        this.studio.spriteRenderers.delete(oldClip);
      }

      const oldVideoSprite = this.studio.videoSprites.get(oldClip);
      if (oldVideoSprite) {
        if (oldVideoSprite.parent) {
          oldVideoSprite.parent.removeChild(oldVideoSprite);
        }
        oldVideoSprite.destroy();
        this.studio.videoSprites.delete(oldClip);
      }

      const oldListener = this.studio.clipListeners.get(oldClip);
      if (oldListener) {
        oldClip.off('propsChange', oldListener);
        this.studio.clipListeners.delete(oldClip);
      }

      // 7. Sync selection
      if (this.studio.selection.selectedClips.has(oldClip)) {
        this.studio.selection.selectedClips.delete(oldClip);
        this.studio.selection.selectedClips.add(newClip);
      }

      // 8. Emit event to sync with editor store
      this.studio.emit('clip:replaced', { oldClip, newClip, trackId });
    }

    await this.recalculateMaxDuration();
    this.studio.resumeRendering();
    await this.studio.updateFrame(this.studio.currentTime);
  }

  private async applyClipUpdate(clip: IClip, updates: Partial<IClip>) {
    // Special handling for TextClip style updates
    if (clip instanceof Text) {
      await (clip as Text).updateStyle(updates as any);
      // Remove 'style' from updates to prevent "Cannot set property style of #<TextClip> which has only a getter"
      if ('style' in updates) {
        delete (updates as any).style;
      }
    }

    // Merge updates
    Object.assign(clip, updates);

    // Ensure consistency between display and duration
    // If updates contains display, but no duration, update duration
    if (updates.display && !updates.duration) {
      clip.duration = updates.display.to - updates.display.from;
    }
    // If updates contains duration, but no display.to, update display.to
    else if (updates.duration && (!updates.display || !updates.display.to)) {
      if (!clip.display) {
        // Should not happen if clip is valid, but safety check
        clip.display = { from: 0, to: updates.duration };
      }
      clip.display.to = clip.display.from + updates.duration;
    }
    // If both display and duration are updated, trust display.to if explicit, or re-verify?
    if (updates.display && updates.duration) {
      const calculatedDuration = updates.display.to - updates.display.from;
      if (calculatedDuration !== updates.duration) {
        clip.duration = calculatedDuration;
      }
    } else {
      // Just in case valid data was merged but we need to ensure consistency
      if (clip.display) {
        clip.display.to = clip.display.from + clip.duration;
      }
    }
  }

  private updateTransformer(clip: IClip) {
    const interactionManager = this.studio.selection;
    if (
      interactionManager.selectedClips.has(clip) &&
      interactionManager.activeTransformer
    ) {
      interactionManager.activeTransformer.updateBounds();
    }
  }

  /**
   * Export current project state to JSON
   */
  exportToJSON(): ProjectJSON {
    const clips: ClipJSON[] = this.clips.map((clip) => {
      return clipToJSON(clip, false);
    });

    const tracks = this.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      type: track.type,
      clipIds: track.clipIds,
    }));

    const transitions: TransitionJSON[] = [];
    this.clips.forEach((clip) => {
      if (clip.transition) {
        // Find predecessor on the same track
        const track = this.tracks.find((t) => t.clipIds.includes(clip.id));
        if (track) {
          const clipIndex = track.clipIds.indexOf(clip.id);
          if (clipIndex > 0) {
            const prevClipId = track.clipIds[clipIndex - 1];
            transitions.push({
              key: clip.transition.name,
              duration: clip.transition.duration,
              clips: [prevClipId, clip.id],
            });
          }
        }
      }
    });

    return {
      tracks,
      clips,
      settings: {
        width: this.studio.opts.width,
        height: this.studio.opts.height,
        fps: this.studio.opts.fps,
        bgColor: this.studio.opts.bgColor,
      },
    };
  }

  /**
   * Load clips from JSON
   */
  async loadFromJSON(json: ProjectJSON): Promise<void> {
    await this.clear();

    // Update settings if provided
    if (json.settings) {
      const dimensionsChanged =
        (json.settings.width &&
          json.settings.width !== this.studio.opts.width) ||
        (json.settings.height &&
          json.settings.height !== this.studio.opts.height);

      if (json.settings.width) this.studio.opts.width = json.settings.width;
      if (json.settings.height) this.studio.opts.height = json.settings.height;
      if (json.settings.fps) this.studio.opts.fps = json.settings.fps;
      if (json.settings.bgColor)
        this.studio.opts.bgColor = json.settings.bgColor;

      // Resize PixiJS renderer and canvas if dimensions changed
      if (dimensionsChanged && this.studio.pixiApp != null) {
        const newWidth = this.studio.opts.width;
        const newHeight = this.studio.opts.height;

        // Resize the renderer
        this.studio.pixiApp.renderer.resize(newWidth, newHeight);

        // Update canvas dimensions
        if (this.studio.opts.canvas) {
          this.studio.opts.canvas.width = newWidth;
          this.studio.opts.canvas.height = newHeight;
        }
      }
    }

    // Load all clips first (Normalized)
    // Load all clips in parallel (Batched)
    const clipPromises: Promise<{
      clip: IClip | null;
      intendedTrackId?: string;
    }>[] = [];
    if (json.clips) {
      // 1. Load Fonts First
      await this.ensureFontsForClips(json.clips);

      // Build map of ClipID -> TrackID from json.tracks
      const clipToTrackId = new Map<string, string>();
      if (json.tracks) {
        for (const t of json.tracks) {
          if (t.clipIds) {
            for (const cid of t.clipIds) {
              clipToTrackId.set(cid, t.id);
            }
          }
        }
      }

      // Initialize tracks from JSON first
      if (json.tracks) {
        for (const t of json.tracks) {
          this.tracks.push({
            id: t.id,
            name: t.name,
            type: t.type,
            clipIds: [], // Will fill as we add clips
          });
        }
      }

      // Create promises for clip loading
      for (const clipJSON of json.clips) {
        clipPromises.push(
          (async () => {
            try {
              let intendedTrackId = clipJSON.id
                ? clipToTrackId.get(clipJSON.id)
                : undefined;

              // Inference for Transitions without top-level ID
              if (clipJSON.type === 'Transition') {
                const transJSON = clipJSON as any;
                const targetId = transJSON.toClipId || transJSON.fromClipId;
                if (targetId) {
                  intendedTrackId = clipToTrackId.get(targetId);
                }
              }

              // Pre-validation for empty sources
              if (
                clipJSON.type !== 'Text' &&
                clipJSON.type !== 'Caption' &&
                clipJSON.type !== 'Effect' &&
                clipJSON.type !== 'Transition' &&
                (!clipJSON.src || clipJSON.src.trim() === '')
              ) {
                console.warn(
                  `Skipping clip ${clipJSON.type} with empty source`,
                  clipJSON
                );
                return { clip: null };
              }

              const clip = await jsonToClip(clipJSON);

              // If scaling needed (Video/Image)
              if (
                (clip.type === 'Video' || clip.type === 'Image') &&
                (!clipJSON.width || !clipJSON.height)
              ) {
                console.log('Scaling clip', clipJSON);
                // We defer scaling to after we have the clip ready,
                // but we can assume jsonToClip awaits 'ready' or we await it here
                // jsonToClip returns fully constructed clip, but 'ready' promise might not be awaited inside it fully?
                // Actually jsonToClip awaits fetch and createImageBitmap, so basic dimensions should be known.
                if (this.studio.opts.width && this.studio.opts.height) {
                  if (typeof (clip as any).scaleToFit === 'function') {
                    await (clip as any).scaleToFit(
                      this.studio.opts.width,
                      this.studio.opts.height
                    );
                  }
                  if (typeof (clip as any).centerInScene === 'function') {
                    (clip as any).centerInScene(
                      this.studio.opts.width,
                      this.studio.opts.height
                    );
                  }
                }
              }

              // Handle audioSource if necessary?
              // setupPlaybackForClip uses audioSource if provided.
              // We'll pass it down or attach to clip temporarily?
              // Or better, we handle playback setup later using the source URL we already have in clip.src

              return { clip, intendedTrackId };
            } catch (err) {
              console.error(
                `Failed to load clip ${clipJSON.id || 'unknown'}:`,
                err
              );
              return { clip: null };
            }
          })()
        );
      }

      const results = await Promise.all(clipPromises);

      // Add clips to internal list and tracks
      for (const { clip, intendedTrackId } of results) {
        if (!clip) continue;

        // Ensure ID
        if (!clip.id) {
          (clip as any).id = `clip_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        }
        this.clips.push(clip);
        this.addClipToTrack(clip, intendedTrackId);
      }
    }

    // Now process loaded clips (listeners, renderer, ready)
    // IMPORTANT: this.studio.pixiApp must be ready
    if (this.studio.pixiApp) {
      await Promise.all(
        this.clips.map(async (clip) => {
          // A. Listen for property changes
          const onPropsChange = async () => {
            await this.studio.updateFrame(this.studio.currentTime);
            const interactionManager = this.studio.selection;
            if (
              interactionManager.activeTransformer != null &&
              interactionManager.selectedClips.has(clip) &&
              typeof (interactionManager.activeTransformer as any)
                .updateBounds === 'function'
            ) {
              (interactionManager.activeTransformer as any).updateBounds();
            }
          };
          clip.on('propsChange', onPropsChange);
          this.studio.clipListeners.set(clip, onPropsChange);

          // B. Link Renderer
          if (typeof clip.setRenderer === 'function') {
            clip.setRenderer(this.studio.pixiApp!.renderer);
          }

          // C. Wait for Ready (Safety)
          await clip.ready;

          // D. Setup Visuals & Playback
          // We can call setupClipVisuals, but we need to ensure it doesn't try to add duplicates to containers if run multiple times?
          // setupClipVisuals just sets up renderer and playback.
          // It creates new PixiSpriteRenderer.
          await this.setupClipVisuals(clip);
        })
      );
    }

    // Restore global effects from loaded clips
    for (const clip of this.clips) {
      const effects = (clip as any).effects;
      if (Array.isArray(effects)) {
        for (const effect of effects) {
          if (!this.studio.globalEffects.has(effect.id)) {
            this.studio.globalEffects.set(effect.id, {
              id: effect.id,
              key: effect.key,
              startTime: effect.startTime,
              duration: effect.duration,
            });
          }
        }
      }
    }

    // Restore transition links on target clips
    // Transition clips store fromClipId/toClipId, but the preview engine
    // expects clip.transition on the actual video/image clips
    for (const clip of this.clips) {
      if (clip instanceof Transition) {
        const transitionMeta = {
          name: clip.transitionEffect.key,
          key: clip.transitionEffect.key,
          duration: clip.duration,
          fromClipId: clip.fromClipId,
          toClipId: clip.toClipId,
          start: clip.display.from,
          end: clip.display.to,
        };

        if (clip.fromClipId) {
          const fromClip = this.getClipById(clip.fromClipId);
          if (fromClip) {
            (fromClip as any).transition = { ...transitionMeta };
          }
        }

        if (clip.toClipId) {
          const toClip = this.getClipById(clip.toClipId);
          if (toClip) {
            (toClip as any).transition = { ...transitionMeta };
          }
        }
      }
    }

    // Recalculate duration once
    await this.recalculateMaxDuration();

    // Update Frame once
    try {
      await this.studio.updateFrame(this.studio.currentTime);
    } catch (err) {
      console.error('[Studio] Failed to update initial frame:', err);
    }

    // Emit single restore event
    this.studio.emit('studio:restored', {
      clips: this.clips,
      tracks: this.tracks,
      settings: this.studio.opts,
    });
  }

  /**
   * Delete all currently selected clips
   */
  async deleteSelected(): Promise<void> {
    const selectedClips = this.studio.selection.selectedClips;
    const clipsToDelete = Array.from(selectedClips);
    if (clipsToDelete.length === 0) return;

    for (const clip of clipsToDelete) {
      await this.removeClip(clip);
    }
  }

  /**
   * Duplicate all currently selected clips
   */
  async duplicateSelected(): Promise<void> {
    const selectedClips = this.studio.selection.selectedClips;
    const clipsToDuplicate = Array.from(selectedClips);
    if (clipsToDuplicate.length === 0) return;

    const newClipIds: string[] = [];

    for (const clip of clipsToDuplicate) {
      const trackId = this.findTrackIdByClipId(clip.id);
      if (!trackId) continue;

      const track = this.tracks.find((t) => t.id === trackId);
      if (!track) continue;

      // Clone Clip
      const json = clipToJSON(clip, false);
      const newClip = await jsonToClip(json);
      newClip.id = `clip_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create new track for duplicate
      const newTrackId = `track_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newTrackName = `${track.name} (Copy)`;

      this.addTrack({
        id: newTrackId,
        name: newTrackName,
        type: track.type,
      });

      await this.addClip(newClip, { trackId: newTrackId });
      newClipIds.push(newClip.id);
    }

    if (newClipIds.length > 0) {
      this.studio.selection.selectClipsByIds(newClipIds);
    }
  }

  /**
   * Split the selected clip at the given time or current time
   */
  async splitSelected(splitTime?: number): Promise<void> {
    const selected = Array.from(this.studio.selection.selectedClips);
    if (selected.length !== 1) {
      console.warn('[Studio] Split requires exactly one selected clip');
      return;
    }

    const clip = selected[0];
    const time = splitTime ?? this.studio.currentTime;

    if (
      time <= clip.display.from ||
      (clip.display.to > 0 && time >= clip.display.to)
    ) {
      console.warn('[Studio] Split time is outside clip bounds');
      return;
    }

    const originalJson = clipToJSON(clip, false);
    const splitOffset = time - clip.display.from;
    const playbackRate = clip.playbackRate || 1;
    const splitOffsetInSource = splitOffset * playbackRate;

    // 1. Update original clip (Left Part)
    const updates: any = {
      duration: splitOffset,
      display: {
        from: clip.display.from,
        to: time,
      },
    };

    if (clip.trim) {
      updates.trim = {
        from: clip.trim.from,
        to: clip.trim.from + splitOffsetInSource,
      };
    }

    await this.updateClip(clip.id, updates);

    // 2. Create new clip (Right Part)
    const newJson = { ...originalJson };
    newJson.display = {
      from: time,
      to: originalJson.display.to,
    };
    newJson.duration = originalJson.duration - splitOffset;

    if (newJson.trim) {
      newJson.trim = {
        from: newJson.trim.from + splitOffsetInSource,
        to: newJson.trim.to,
      };
    }

    const newClip = await jsonToClip(newJson);
    newClip.id = `clip_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const trackId = this.findTrackIdByClipId(clip.id);
    if (trackId) {
      await this.addClip(newClip, { trackId });
      this.studio.selection.selectClipsByIds([newClip.id]);
    }
  }

  /**
   * Trim the selected clip from a specified time
   * @param trimFromSeconds - Number of seconds to trim from the start of the clip
   */
  async trimSelected(trimFromSeconds: number): Promise<void> {
    const selected = Array.from(this.studio.selection.selectedClips);
    if (selected.length !== 1) {
      console.warn('[Studio] Trim requires exactly one selected clip');
      return;
    }

    const clip = selected[0];

    // Convert seconds to microseconds
    const trimFromUs = trimFromSeconds * 1_000_000;

    // Get playback rate for proper trim calculation
    const playbackRate = clip.playbackRate || 1;
    const trimOffsetInSource = trimFromUs * playbackRate;

    // Validate trim amount doesn't exceed clip duration
    if (trimFromUs >= clip.duration) {
      console.warn('[Studio] Trim amount exceeds clip duration');
      return;
    }

    // Calculate new values
    const newDuration = clip.duration - trimFromUs;
    const newDisplayFrom = clip.display.from + trimFromUs;
    const newDisplayTo = clip.display.to;

    const updates: any = {
      duration: newDuration,
      display: {
        from: newDisplayFrom,
        to: newDisplayTo,
      },
    };

    // Update trim if it exists, otherwise create it
    if (clip.trim) {
      updates.trim = {
        from: clip.trim.from + trimOffsetInSource,
        to: clip.trim.to,
      };
    } else {
      // If no trim exists, create one based on source duration
      const sourceDuration = (clip as any).sourceDuration || clip.duration;
      updates.trim = {
        from: trimOffsetInSource,
        to: sourceDuration,
      };
    }

    await this.updateClip(clip.id, updates);
  }

  async updateSelected(updates: Partial<IClip>): Promise<void> {
    const selected = Array.from(this.studio.selection.selectedClips);
    if (selected.length === 0) return;

    for (const clip of selected) {
      await this.updateClip(clip.id, updates);
    }
  }

  async setTracks(tracks: StudioTrack[]): Promise<void> {
    this.tracks = tracks;
    await this.recalculateMaxDuration();
    await this.studio.updateFrame(this.studio.currentTime);
  }

  private async ensureFontsForClips(clips: any[]): Promise<void> {
    const fontsToLoad = new Map<string, IFont>();
    for (const clip of clips) {
      // Check TextClip style
      if (clip.type === 'Text') {
        const fontUrl = clip.style?.fontUrl || (clip as any).fontUrl;
        if (fontUrl) {
          fontsToLoad.set(fontUrl, {
            name:
              clip.style?.fontFamily ||
              (clip as any).fontFamily ||
              'CustomFont',
            url: fontUrl,
          });
        }
      }

      // Check Caption style
      if (clip.type === 'Caption') {
        const fontUrl = clip.style?.fontUrl || (clip as any).fontUrl;
        if (fontUrl) {
          fontsToLoad.set(fontUrl, {
            name:
              clip.style?.fontFamily ||
              (clip as any).fontFamily ||
              'CustomFont',
            url: fontUrl,
          });
        }
      }
    }

    if (fontsToLoad.size > 0) {
      try {
        await fontManager.loadFonts(Array.from(fontsToLoad.values()));
      } catch (err) {
        console.warn('Failed to load some fonts:', err);
      }
    }
  }

  async recalculateMaxDuration(): Promise<void> {
    let max = 0;
    for (const clip of this.clips) {
      if (
        clip.display.to === 0 &&
        clip.duration !== Infinity &&
        !isNaN(clip.duration) &&
        clip.duration > 0
      ) {
        // Fallback if to is 0?
        // Usually we care about display.to if set, or from + duration
      }

      const duration = clip.duration > 0 ? clip.duration : 0;
      if (duration === Infinity) continue; // Don't let infinite clips set max duration blindly?

      const end =
        clip.display.to > 0 ? clip.display.to : clip.display.from + duration;
      if (end > max) max = end;
    }
    this.studio.maxDuration = max;
  }

  private async setupPlaybackForClip(
    clip: IClip,
    audioSource?: string | File | Blob
  ): Promise<void> {
    if (this.studio.pixiApp == null) return;
    if (!this.isPlaybackCapable(clip)) {
      // Fallback logic
      if (
        this.studio.pixiApp != null &&
        (await clip.ready).width > 0 &&
        (await clip.ready).height > 0
      ) {
        const renderer = new PixiSpriteRenderer(
          this.studio.pixiApp,
          clip,
          this.studio.clipsNormalContainer!
        );
        this.studio.spriteRenderers.set(clip, renderer);
      }
      return;
    }

    try {
      const playbackClip = clip as IPlaybackCapable;
      if (
        clip.type === 'Audio' &&
        audioSource &&
        typeof audioSource !== 'string'
      ) {
        const objectUrl = URL.createObjectURL(audioSource);
        (clip as any).src = objectUrl;
      }

      const { element, objectUrl } = await playbackClip.createPlaybackElement();

      if (clip.type === 'Video') {
        const texture = Texture.from(element as HTMLVideoElement);
        const sprite = new Sprite(texture);
        sprite.visible = false;
        if (this.studio.clipsNormalContainer) {
          this.studio.clipsNormalContainer.addChild(sprite);
        }
        this.studio.videoSprites.set(clip, sprite);
      }

      this.studio.transport.playbackElements.set(clip, { element, objectUrl });
    } catch (err) {
      console.warn(
        `Failed to setup playback for ${clip.constructor.name}`,
        err
      );
      // Fallback logic duplicated
      if (
        this.studio.pixiApp != null &&
        (await clip.ready).width > 0 &&
        (await clip.ready).height > 0
      ) {
        const renderer = new PixiSpriteRenderer(
          this.studio.pixiApp,
          clip,
          this.studio.artboard!
        ); // Fallback to artboard if clipsNormalContainer null?
        this.studio.spriteRenderers.set(clip, renderer);
      }
    }
  }

  private isPlaybackCapable(clip: IClip): clip is IClip & IPlaybackCapable {
    return (
      'createPlaybackElement' in clip &&
      'play' in clip &&
      'pause' in clip &&
      'seek' in clip &&
      'syncPlayback' in clip &&
      'cleanupPlayback' in clip
    );
  }

  async clear(): Promise<void> {
    this.studio.selection.deselectClip();
    this.studio.selection.interactiveClips.clear();

    // Clear listeners
    for (const [clip, listener] of this.studio.clipListeners) {
      clip.off('propsChange', listener);
    }
    this.studio.clipListeners.clear();

    // Effect, Global, Transition clear logic...
    this.studio.globalEffects.clear();
    this.studio.effectFilters.clear();

    // Transition clear
    this.studio.transitionRenderers.forEach((r) => r.destroy());
    this.studio.transitionRenderers.clear();
    this.studio.transitionSprites.forEach((s) => {
      if (s.parent) s.parent.removeChild(s);
      s.destroy();
    });
    this.studio.transitionSprites.clear();

    // Renderers clear
    this.studio.spriteRenderers.forEach((r) => r.destroy());
    this.studio.spriteRenderers.clear();

    // Playback clear
    for (const [clip, playbackInfo] of this.studio.transport.playbackElements) {
      if (this.isPlaybackCapable(clip)) {
        clip.cleanupPlayback(playbackInfo.element, playbackInfo.objectUrl);
      }
    }
    this.studio.transport.playbackElements.clear();

    // VideoSprites clear
    for (const sprite of this.studio.videoSprites.values()) {
      sprite.destroy();
    }
    this.studio.videoSprites.clear();

    // Tracks & Clips
    this.tracks = [];
    this.clips = [];
    this.studio.maxDuration = 0;
    this.studio.currentTime = 0;

    this.studio.emit('reset');
  }

  /**
   * Remove a time range from the entire timeline and shift subsequent content left.
   * This is a ripple delete operation.
   * @param fromUs Start time in microseconds
   * @param toUs End time in microseconds
   */
  async rippleDelete(fromUs: number, toUs: number): Promise<void> {
    if (fromUs >= toUs) return;
    const durationToRemove = toUs - fromUs;

    // Use a copy of the clips array because it will be modified during the loop
    const clipsToProcess = [...this.clips];

    for (const clip of clipsToProcess) {
      const clipStart = clip.display.from;
      const clipEnd = clip.display.to;

      // Case 1: Clip ends before or at the start of the deletion range - No change
      if (clipEnd <= fromUs) {
        continue;
      }

      // Case 2: Clip starts at or after the end of the deletion range - Shift left
      if (clipStart >= toUs) {
        await this.updateClip(clip.id, {
          display: {
            from: clip.display.from - durationToRemove,
            to: clip.display.to - durationToRemove,
          },
        });
        continue;
      }

      // Case 3: Clip is completely within the deletion range - Remove
      if (clipStart >= fromUs && clipEnd <= toUs) {
        await this.removeClip(clip);
        continue;
      }

      // Case 4: Clip spans across the entire deletion range - Split into two
      if (clipStart < fromUs && clipEnd > toUs) {
        // Create second part first
        const secondPart = await clip.clone();
        secondPart.id = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const secondPartDisplayFrom = fromUs;
        const secondPartDisplayTo = fromUs + (clipEnd - toUs);
        const secondPartTrimFrom =
          clip.trim.from + (toUs - clipStart) * clip.playbackRate;
        const secondPartTrimTo = clip.trim.to;

        // Add to the same track
        const track = this.tracks.find((t) => t.clipIds.includes(clip.id));
        if (track) {
          await this.addClip(secondPart, { trackId: track.id });
          await this.updateClip(secondPart.id, {
            display: {
              from: secondPartDisplayFrom,
              to: secondPartDisplayTo,
            },
            trim: {
              from: secondPartTrimFrom,
              to: secondPartTrimTo,
            },
          });
        }

        // Adjust first part
        await this.updateClip(clip.id, {
          display: {
            from: clip.display.from,
            to: fromUs,
          },
          trim: {
            from: clip.trim.from,
            to: clip.trim.from + (fromUs - clipStart) * clip.playbackRate,
          },
        });
        continue;
      }

      // Case 5: Clip starts before range and ends inside - Cut end
      if (clipStart < fromUs && clipEnd <= toUs) {
        await this.updateClip(clip.id, {
          display: {
            from: clip.display.from,
            to: fromUs,
          },
          trim: {
            from: clip.trim.from,
            to: clip.trim.from + (fromUs - clipStart) * clip.playbackRate,
          },
        });
        continue;
      }

      // Case 6: Clip starts inside range and ends after - Cut start and shift
      if (clipStart >= fromUs && clipEnd > toUs) {
        await this.updateClip(clip.id, {
          display: {
            from: fromUs,
            to: fromUs + (clipEnd - toUs),
          },
          trim: {
            from: clip.trim.from + (toUs - clipStart) * clip.playbackRate,
            to: clip.trim.to,
          },
        });
        continue;
      }
    }

    await this.recalculateMaxDuration();
    await this.studio.updateFrame(this.studio.currentTime);
  }
}
