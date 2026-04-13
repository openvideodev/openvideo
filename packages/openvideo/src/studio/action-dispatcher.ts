import type { Studio } from '../studio';
import { jsonToClip } from '../json-serialization';
import type {
  StudioAction,
  ClipAddAction,
  ClipRemoveAction,
  ClipUpdateAction,
  ClipsUpdateAction,
  ClipSplitAction,
  ClipReplaceAction,
  ClipLockAction,
  ClipAddAnimationAction,
  ClipRemoveAnimationAction,
  TrackAddAction,
  TrackRemoveAction,
  TrackMoveAction,
  TrackReorderAction,
  TransitionAddAction,
  EffectAddGlobalAction,
  EffectRemoveAction,
  PlaybackSeekAction,
  SettingsBgColorAction,
  SettingsSizeAction,
} from '../actions';

/**
 * Maps StudioAction objects to the corresponding Studio methods.
 *
 * This is the inbound gateway for agentic and external systems.
 * Every dispatched action emits a 'action:dispatched' event on the Studio
 * so external layers (collab, agent, sync) can observe all edits.
 *
 * @example
 * // Via Studio convenience wrapper (recommended)
 * await studio.dispatch({ type: 'clip:update', payload: { clipId: 'x', updates: { opacity: 0.5 } } });
 *
 * // Or directly via dispatcher
 * await studio.dispatcher.dispatch(action);
 */
export class ActionDispatcher {
  constructor(private studio: Studio) {}

  /**
   * Execute a StudioAction.
   * After execution, emits 'action:dispatched' on the Studio instance.
   * External layers should listen to that event — they must NOT call dispatch()
   * again for the same action (use _meta to track this if needed).
   */
  async dispatch(action: StudioAction): Promise<void> {
    await this._execute(action);
    // Emit after execution so listeners receive the post-state
    this.studio.emit('action:dispatched', { action });
  }

  private async _execute(action: StudioAction): Promise<void> {
    switch (action.type) {
      // -----------------------------------------------------------------------
      // Clip actions
      // -----------------------------------------------------------------------
      case 'clip:add':
        return this._clipAdd(action);

      case 'clip:remove':
        return this._clipRemove(action);

      case 'clip:update':
        return this._clipUpdate(action);

      case 'clips:update':
        return this._clipsUpdate(action);

      case 'clip:split':
        return this._clipSplit(action);

      case 'clip:replace':
        return this._clipReplace(action);

      case 'clip:lock':
        return this._clipLock(action);

      case 'clip:add-animation':
        return this._clipAddAnimation(action);

      case 'clip:remove-animation':
        return this._clipRemoveAnimation(action);

      // -----------------------------------------------------------------------
      // Track actions
      // -----------------------------------------------------------------------
      case 'track:add':
        this._trackAdd(action);
        return;

      case 'track:remove':
        return this._trackRemove(action);

      case 'track:move':
        return this._trackMove(action);

      case 'track:reorder':
        return this._trackReorder(action);

      // -----------------------------------------------------------------------
      // Transition & effect actions
      // -----------------------------------------------------------------------
      case 'transition:add':
        return this._transitionAdd(action);

      case 'effect:add-global':
        return this._effectAddGlobal(action);

      case 'effect:remove':
        return this._effectRemove(action);

      // -----------------------------------------------------------------------
      // Playback actions
      // -----------------------------------------------------------------------
      case 'playback:play':
        return this.studio.play();

      case 'playback:pause':
        this.studio.pause();
        return;

      case 'playback:seek':
        return this._playbackSeek(action);

      // -----------------------------------------------------------------------
      // Settings actions
      // -----------------------------------------------------------------------
      case 'settings:bg-color':
        return this._settingsBgColor(action);

      case 'settings:size':
        return this._settingsSize(action);

      // -----------------------------------------------------------------------
      // History actions
      // -----------------------------------------------------------------------
      case 'history:undo':
        return this.studio.undo();

      case 'history:redo':
        return this.studio.redo();

      default:
        // Exhaustive check — unknown action types are silently ignored so
        // future action types don't break older dispatcher versions.
        const _exhaustive: never = action;
        console.warn('[ActionDispatcher] Unknown action type:', (_exhaustive as any)?.type);
    }
  }

  // ---------------------------------------------------------------------------
  // Clip handlers
  // ---------------------------------------------------------------------------

  private async _clipAdd(action: ClipAddAction): Promise<void> {
    const clip = await jsonToClip(action.payload.clip);
    await this.studio.addClip(clip, { trackId: action.payload.trackId });
  }

  private async _clipRemove(action: ClipRemoveAction): Promise<void> {
    await this.studio.removeClipById(action.payload.clipId);
  }

  private async _clipUpdate(action: ClipUpdateAction): Promise<void> {
    await this.studio.updateClip(
      action.payload.clipId,
      action.payload.updates as any,
    );
  }

  private async _clipsUpdate(action: ClipsUpdateAction): Promise<void> {
    await this.studio.updateClips(
      action.payload.updates.map((u) => ({
        id: u.id,
        updates: u.updates as any,
      })),
    );
  }

  private async _clipSplit(action: ClipSplitAction): Promise<void> {
    const clip = this.studio.getClipById(action.payload.clipId);
    if (!clip) {
      console.warn('[ActionDispatcher] clip:split — clip not found:', action.payload.clipId);
      return;
    }
    if (typeof clip.split !== 'function') {
      console.warn('[ActionDispatcher] clip:split — clip does not support split:', clip.type);
      return;
    }
    const trackId = this.studio.findTrackIdByClipId(clip.id);
    const [before, after] = await clip.split(action.payload.time);
    this.studio.beginHistoryGroup();
    try {
      await this.studio.removeClip(clip);
      await this.studio.addClip(before, { trackId });
      await this.studio.addClip(after, { trackId });
    } finally {
      this.studio.endHistoryGroup();
    }
  }

  private async _clipReplace(action: ClipReplaceAction): Promise<void> {
    const oldClip = this.studio.getClipById(action.payload.clipId);
    if (!oldClip) {
      console.warn('[ActionDispatcher] clip:replace — clip not found:', action.payload.clipId);
      return;
    }
    const trackId = this.studio.findTrackIdByClipId(oldClip.id);
    const newClip = await jsonToClip(action.payload.newClip);
    this.studio.beginHistoryGroup();
    try {
      await this.studio.removeClip(oldClip);
      await this.studio.addClip(newClip, { trackId });
    } finally {
      this.studio.endHistoryGroup();
    }
  }

  private async _clipLock(action: ClipLockAction): Promise<void> {
    await this.studio.updateClip(action.payload.clipId, {
      locked: action.payload.locked,
    } as any);
  }

  private _clipAddAnimation(action: ClipAddAnimationAction): void {
    const clip = this.studio.getClipById(action.payload.clipId);
    if (!clip) {
      console.warn('[ActionDispatcher] clip:add-animation — clip not found:', action.payload.clipId);
      return;
    }
    clip.addAnimation(action.payload.name, action.payload.opts, action.payload.params);
  }

  private _clipRemoveAnimation(action: ClipRemoveAnimationAction): void {
    const clip = this.studio.getClipById(action.payload.clipId);
    if (!clip) {
      console.warn('[ActionDispatcher] clip:remove-animation — clip not found:', action.payload.clipId);
      return;
    }
    clip.removeAnimation(action.payload.animationId);
  }

  // ---------------------------------------------------------------------------
  // Track handlers
  // ---------------------------------------------------------------------------

  private _trackAdd(action: TrackAddAction): void {
    this.studio.addTrack(
      { name: action.payload.name, type: action.payload.type, id: action.payload.id },
      action.payload.index,
    );
  }

  private async _trackRemove(action: TrackRemoveAction): Promise<void> {
    await this.studio.removeTrack(action.payload.trackId);
  }

  private async _trackMove(action: TrackMoveAction): Promise<void> {
    await this.studio.moveTrack(action.payload.trackId, action.payload.index);
  }

  private async _trackReorder(action: TrackReorderAction): Promise<void> {
    await this.studio.setTrackOrder(action.payload.trackIds);
  }

  // ---------------------------------------------------------------------------
  // Transition & effect handlers
  // ---------------------------------------------------------------------------

  private async _transitionAdd(action: TransitionAddAction): Promise<void> {
    await this.studio.addTransition(
      action.payload.key,
      action.payload.duration,
      action.payload.fromClipId,
      action.payload.toClipId,
    );
  }

  private _effectAddGlobal(action: EffectAddGlobalAction): void {
    // addGlobalEffect is a Studio method added in the effects system
    if (typeof (this.studio as any).addGlobalEffect === 'function') {
      (this.studio as any).addGlobalEffect(
        action.payload.key,
        action.payload.startTime,
        action.payload.duration,
        action.payload.trackIndex,
      );
    } else {
      console.warn('[ActionDispatcher] effect:add-global — addGlobalEffect not available on Studio');
    }
  }

  private _effectRemove(action: EffectRemoveAction): void {
    if (typeof (this.studio as any).removeGlobalEffect === 'function') {
      (this.studio as any).removeGlobalEffect(action.payload.effectId);
    } else {
      console.warn('[ActionDispatcher] effect:remove — removeGlobalEffect not available on Studio');
    }
  }

  // ---------------------------------------------------------------------------
  // Playback handlers
  // ---------------------------------------------------------------------------

  private async _playbackSeek(action: PlaybackSeekAction): Promise<void> {
    await this.studio.seek(action.payload.time);
  }

  // ---------------------------------------------------------------------------
  // Settings handlers
  // ---------------------------------------------------------------------------

  private _settingsBgColor(action: SettingsBgColorAction): void {
    this.studio.setBgColor(action.payload.color);
  }

  private _settingsSize(action: SettingsSizeAction): void {
    this.studio.setSize(action.payload.width, action.payload.height);
  }
}
