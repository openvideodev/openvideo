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

export type ClipType =
  | 'Video'
  | 'Audio'
  | 'Image'
  | 'Text'
  | 'Transition'
  | 'Caption'
  | 'Effect';

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
  flip?: IFlip | null;
  locked?: boolean;
  textCase?: 'none' | 'uppercase' | 'lowercase';
  verticalAlign?: 'top' | 'center' | 'bottom';
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface IVideoClip extends IBaseClip {
  type: 'Video';
  src: string;
}
export interface IAudioClip extends IBaseClip {
  type: 'Audio';
  src: string;
}
export interface IImageClip extends IBaseClip {
  type: 'Image';
  src: string;
}
export interface ITextClip extends IBaseClip {
  type: 'Text';
  text: string;
}

export interface ICaptionWord {
  text: string;
  from: number;
  to: number;
  isKeyWord: boolean;
  paragraphIndex: any;
}

export interface ICaptionClip extends IBaseClip {
  type: 'Caption';
  text: string;
  mediaId: string;
  wordsPerLine: 'single' | 'multiple';
  caption: {
    words: ICaptionWord[];
    colors: {
      appeared: string;
      active: string;
      activeFill: string;
      background: string;
      keyword: string;
    };
    preserveKeywordColor: boolean;
    positioning: {
      videoWidth: number;
      videoHeight: number;
    };
  };
  style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    fontUrl?: string;
    wordWrapWidth?: number;
    wordWrap?: boolean;
    stroke?: {
      color: string;
      width: number;
    };
    shadow?: {
      color: string;
      alpha: number;
      blur: number;
      distance: number;
      angle: number;
    };
  };
}

export interface ITransitionClip extends IBaseClip {
  type: 'Transition';
  transitionEffect?: {
    id: string;
    key: string;
    name: string;
  };
  fromClipId?: string | null;
  toClipId?: string | null;
}

export interface IEffectClip extends IBaseClip {
  type: 'Effect';
  effect: {
    id: string;
    key: string;
    name: string;
    values?: Record<string, any>;
  };
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
