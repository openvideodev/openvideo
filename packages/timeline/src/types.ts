// ============================================================================
// PRIMITIVE / SHARED TYPES
// ============================================================================

export interface ICrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IDisplay {
  from: number;
  to: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export interface IChromaKey {
  enabled: boolean;
  color: string;
  similarity: number;
  spill: number;
}

export interface IFlip {
  horizontal: boolean;
  vertical: boolean;
}

// ============================================================================
// CLIP TYPES
// ============================================================================

export type ClipType =
  | 'Video'
  | 'Audio'
  | 'Image'
  | 'Text'
  | 'Transition'
  | 'Caption';
export type ItemType =
  | 'video'
  | 'audio'
  | 'image'
  | 'text'
  | 'caption'
  | 'Video'
  | 'Audio'
  | 'Image'
  | 'Text'
  | 'Caption';

// ============================================================================
// STYLE OBJECTS (per clip type)
// ============================================================================

export interface IVideoStyle {
  [key: string]: unknown;
}

export interface IAudioStyle {
  [key: string]: unknown;
}

export interface IImageStyle {
  [key: string]: unknown;
}

export interface ITextStroke {
  color: string;
  width: number;
}

export interface ITextShadow {
  color: string;
  alpha: number;
  blur: number;
  distance: number;
  angle: number;
}

export interface ITextStyle {
  fontSize?: number | string;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: string | number;
  letterSpacing?: string | number;
  wordSpacing?: string | number;
  color?: string;
  backgroundColor?: string;
  border?: string;
  textShadow?: string;
  shadow?: ITextShadow;
  stroke?: ITextStroke;
  wordWrap?: boolean | string;
  wordWrapWidth?: number;
  wordBreak?: string;
  WebkitTextStrokeColor?: string;
  WebkitTextStrokeWidth?: string | number;
  textTransform?: string;
  skewX?: number;
  skewY?: number;
  [key: string]: unknown;
}

export interface ITransitionStyle {
  [key: string]: unknown;
}

export interface ITransitionEffect {
  id: string;
  key: string;
  name: string;
}

// ============================================================================
// BASE CLIP
// ============================================================================

export interface ICompositionAnimation {
  property: string;
  from: unknown;
  to: unknown;
  durationInFrames: number;
  easing: string;
}

export interface IBasicAnimation {
  name: string;
  composition: ICompositionAnimation[];
}

export interface IAnimations {
  in?: IBasicAnimation;
  out?: IBasicAnimation;
  loop?: IBasicAnimation;
  timed?: IBasicAnimation;
}

interface IClipBase {
  id: string;
  name: string;
  src: string;
  display: IDisplay;
  trim: ITrim;
  playbackRate: number;
  duration: number;
  left: number | string;
  top: number | string;
  transform?: string;
  width: number;
  height: number;
  angle: number;
  zIndex: number;
  opacity: number;
  flip: IFlip | null;
  chromaKey?: IChromaKey;
  locked: boolean;
  effects: IEffect[];
  animations?: IAnimations;
  crop?: ICrop;
  metadata?: IMetadata;
}

// ============================================================================
// EFFECTS
// ============================================================================

export interface IEffect {
  id?: string;
  key?: string;
  name?: string;
  [key: string]: unknown;
}

// ============================================================================
// CLIP VARIANTS
// ============================================================================

export interface IVideoClip extends IClipBase {
  type: 'Video';
  style: IVideoStyle;
  audio: boolean;
  volume: number;
}

export interface IAudioClip extends IClipBase {
  type: 'Audio';
  style: IAudioStyle;
  volume: number;
}

export interface IImageClip extends IClipBase {
  type: 'Image';
  style: IImageStyle;
}

export interface ITextClip extends IClipBase {
  type: 'Text';
  style: ITextStyle;
  text: string;
}

export interface ITransitionClip extends IClipBase {
  type: 'Transition';
  style: ITransitionStyle;
  key: string;
  fromClipId: string;
  toClipId: string;
}

export interface ICaptionWord {
  word: string;
  start: number;
  end: number;
  is_keyword?: boolean;
}

export interface ICaptionClip extends IClipBase {
  type: 'Caption';
  style: ITextStyle;
  text: string;
  words?: ICaptionWord[];
  linesPerCaption?: number;
  sourceUrl?: string;
  animationPreset?: string;
}

export type IClip =
  | IVideoClip
  | IAudioClip
  | IImageClip
  | ITextClip
  | ITransitionClip
  | ICaptionClip;

/** @deprecated Use IClip instead */
export type IComposition = IClip;

/** @deprecated Use Record<string, unknown> */
export type IMetadata = Record<string, unknown>;

// ============================================================================
// TRACK
// ============================================================================

export type TrackType =
  | 'Video'
  | 'Audio'
  | 'Image'
  | 'Text'
  | 'Transition'
  | 'Caption';

export interface ITrack {
  id: string;
  name: string;
  type: TrackType;
  clipIds: string[];
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface ISettings {
  width: number;
  height: number;
  fps: number;
  bgColor: string;
}

// ============================================================================
// PROJECT / DESIGN
// ============================================================================

export interface IProject {
  tracks: ITrack[];
  clips: IClip[];
  settings: ISettings;
}

// ============================================================================
// TIMELINE STATE (runtime, not persisted)
// ============================================================================

export interface ITimelineScaleState {
  unit: number;
  zoom: number;
  segments: number;
  index: number;
}

export interface ITimelineScrollState {
  /** Timeline scroll state by X-axis. */
  left: number;
  /** Timeline scroll state by Y-axis. */
  top: number;
}

export interface CanvasSpacing {
  left: number;
  right: number;
}

// ============================================================================
// HISTORY
// ============================================================================

export type IKindHistory =
  | 'add'
  | 'remove'
  | 'update'
  | 'replace'
  | 'update:details'
  | 'layer:selection'
  | 'undo'
  | 'design:resize'
  | 'design:load'
  | 'redo'
  | 'add:transition'
  | 'edit:track';

export interface IUpdateStateOptions {
  updateHistory?: boolean;
  kind?: IKindHistory;
}

// ============================================================================
// RUNTIME STATE
// ============================================================================

export interface State {
  tracks: ITrack[];
  clips: IClip[];
  settings: ISettings;
  scale: ITimelineScaleState;
  duration: number;
  activeIds: string[];
}

// ============================================================================
// STATE MANAGER
// ============================================================================

export interface IStateManager {
  getState(): State;
  subscribe(callback: (state: State) => void): void;
  updateState(
    partialState: Partial<State>,
    options?: IUpdateStateOptions
  ): void;
  subscribeToScale: (callback: (v: { scale: State['scale'] }) => void) => void;
  subscribeToDuration: (
    callback: (v: { duration: State['duration'] }) => void
  ) => void;
  subscribeToUpdateTracks: (
    callback: (v: {
      tracks: State['tracks'];
      duration: State['duration'];
      clips: State['clips'];
    }) => void
  ) => void;
  subscribeToActiveIds: (
    callback: (v: { activeIds: State['activeIds'] }) => void
  ) => void;
  subscribeToAddOrRemoveClips: (
    callback: (v: { clips: State['clips'] }) => void
  ) => void;
  subscribeToHistory: (
    callback: (v: { tracks: State['tracks']; clips: State['clips'] }) => void
  ) => void;
  subscribeToUpdateClip: (
    callback: (v: { clips: State['clips'] }) => void
  ) => void;
  subscribeToUpdateClipTiming: (
    callback: (v: {
      clips: State['clips'];
      changedTrimIds?: string[];
      changedDisplayIds?: string[];
    }) => void
  ) => void;
  subscribeToFps: (callback: (v: { fps: number }) => void) => void;
  subscribeToTracks: (
    callback: (v: { tracks: State['tracks']; changedTracks: string[] }) => void
  ) => void;
  subscribeToState: (
    callback: (v: {
      tracks: State['tracks'];
      clips: State['clips'];
      settings: State['settings'];
    }) => void
  ) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type IClipMap = Record<string, IClip>;
export type ITrackMap = Record<string, ITrack>;

export interface IBulkAction {
  type: string;
  payload?: unknown;
}

// ============================================================================
// LEGACY / COMPAT ALIASES
// These allow files still referencing the old type names to compile.
// ============================================================================

/** @deprecated Use IClipBase width/height instead */
export interface ISize {
  width: number;
  height: number;
}

/** @deprecated Use IClip directly */
export type ITrackItem = IClip;

/** @deprecated Use IVideoClip */
export type IVideo = IVideoClip;

/** @deprecated Use IAudioClip */
export type IAudio = IAudioClip;

/** @deprecated Use IImageClip */
export type IImage = IImageClip;

/** @deprecated Use ITextClip */
export type IText = ITextClip;

/** @deprecated Use IClip with type assertion */
export type IShape = IClip;

/** @deprecated Use IClip with type assertion */
export type IIllustration = IClip;

/** @deprecated Use ICaptionClip directly */
export type ICaption = ICaptionClip;

/** @deprecated Use IClip with type assertion */
export type IProgressBar = IClip;

/** @deprecated Use IClip with type assertion */
export type IProgressFrame = IClip;

/** @deprecated Use IClip with type assertion */
export type IHillAudioBars = IClip;

/** @deprecated Use IClip with type assertion */
export type ILinealAudioBars = IClip;

/** @deprecated Use IClip with type assertion */
export type IRadialAudioBars = IClip;

/** @deprecated Use IClip with type assertion */
export type IWaveAudioBars = IClip;

export type IBoxShadow = {
  color: string;
  x: number;
  y: number;
  blur: number;
};

export type ITextDetails = ITextClip &
  ITextStyle & {
    [key: string]: unknown;
  };

/** @deprecated Legacy map type */
export type ITrackItemsMap = Record<string, IClip>;

/** @deprecated Legacy map type */
