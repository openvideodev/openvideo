import {
  Audio,
  Image,
  Video,
  Text,
  Caption,
  Effect,
  Transition,
  Placeholder,
  type IClip,
  type ITransitionInfo,
} from './clips';
// Base interface for all clips
interface BaseClipJSON {
  id?: string;
  name?: string;
  effects?: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
    targets?: number[];
  }>;
  src: string;
  display: {
    from: number;
    to: number;
  };
  playbackRate: number;
  duration: number;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  zIndex: number;
  opacity: number;
  flip: 'horizontal' | 'vertical' | null;
  trim?: {
    from: number;
    to: number;
  };
  transition?: ITransitionInfo;
  style?: any;

  animation?: {
    keyFrames: Record<
      string,
      Partial<{
        x: number;
        y: number;
        w: number;
        h: number;
        angle: number;
        opacity: number;
      }>
    >;
    opts: {
      duration: number;
      delay?: number;
      iterCount?: number;
    };
  };
  animations?: Array<{
    type: string;
    opts: any;
    params?: any;
  }>;
  main?: boolean; // For Compositor only
}

// Video clip specific
export interface VideoJSON extends BaseClipJSON {
  type: 'Video';
  audio?: boolean;
  volume?: number;
}

// Audio clip specific
export interface AudioJSON extends BaseClipJSON {
  type: 'Audio';
  loop?: boolean;
  volume?: number;
}

// Image clip specific
export interface ImageJSON extends BaseClipJSON {
  type: 'Image';
}

// Text style interface
export interface TextStyleJSON {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?:
    | string
    | number
    | {
        type: 'gradient';
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        colors: Array<{ ratio: number; color: string | number }>;
      };
  align?: 'left' | 'center' | 'right';
  fontUrl?: string; // Font URL for custom fonts
  stroke?: {
    color: string | number;
    width: number;
    join?: 'miter' | 'round' | 'bevel';
    cap?: 'butt' | 'round' | 'square';
    miterLimit?: number;
  };
  shadow?: {
    color: string | number;
    alpha: number;
    blur: number;
    distance: number;
    angle: number;
  };
  wordWrap?: boolean;
  wordWrapWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'title';
  verticalAlign?: 'top' | 'center' | 'bottom';
  wordsPerLine?: 'single' | 'multiple';
}

// Text clip specific
export interface TextJSON extends BaseClipJSON {
  type: 'Text';
  text: string;
  style?: TextStyleJSON;
}

// Caption colors interface (new nested structure)
export interface CaptionColorsJSON {
  appeared?: string;
  active?: string;
  activeFill?: string;
  background?: string;
  keyword?: string;
}

// Caption positioning interface (new nested structure)
export interface CaptionPositioningJSON {
  bottomOffset?: number;
  videoWidth?: number;
  videoHeight?: number;
}

// Caption data interface (new nested structure)
export interface CaptionDataJSON {
  words?: Array<{
    text: string;
    from: number;
    to: number;
    isKeyWord: boolean;
    paragraphIndex?: number;
  }>;
  colors?: CaptionColorsJSON;
  preserveKeywordColor?: boolean;
  positioning?: CaptionPositioningJSON;
}

// Caption clip specific
export interface CaptionJSON extends BaseClipJSON {
  type: 'Caption';
  text: string;
  style?: TextStyleJSON;
  // New nested structure
  caption?: CaptionDataJSON;
  // Old flat structure (for backward compatibility)
  bottomOffset?: number;
  words?: Array<{
    text: string;
    from: number;
    to: number;
    isKeyWord: boolean;
    paragraphIndex?: number;
  }>;
  appearedColor?: string;
  activeColor?: string;
  activeFillColor?: string;
  backgroundColor?: string;
  isKeyWordColor?: string;
  preservedColorKeyWord?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  fontUrl?: string;
  mediaId?: string;
  wordsPerLine?: 'single' | 'multiple';
}

// Effect clip specific
export interface EffectJSON extends BaseClipJSON {
  type: 'Effect';
  effect: {
    id: string;
    key: string;
    name: string;
  };
}

// Transition clip specific
export interface TransitionJSON extends BaseClipJSON {
  type: 'Transition';
  transitionEffect: {
    id: string;
    key: string;
    name: string;
  };
  fromClipId: string | null;
  toClipId: string | null;
}

// Placeholder clip specific
export interface PlaceholderJSON extends BaseClipJSON {
  type: 'Placeholder';
}

// Global Transition interface (applied between clips)
export interface GlobalTransitionJSON {
  key: string;
  duration: number;
  clips: string[];
}

// Union type for all clip types

export type ClipJSON =
  | VideoJSON
  | AudioJSON
  | ImageJSON
  | TextJSON
  | CaptionJSON
  | EffectJSON
  | TransitionJSON
  | PlaceholderJSON;

export interface StudioTrackJSON {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
}

export interface ProjectJSON {
  tracks?: StudioTrackJSON[];
  clips: ClipJSON[]; // Normalized: Source of truth for clips
  transition?: GlobalTransitionJSON[];
  transitions?: GlobalTransitionJSON[]; // Alias for transition for better compatibility
  globalEffects?: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }>;
  settings?: {
    width?: number;
    height?: number;
    fps?: number;
    bgColor?: string;
    videoCodec?: string;
    bitrate?: number;
    audio?: boolean;
    metaDataTags?: Record<string, string>;
  };
}

/**
 * Serialize a clip to JSON format
 * @param clip The clip to serialize
 * @param main Whether this is the main clip (for Compositor)
 */
export function clipToJSON(clip: IClip, main: boolean = false): ClipJSON {
  // Use the clip's own toJSON method if available (fabric.js pattern)
  // This allows each clip to control its own serialization and avoid circular references
  return clip.toJSON(main);
}

/**
 * Deserialize JSON to a clip instance
 * Uses fromObject static method if available (fabric.js pattern), otherwise falls back to manual construction
 */
export async function jsonToClip(json: ClipJSON): Promise<IClip> {
  let clip: IClip;

  // Try to use fromObject static method if available (fabric.js pattern)
  let ClipClass: any = null;
  switch (json.type) {
    case 'Video':
      ClipClass = Video;
      break;
    case 'Audio':
      ClipClass = Audio;
      break;
    case 'Image':
      ClipClass = Image;
      break;
    case 'Text':
      ClipClass = Text;
      break;
    case 'Caption':
      ClipClass = Caption;
      break;
    case 'Effect':
      ClipClass = Effect;
      break;
    case 'Transition':
      ClipClass = Transition;
      break;
    case 'Placeholder':
      ClipClass = Placeholder;
      break;
  }

  if (ClipClass && typeof ClipClass.fromObject === 'function') {
    clip = await ClipClass.fromObject(json);
  } else {
    throw new Error(`Unsupported clip type or missing fromObject: ${json.type}`);
  }

  // Final pass for modular animations to ensure they are always applied
  // (some fromObject implementations might only handle legacy animation)
  if (json.animations && Array.isArray(json.animations)) {
    clip.clearAnimations();
    for (const anim of json.animations) {
      clip.addAnimation(anim.type, anim.opts, anim.params);
    }
  }

  // Ensure id and name are correct
  if (json.id) clip.id = json.id;
  if (json.name) clip.name = json.name;

  return clip;
}
