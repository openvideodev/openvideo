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
} from "./clips";
import type { ColorAdjustment } from "./utils/color-adjustment";
export interface ClipTimingJSON {
  display: {
    from: number;
    to: number;
  };
  trim?: {
    from: number;
    to: number;
  };
  duration: number;
  playbackRate: number;
  fadeIn?: {
    duration: number; // ms
    curve?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  };
  fadeOut?: {
    duration: number; // ms
    curve?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  };
}

export interface ClipTransformJSON {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  zIndex: number;
  flip?: { x: boolean; y: boolean } | null;
}

// Base interface for all clips
interface BaseClipJSON {
  id?: string;
  name?: string;
  metadata?: Record<string, any>;
  effects?: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
    targets?: number[];
  }>;
  src?: string;

  // New nested timing schema
  timing?: ClipTimingJSON;

  // New nested transform schema
  transform?: ClipTransformJSON;

  // Legacy fields made optional for backward compatibility during deserialization
  display?: {
    from: number;
    to: number;
  };
  playbackRate?: number;
  duration?: number;
  trim?: {
    from: number;
    to: number;
  };
  transition?: ITransitionInfo;
  style?: any;
  locked?: boolean;
  colorAdjustment?: ColorAdjustment;

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
    options: {
      duration: number;
      delay?: number;
      iterCount?: number;
    };
  };
  animations?: Array<{
    type: string;
    options: any;
    params?: any;
  }>;
  main?: boolean; // For Compositor only
}

// Visual style (Image, Video, Audio)
export interface ClipVisualStyleJSON {
  borderRadius?: number;
  stroke?: { color: string; width: number };
  shadow?: {
    color?: string;
    alpha?: number;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

// Video clip specific
export interface VideoJSON extends BaseClipJSON {
  type: "Video";
  audio?: boolean;
  volume?: number;
  style?: ClipVisualStyleJSON;
}

// Audio clip specific
export interface AudioJSON extends BaseClipJSON {
  type: "Audio";
  loop?: boolean;
  volume?: number;
  style?: ClipVisualStyleJSON;
}

// Image clip specific
export interface ImageJSON extends BaseClipJSON {
  type: "Image";
  style?: ClipVisualStyleJSON;
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
        type: "gradient";
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        colors: Array<{ ratio: number; color: string | number }>;
      };
  align?: "left" | "center" | "right";
  fontUrl?: string; // Font URL for custom fonts
  stroke?: {
    color: string | number;
    width: number;
    join?: "miter" | "round" | "bevel";
    cap?: "butt" | "round" | "square";
    miterLimit?: number;
  };
  shadow?: {
    color?: string | number;
    alpha?: number;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
  wordWrap?: boolean;
  wordWrapWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textCase?: "none" | "uppercase" | "lowercase" | "title";
  wordsPerLine?: "single" | "multiple";
  verticalAlign?: "top" | "center" | "bottom";
  wordAnimation?: ICaptionWordAnimation;
  textBoxStyle?: TextBoxStyleJSON;
  appeared?: string;
  active?: string;
  activeFill?: string;
  background?: string;
  keyword?: string;
}

export interface ICaptionWordAnimation {
  type: "scale" | "opacity";
  application: "active" | "keyword" | "none";
  value: number;
  mode?: "static" | "dynamic";
}

export interface TextBoxStyleJSON {
  style?: "tiktok" | "none";
  textAlign?: "left" | "center" | "right" | "";
  maxLines?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
}

// Text clip specific
export interface TextJSON extends BaseClipJSON {
  type: "Text";
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
    isKeyWord?: boolean;
    paragraphIndex?: number;
  }>;
  colors?: CaptionColorsJSON;
  preserveKeywordColor?: boolean;
  positioning?: CaptionPositioningJSON;
  wordAnimation?: ICaptionWordAnimation;
  textBoxStyle?: TextBoxStyleJSON;
}

// Caption clip specific
export interface CaptionJSON extends BaseClipJSON {
  type: "Caption";
  text: string;
  style?: TextStyleJSON;
  // New nested structure
  caption?: CaptionDataJSON;

  fontUrl?: string;
  mediaId?: string;
  wordsPerLine?: "single" | "multiple";
  textBoxStyle?: TextBoxStyleJSON;
}

// Effect clip specific
export interface EffectJSON extends BaseClipJSON {
  type: "Effect";
  effectKey: string;
  values?: Record<string, any>;
}

// Transition clip specific
export interface TransitionJSON extends BaseClipJSON {
  type: "Transition";
  transitionKey: string;
  fromClipId?: string | null;
  toClipId?: string | null;
}

// Placeholder clip specific
export interface PlaceholderJSON extends BaseClipJSON {
  type: "Placeholder";
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
  clips: Record<string, ClipJSON>;
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
    duration?: number;
    backgroundColor?: string;
    format?: string;
    videoCodec?: string;
    bitrate?: number;
    audio?: boolean;
    audioCodec?: string;
    audioSampleRate?: number;
    metaDataTags?: Record<string, string>;
  };
}

/**
 * Normalize a clip's JSON structure to ensure compatibility and migrate old property structures
 */
export function normalizeClipJSON(json: ClipJSON): ClipJSON {
  const normalized = { ...json } as any;

  if (!normalized.timing) {
    normalized.timing = {
      display: json.display || { from: 0, to: 0 },
      trim: json.trim || { from: 0, to: 0 },
      duration: json.duration ?? 0,
      playbackRate: json.playbackRate ?? 1,
      fadeIn: (json as any).fadeIn,
      fadeOut: (json as any).fadeOut,
    };
  } else {
    normalized.timing = {
      display: normalized.timing.display || { from: 0, to: 0 },
      trim: normalized.timing.trim || { from: 0, to: 0 },
      duration: normalized.timing.duration ?? 0,
      playbackRate: normalized.timing.playbackRate ?? 1,
      fadeIn: normalized.timing.fadeIn ?? (json as any).fadeIn,
      fadeOut: normalized.timing.fadeOut ?? (json as any).fadeOut,
    };
  }
  delete normalized.fadeIn;
  delete normalized.fadeOut;

  if (!normalized.transform) {
    const raw = json as any;
    normalized.transform = {
      x: raw.left ?? 0,
      y: raw.top ?? 0,
      width: raw.width ?? 0,
      height: raw.height ?? 0,
      angle: raw.angle ?? 0,
      opacity: raw.opacity ?? 1,
      zIndex: raw.zIndex ?? 0,
      flip: raw.flip || null,
    };
  } else {
    normalized.transform = {
      x: normalized.transform.x ?? 0,
      y: normalized.transform.y ?? 0,
      width: normalized.transform.width ?? 0,
      height: normalized.transform.height ?? 0,
      angle: normalized.transform.angle ?? 0,
      opacity: normalized.transform.opacity ?? 1,
      zIndex: normalized.transform.zIndex ?? 0,
      flip: normalized.transform.flip || null,
    };
  }

  if (normalized.style) {
    normalized.style = normalizeClipStyleJSON(normalized.style, json.type);
  }

  return normalized as ClipJSON;
}

export function normalizeClipStyleJSON(style: any, type: string): any {
  if (!style) return style;
  const normalized = { ...style };

  // Unify dropShadow into shadow
  if (normalized.dropShadow) {
    normalized.shadow = normalized.dropShadow;
    delete normalized.dropShadow;
  }

  if (normalized.shadow) {
    const shadow = { ...normalized.shadow };
    const hasOffset = shadow.offsetX !== undefined || shadow.offsetY !== undefined;
    const hasLegacy = shadow.distance !== undefined || shadow.angle !== undefined;

    if (hasLegacy && !hasOffset) {
      const d = shadow.distance ?? 0;
      const a = shadow.angle ?? 0;
      shadow.offsetX = Math.cos(a) * d;
      shadow.offsetY = Math.sin(a) * d;
    }
    delete shadow.distance;
    delete shadow.angle;
    normalized.shadow = shadow;
  }

  if (type === "Text" || type === "Caption") {
    if (normalized.fill !== undefined) {
      normalized.color = normalized.fill;
      delete normalized.fill;
    }
  }

  return normalized;
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
  const normalizedJson = normalizeClipJSON(json);
  let clip: IClip;

  // Try to use fromObject static method if available (fabric.js pattern)
  let ClipClass: any = null;
  switch (normalizedJson.type) {
    case "Video":
      ClipClass = Video;
      break;
    case "Audio":
      ClipClass = Audio;
      break;
    case "Image":
      ClipClass = Image;
      break;
    case "Text":
      ClipClass = Text;
      break;
    case "Caption":
      ClipClass = Caption;
      break;
    case "Effect":
      ClipClass = Effect;
      break;
    case "Transition":
      ClipClass = Transition;
      break;
    case "Placeholder":
      ClipClass = Placeholder;
      break;
  }

  if (ClipClass && typeof ClipClass.fromObject === "function") {
    clip = await ClipClass.fromObject(normalizedJson);
  } else {
    throw new Error(`Unsupported clip type or missing fromObject: ${normalizedJson.type}`);
  }

  // Final pass for modular animations to ensure they are always applied
  // (some fromObject implementations might only handle legacy animation)
  if (normalizedJson.animations && Array.isArray(normalizedJson.animations)) {
    clip.clearAnimations();
    for (const anim of normalizedJson.animations) {
      clip.addAnimation(anim.type, anim.options, anim.params);
    }
  }

  // Ensure id and name are correct
  if (normalizedJson.id) clip.id = normalizedJson.id;
  if (normalizedJson.name) clip.name = normalizedJson.name;
  if (normalizedJson.metadata) clip.metadata = normalizedJson.metadata;

  return clip;
}
