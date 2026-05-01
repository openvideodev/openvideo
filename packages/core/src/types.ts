export interface IDisplay {
  from: number;
  to: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export type ClipType = "Video" | "Audio" | "Image" | "Text" | "Transition" | "Caption" | "Effect";

export interface IBaseClip {
  id: string;
  type: ClipType;
  name: string;
  display: IDisplay;
  trim: ITrim;
  duration: number;
  playbackRate: number;
  zIndex: number;
  opacity: number;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  src?: string;
  text?: string;
  flip?: any;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface IVideoClip extends IBaseClip { type: "Video"; src: string; }
export interface IAudioClip extends IBaseClip { type: "Audio"; src: string; }
export interface IImageClip extends IBaseClip { type: "Image"; src: string; }
export interface ITextClip extends IBaseClip { type: "Text"; text: string; }
export interface ICaptionClip extends IBaseClip { type: "Caption"; text: string; src: string; }

export interface ITransitionClip extends IBaseClip { 
  type: "Transition"; 
  transitionEffect?: {
    id: string;
    key: string;
    name: string;
  };
  fromClipId?: string | null;
  toClipId?: string | null;
}

export interface IEffectClip extends IBaseClip {
  type: "Effect";
  effect: {
    id: string;
    key: string;
    name: string;
    values?: Record<string, any>;
  };
}

export type AnyClip = IVideoClip | IAudioClip | IImageClip | ITextClip | ICaptionClip | ITransitionClip | IEffectClip;

export interface ITrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
  accepts?: string[];
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
