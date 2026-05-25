export interface IDisplay {
  from: number;
  to: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export interface IFlip {
  x: boolean;
  y: boolean;
}

export type ClipType = "Video" | "Audio" | "Image" | "Text" | "Transition" | "Caption" | "Effect";

export interface IClipTiming {
  display: IDisplay;
  trim: ITrim;
  duration: number;
  playbackRate: number;
}

/** Partial timing for use in add/prepare payloads. loadClip fills in defaults. */
export type IClipTimingInput = Partial<{
  display: Partial<IDisplay>;
  trim: Partial<ITrim>;
  duration: number;
  playbackRate: number;
}>;

export interface IClipTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  zIndex: number;
  opacity: number;
  flip?: IFlip | null;
}

export interface IBaseClip {
  id: string;
  type: ClipType;
  name: string;
  timing: IClipTiming;
  transform: IClipTransform;
  display?: IDisplay;
  trim?: ITrim;
  duration?: number;
  playbackRate?: number;
  src?: string;
  text?: string;
  locked?: boolean;
  textCase?: "none" | "uppercase" | "lowercase";
  verticalAlign?: "top" | "center" | "bottom";
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface IVideoClip extends IBaseClip {
  type: "Video";
  src: string;
  style?: IBaseClipStyle;
}
export interface IAudioClip extends IBaseClip {
  type: "Audio";
  src: string;
  style?: IBaseClipStyle;
}
export interface IImageClip extends IBaseClip {
  type: "Image";
  src: string;
  style?: IBaseClipStyle;
}
export interface ITextClip extends IBaseClip {
  type: "Text";
  text: string;
  style?: ITextStyle;
}

export interface ICaptionWord {
  text: string;
  from: number;
  to: number;
  isKeyWord?: boolean;
  paragraphIndex?: number;
}

export interface ICaptionColors {
  appeared?: string;
  active?: string;
  activeFill?: string;
  background?: string;
  keyword?: string;
}

export interface IClipStroke {
  color: string;
  width: number;
  join?: "miter" | "round" | "bevel";
  cap?: "butt" | "round" | "square";
  miterLimit?: number;
}

export interface IClipShadow {
  color?: string;
  alpha?: number;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface IBaseClipStyle {
  borderRadius?: number;
  stroke?: IClipStroke;
  shadow?: IClipShadow;
}

export interface ITextStyle extends IBaseClipStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  align?: "left" | "center" | "right";
  fontUrl?: string;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textCase?: "none" | "uppercase" | "lowercase" | "title";
  verticalAlign?: "top" | "center" | "bottom";
}

export interface ICaptionStyle extends ITextStyle {}

export interface ICaptionClip extends IBaseClip {
  type: "Caption";
  text: string;
  mediaId: string;
  wordsPerLine: "single" | "multiple";
  caption: {
    words: ICaptionWord[];
    colors: ICaptionColors;
    preserveKeywordColor: boolean;
    positioning: {
      videoWidth: number;
      videoHeight: number;
    };
    textBoxStyle?: {
      style?: "tiktok" | "none";
      textAlign?: "left" | "center" | "right" | "";
      maxLines?: number;
      borderRadius?: number;
      horizontalPadding?: number;
      verticalPadding?: number;
    };
  };
  style: ICaptionStyle;
}

export interface ITransitionClip extends IBaseClip {
  type: "Transition";
  transitionKey: string;
  fromClipId?: string | null;
  toClipId?: string | null;
}

export interface IEffectClip extends IBaseClip {
  type: "Effect";
  effectKey: string;
  values?: Record<string, any>;
}

export type AnyClip =
  | IVideoClip
  | IAudioClip
  | IImageClip
  | ITextClip
  | ICaptionClip
  | ITransitionClip
  | IEffectClip;

export interface ITrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
  accepts?: string[];
  static?: boolean;
}

export interface IProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface IProject {
  settings: IProjectSettings;
  tracks: ITrack[];
  clips: Record<string, AnyClip>;
}

export interface IScaleState {
  zoom: number;
  unit: number;
  segments: number;
  index: number;
}

/**
 * IRenderer - Platform-agnostic rendering contract.
 */
export interface IRenderer {
  init(project: IProject): Promise<void>;
  render(time: number): void;
  dispose(): void;
}
