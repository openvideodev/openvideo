import type { ClipJSON } from '../json-serialization';

// ---------------------------------------------------------------------------
// Metadata slot — openvideo passes this through transparently.
// External packages (collab, agent, sync) use it for dedup, attribution, etc.
// ---------------------------------------------------------------------------
export type ActionMeta = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Clip actions
// ---------------------------------------------------------------------------

export interface ClipAddAction {
  type: 'clip:add';
  payload: {
    clip: ClipJSON;
    trackId?: string;
  };
  _meta?: ActionMeta;
}

export interface ClipRemoveAction {
  type: 'clip:remove';
  payload: {
    clipId: string;
  };
  _meta?: ActionMeta;
}

export interface ClipUpdateAction {
  type: 'clip:update';
  payload: {
    clipId: string;
    /** Partial updates to apply — same shape accepted by studio.updateClip() */
    updates: Record<string, unknown>;
  };
  _meta?: ActionMeta;
}

export interface ClipsUpdateAction {
  type: 'clips:update';
  payload: {
    updates: Array<{
      id: string;
      updates: Record<string, unknown>;
    }>;
  };
  _meta?: ActionMeta;
}

export interface ClipSplitAction {
  type: 'clip:split';
  payload: {
    clipId: string;
    /** Time in microseconds */
    time: number;
  };
  _meta?: ActionMeta;
}

export interface ClipReplaceAction {
  type: 'clip:replace';
  payload: {
    clipId: string;
    newClip: ClipJSON;
  };
  _meta?: ActionMeta;
}

export interface ClipLockAction {
  type: 'clip:lock';
  payload: {
    clipId: string;
    locked: boolean;
  };
  _meta?: ActionMeta;
}

export interface ClipAddAnimationAction {
  type: 'clip:add-animation';
  payload: {
    clipId: string;
    name: string;
    opts: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
  _meta?: ActionMeta;
}

export interface ClipRemoveAnimationAction {
  type: 'clip:remove-animation';
  payload: {
    clipId: string;
    animationId: string;
  };
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// Track actions
// ---------------------------------------------------------------------------

export interface TrackAddAction {
  type: 'track:add';
  payload: {
    name: string;
    type: string;
    id?: string;
    index?: number;
  };
  _meta?: ActionMeta;
}

export interface TrackRemoveAction {
  type: 'track:remove';
  payload: {
    trackId: string;
  };
  _meta?: ActionMeta;
}

export interface TrackMoveAction {
  type: 'track:move';
  payload: {
    trackId: string;
    index: number;
  };
  _meta?: ActionMeta;
}

export interface TrackReorderAction {
  type: 'track:reorder';
  payload: {
    trackIds: string[];
  };
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// Transition & effect actions
// ---------------------------------------------------------------------------

export interface TransitionAddAction {
  type: 'transition:add';
  payload: {
    key: string;
    /** Duration in microseconds */
    duration: number;
    fromClipId: string;
    toClipId: string;
  };
  _meta?: ActionMeta;
}

export interface EffectAddGlobalAction {
  type: 'effect:add-global';
  payload: {
    key: string;
    /** Start time in microseconds */
    startTime: number;
    /** Duration in microseconds */
    duration: number;
    trackIndex?: number;
  };
  _meta?: ActionMeta;
}

export interface EffectRemoveAction {
  type: 'effect:remove';
  payload: {
    effectId: string;
  };
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// Playback actions
// ---------------------------------------------------------------------------

export interface PlaybackPlayAction {
  type: 'playback:play';
  _meta?: ActionMeta;
}

export interface PlaybackPauseAction {
  type: 'playback:pause';
  _meta?: ActionMeta;
}

export interface PlaybackSeekAction {
  type: 'playback:seek';
  payload: {
    /** Time in microseconds */
    time: number;
  };
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// Settings actions
// ---------------------------------------------------------------------------

export interface SettingsBgColorAction {
  type: 'settings:bg-color';
  payload: {
    color: string;
  };
  _meta?: ActionMeta;
}

export interface SettingsSizeAction {
  type: 'settings:size';
  payload: {
    width: number;
    height: number;
  };
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// History actions
// ---------------------------------------------------------------------------

export interface HistoryUndoAction {
  type: 'history:undo';
  _meta?: ActionMeta;
}

export interface HistoryRedoAction {
  type: 'history:redo';
  _meta?: ActionMeta;
}

// ---------------------------------------------------------------------------
// Full union — the public contract consumed by external layers
// ---------------------------------------------------------------------------

export type StudioAction =
  // Clip
  | ClipAddAction
  | ClipRemoveAction
  | ClipUpdateAction
  | ClipsUpdateAction
  | ClipSplitAction
  | ClipReplaceAction
  | ClipLockAction
  | ClipAddAnimationAction
  | ClipRemoveAnimationAction
  // Track
  | TrackAddAction
  | TrackRemoveAction
  | TrackMoveAction
  | TrackReorderAction
  // Transition & effect
  | TransitionAddAction
  | EffectAddGlobalAction
  | EffectRemoveAction
  // Playback
  | PlaybackPlayAction
  | PlaybackPauseAction
  | PlaybackSeekAction
  // Settings
  | SettingsBgColorAction
  | SettingsSizeAction
  // History
  | HistoryUndoAction
  | HistoryRedoAction;

/** Narrow helper: extract actions that have a payload */
export type StudioActionType = StudioAction['type'];
