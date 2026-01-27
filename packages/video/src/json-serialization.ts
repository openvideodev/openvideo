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
    case 'Image': {
      clip = await Image.fromObject(json);
      return clip; // Return immediately after reconstructing Image clip
    }
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
    return await ClipClass.fromObject(json);
  }

  // Fallback to manual construction
  // Create clip based on type
  switch (json.type) {
    case 'Video': {
      const response = await fetch(json.src);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch video from ${json.src}: ${response.status} ${response.statusText}. Make sure the file exists in the public directory.`
        );
      }
      // Support both new flat structure and old options structure
      const options =
        json.audio !== undefined
          ? { audio: json.audio, volume: json.volume }
          : { volume: json.volume };
      clip = new Video(response.body!, options as any, json.src);
      break;
    }
    case 'Audio': {
      if (!json.src || json.src.trim() === '') {
        throw new Error('Audio requires a valid source URL');
      }
      // Support both new flat structure and old options structure
      const options: { loop?: boolean; volume?: number } = {};
      if (json.loop !== undefined) options.loop = json.loop;
      if (json.volume !== undefined) options.volume = json.volume;
      clip = await Audio.fromUrl(json.src, options);
      break;
    }
    // Image is handled via fromObject
    case 'Text': {
      // Read from new hybrid structure
      const text = json.text || '';
      const style = json.style || {};

      // Build options object from style
      const textClipOpts: any = {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        fill: style.color, // Map 'color' to 'fill'
        align: style.align,
      };

      // Handle stroke
      if (style.stroke) {
        textClipOpts.stroke = style.stroke.color;
        textClipOpts.strokeWidth = style.stroke.width;
      }

      // Handle shadow (map to dropShadow)
      if (style.shadow) {
        textClipOpts.dropShadow = {
          color: style.shadow.color,
          alpha: style.shadow.alpha,
          blur: style.shadow.blur,
          distance: style.shadow.distance,
          angle: style.shadow.angle,
        };
      }

      clip = new Text(text, textClipOpts as any);
      break;
    }
    case 'Caption': {
      // Read from new hybrid structure
      const text = json.text || '';
      const style = json.style || {};

      // Build options object from style
      const captionClipOpts: any = {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight as any,
        fontStyle: style.fontStyle,
        fill: style.color, // Map 'color' to 'fill'
        align: style.align,
      };

      // Handle fontUrl from style (new) or top-level (old)
      if (style.fontUrl !== undefined) {
        captionClipOpts.fontUrl = style.fontUrl;
      } else if (json.fontUrl !== undefined) {
        captionClipOpts.fontUrl = json.fontUrl;
      }

      // Handle stroke
      if (style.stroke) {
        captionClipOpts.stroke = style.stroke.color;
        captionClipOpts.strokeWidth = style.stroke.width;
      }

      // Handle shadow (map to dropShadow)
      if (style.shadow) {
        captionClipOpts.dropShadow = {
          color: style.shadow.color,
          alpha: style.shadow.alpha,
          blur: style.shadow.blur,
          distance: style.shadow.distance,
          angle: style.shadow.angle,
        };
      }

      // Handle new nested structure vs old flat structure
      if (json.caption) {
        // New nested structure
        const caption = json.caption;

        // Words array
        if (caption.words) {
          captionClipOpts.words = caption.words;
        }

        // Colors
        if (caption.colors) {
          if (caption.colors.appeared !== undefined) {
            captionClipOpts.appearedColor = caption.colors.appeared;
          }
          if (caption.colors.active !== undefined) {
            captionClipOpts.activeColor = caption.colors.active;
          }
          if (caption.colors.activeFill !== undefined) {
            captionClipOpts.activeFillColor = caption.colors.activeFill;
          }
          if (caption.colors.background !== undefined) {
            captionClipOpts.backgroundColor = caption.colors.background;
          }
          if (caption.colors.keyword !== undefined) {
            captionClipOpts.isKeyWordColor = caption.colors.keyword;
          }
        }

        // Preserve keyword color
        if (caption.preserveKeywordColor !== undefined) {
          captionClipOpts.preservedColorKeyWord = caption.preserveKeywordColor;
        }

        // Positioning
        if (caption.positioning) {
          if (caption.positioning.bottomOffset !== undefined) {
            captionClipOpts.bottomOffset = caption.positioning.bottomOffset;
          }
          if (caption.positioning.videoWidth !== undefined) {
            captionClipOpts.videoWidth = caption.positioning.videoWidth;
          }
          if (caption.positioning.videoHeight !== undefined) {
            captionClipOpts.videoHeight = caption.positioning.videoHeight;
          }
        }
      } else {
        // Old flat structure (backward compatibility)
        if (json.bottomOffset !== undefined) {
          captionClipOpts.bottomOffset = json.bottomOffset;
        }

        // Add words array if present
        if (json.words) {
          captionClipOpts.words = json.words;
        }

        // Add caption-specific color properties
        if (json.appearedColor !== undefined) {
          captionClipOpts.appearedColor = json.appearedColor;
        }
        if (json.activeColor !== undefined) {
          captionClipOpts.activeColor = json.activeColor;
        }
        if (json.activeFillColor !== undefined) {
          captionClipOpts.activeFillColor = json.activeFillColor;
        }
        if (json.backgroundColor !== undefined) {
          captionClipOpts.backgroundColor = json.backgroundColor;
        }
        if (json.isKeyWordColor !== undefined) {
          captionClipOpts.isKeyWordColor = json.isKeyWordColor;
        }
        if (json.preservedColorKeyWord !== undefined) {
          captionClipOpts.preservedColorKeyWord = json.preservedColorKeyWord;
        }

        // Add layout properties
        if (json.videoWidth !== undefined) {
          captionClipOpts.videoWidth = json.videoWidth;
        }
        if (json.videoHeight !== undefined) {
          captionClipOpts.videoHeight = json.videoHeight;
        }
      }

      if (json.mediaId) {
        captionClipOpts.mediaId = json.mediaId;
      }
      captionClipOpts.initialLayoutApplied = true;
      clip = new Caption(text, captionClipOpts);
      break;
    }
    case 'Effect': {
      clip = new Effect((json as EffectJSON).effect.key as any);
      (clip as Effect).effect = (json as EffectJSON).effect;
      break;
    }
    default:
      throw new Error(`Unsupported clip type: ${(json as any).type}`);
  }

  // Apply properties
  clip.left = json.left;
  clip.top = json.top;
  clip.width = json.width;
  clip.height = json.height;
  clip.angle = json.angle;

  // Apply clip properties directly
  clip.display.from = json.display.from;
  clip.display.to = json.display.to;
  clip.duration = json.duration;
  clip.playbackRate = json.playbackRate;

  clip.zIndex = json.zIndex;
  clip.opacity = json.opacity;
  clip.flip = json.flip;

  if (json.style) {
    clip.style = { ...clip.style, ...json.style };
  }

  // Apply animation if present
  if (json.animation) {
    clip.setAnimation(json.animation.keyFrames, json.animation.opts);
  }

  // Apply id and effects (needed for Compositor)
  if (json.id) {
    clip.id = json.id;
  }
  if (json.effects) {
    (clip as any).effects = json.effects;
  }

  // Apply trim if present

  if (json.trim) {
    clip.trim.from =
      json.trim.from < 1e6 ? json.trim.from * 1e6 : json.trim.from;
    clip.trim.to = json.trim.to < 1e6 ? json.trim.to * 1e6 : json.trim.to;
  }

  return clip;
}
