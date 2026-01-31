import { Log } from '../utils/log';
import { BaseClip } from './base-clip';
import type { IClip } from './iclip';
import type {
  CaptionJSON,
  TextStyleJSON,
  CaptionDataJSON,
  CaptionColorsJSON,
  CaptionPositioningJSON,
} from '../json-serialization';
import {
  type Application,
  SplitBitmapText,
  TextStyle,
  type TextStyleOptions,
  type LineJoin,
  RenderTexture,
  FillGradient,
  type Texture,
  Container,
  Graphics,
  CanvasTextMetrics,
} from 'pixi.js';
import { isTransparent, parseColor, resolveColor } from '../utils/color';
import type { BaseSpriteEvents } from '../sprite/base-sprite';

interface CaptionSplitBitmapText extends SplitBitmapText {
  segmentIndex: number;
}

interface LocalTextStyleOptions
  extends Omit<
    Partial<TextStyleOptions>,
    'fontWeight' | 'fontStyle' | 'align' | 'fill' | 'dropShadow' | 'stroke'
  > {
  // We extend from TextStyleOptions which should define the correct types for Pixi
  // If some properties mismatch with our internal opts, we'll cast at the assignment site
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: TextStyleOptions['fontWeight'];
  fontStyle?: TextStyleOptions['fontStyle'];
  align?: TextStyleOptions['align'];
  fill?: number | { fill: FillGradient } | TextStyleOptions['fill'];
  dropShadow?:
    | boolean
    | {
        color: number | string;
        alpha: number;
        blur: number;
        angle: number;
        distance: number;
      };
  stroke?:
    | {
        color: number | string;
        width: number;
        join?: LineJoin;
      }
    | TextStyleOptions['stroke'];
}

export interface ICaptionStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: ICaptionOpts['fill'];
  align?: ICaptionOpts['align'];
  textCase?: ICaptionOpts['textCase'];
  verticalAlign?: ICaptionOpts['verticalAlign'];
  wordsPerLine?: ICaptionOpts['wordsPerLine'];
  stroke?: { color: string | number; width: number };
  shadow?: {
    color: string | number;
    alpha: number;
    blur: number;
    distance: number;
    angle: number;
  };
}

export interface ICaptionEvents extends BaseSpriteEvents {
  propsChange: Partial<{
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
    zIndex: number;
    opacity: number;
    volume: number;
    text: string;
    words: ICaptionOpts['words'];
    fill: ICaptionOpts['fill'];
    align: ICaptionOpts['align'];
    textCase: ICaptionOpts['textCase'];
    stroke: ICaptionOpts['stroke'];
    dropShadow: ICaptionOpts['dropShadow'];
    caption: ICaptionOpts['caption'];
    wordsPerLine: ICaptionOpts['wordsPerLine'];
  }>;
}

export interface ICaptionOpts {
  /**
   * Font size in pixels
   * @default 30
   */
  fontSize?: number;
  /**
   * Font family
   * @default 'Arial'
   */
  fontFamily?: string;
  fontUrl?: string;
  /**
   * Font weight (e.g., 'normal', 'bold', '400', '700')
   * @default 'normal'
   */
  fontWeight?: string | number;
  /**
   * Font style (e.g., 'normal', 'italic')
   * @default 'normal'
   */
  fontStyle?: string;
  /**
   * Text color (hex string, color name, or gradient object)
   * @default '#ffffff'
   */
  fill?:
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
  /**
   * Caption data (matches caption object in JSON)
   */
  caption?: {
    words?: Array<{
      text: string;
      from: number;
      to: number;
      isKeyWord: boolean;
      paragraphIndex?: number;
    }>;
    colors?: {
      appeared?: string;
      active?: string;
      activeFill?: string;
      background?: string;
      keyword?: string;
    };
    preserveKeywordColor?: boolean;
    positioning?: {
      videoWidth?: number;
      videoHeight?: number;
      bottomOffset?: number;
    };
  };
  /**
   * @deprecated Use caption.words instead
   */
  words?: Array<{
    text: string;
    from: number;
    to: number;
    isKeyWord: boolean;
    paragraphIndex?: number;
  }>;
  /**
   * @deprecated Use caption.colors instead
   */
  colors?: {
    appeared?: string;
    active?: string;
    activeFill?: string;
    background?: string;
    keyword?: string;
  };
  /**
   * @deprecated Use caption.preserveKeywordColor instead
   */
  preserveKeywordColor?: boolean;
  /**
   * @deprecated Use caption.positioning.videoWidth instead
   */
  videoWidth?: number;
  /**
   * @deprecated Use caption.positioning.videoHeight instead
   */
  videoHeight?: number;
  /**
   * @deprecated Use caption.positioning.bottomOffset instead
   */
  bottomOffset?: number;
  /**
   * Stroke color (hex string or color name) or stroke object with advanced options
   */
  stroke?:
    | string
    | number
    | {
        color: string | number;
        width: number;
        join?: 'miter' | 'round' | 'bevel';
      };
  /**
   * Stroke width in pixels (used when stroke is a simple color)
   * @default 0
   */
  strokeWidth?: number;
  /**
   * Text alignment ('left', 'center', 'right')
   * @default 'center'
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Drop shadow configuration
   */
  dropShadow?: {
    color?: string | number;
    alpha?: number;
    blur?: number;
    angle?: number;
    distance?: number;
  };
  /**
   * Word wrap width (0 = no wrap)
   * @default 0
   */
  wordWrapWidth?: number;
  /**
   * Word wrap mode ('break-word' or 'normal')
   * @default 'break-word'
   */
  wordWrapMode?: 'break-word' | 'normal';
  /**
   * Whether to enable word wrap
   * @default true
   */
  wordWrap?: boolean;
  /**
   * Vertical alignment ('top', 'center', 'bottom')
   * @default 'bottom'
   */
  verticalAlign?: 'top' | 'center' | 'bottom';
  /**
   * Line height (multiplier)
   * @default 1
   */
  lineHeight?: number;
  /**
   * Letter spacing in pixels
   * @default 0
   */
  letterSpacing?: number;
  /**
   * Text case transformation
   * @default 'none'
   */
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'title';
  /**
   * Media ID to which the captions were applied
   */
  mediaId?: string;
  /**
   * Internal flag to skip automatic positioning
   */
  initialLayoutApplied?: boolean;
  /**
   * Words per line mode ('single' or 'multiple')
   * @default 'multiple'
   */
  wordsPerLine?: 'single' | 'multiple';
}

/**
 * Caption clip using Canvas 2D for rendering
 * Each instance represents a single caption segment
 *
 * @example
 * const captionClip = new CaptionClip('Hello World', {
 *   fontSize: 44,
 *   fontFamily: 'Arial',
 *   fill: '#ffffff',
 *   videoWidth: 1280,
 *   videoHeight: 720,
 * });
 * captionClip.display.from = 0;
 * captionClip.duration = 3e6; // 3 seconds
 */
export class Caption extends BaseClip<ICaptionEvents> implements IClip {
  readonly type = 'Caption';
  declare ready: IClip['ready'];

  private _meta = {
    duration: Infinity,
    width: 0,
    height: 0,
  };

  get meta() {
    return { ...this._meta };
  }

  // Override width/height to trigger refreshCaptions when resized by transformer
  // Use getters from BaseSprite but override setters
  private _visualPaddingX = 20;
  private _visualPaddingY = 15;
  private _lastTickTime = 0;

  override get width(): number {
    return this._width;
  }

  override set width(v: number) {
    if (Math.abs(this._width - v) < 1) return;
    this._width = v;
    if (v > 0) {
      this._isWidthConstrained = true;
      // Use the manually set width as the persistent wrapping boundary
      this.opts.wordWrapWidth = v;
      this.opts.wordWrap = true;
      // Also update originalOpts so it persists through serialization/syncs
      if (this.originalOpts) {
        this.originalOpts.wordWrapWidth = v;
        this.originalOpts.wordWrap = true;
      }
    } else {
      this._isWidthConstrained = false;
      this.opts.wordWrapWidth = 0;
      this.opts.wordWrap = false;
      if (this.originalOpts) {
        this.originalOpts.wordWrapWidth = 0;
        this.originalOpts.wordWrap = false;
      }
    }
    this.refreshCaptions();
    this.emit('propsChange', { width: v });
  }

  override get height(): number {
    return this._height;
  }

  override set height(v: number) {
    if (Math.abs(this._height - v) < 1) return;
    this._height = v;
    this.refreshCaptions();
    this.emit('propsChange', { height: v });
  }

  override get left(): number {
    return this._left;
  }

  override set left(v: number) {
    if (Math.abs(this._left - v) < 0.1) return;
    this._left = v;
    if (!this._refreshing) {
      this._isXPositionedManually = true;
    }
    this.emit('propsChange', { left: v });
  }

  override get top(): number {
    return this._top;
  }

  override set top(v: number) {
    if (Math.abs(this._top - v) < 0.1) return;
    this._top = v;
    this.emit('propsChange', { top: v });
  }

  private _initialLayoutApplied = false;
  private _isXPositionedManually = false;
  private _isWidthConstrained = false;
  private _lastContentWidth = 0;
  private _lastContentHeight = 0;
  private _lastProcessedText = '';

  private _text: string = '';

  /**
   * Caption text content (hybrid JSON structure)
   */
  get text(): string {
    return this._text;
  }

  set text(v: string) {
    if (this._text === v) return;
    this._text = v;
    // Don't reset _isWidthConstrained here to allow persistent wrap limit

    // Check if the new text is already consistent with current words
    // (This prevents the 'sabotage' when words setter calls text setter)
    const currentWords = this.opts?.words || [];
    const currentJoinedText = currentWords.map((w) => w.text).join(' ');

    if (v.trim() === currentJoinedText.trim()) {
      // Text matches segments already, no need to redistribute or align
    } else {
      // Determine redistribution path
      const totalDurationMs =
        this.duration > 0 && this.duration !== Infinity
          ? this.duration / 1000
          : 5000; // 5s fallback

      // Split by lines first to preserve paragraphIndex (newlines)
      const lines = v.split('\n');
      const allWordsInfo: Array<{ text: string; paragraphIndex: number }> = [];

      lines.forEach((line, lineIndex) => {
        const wordsInLine = line
          .trim()
          .split(/\s+/)
          .filter((w) => w !== '');
        wordsInLine.forEach((word) => {
          allWordsInfo.push({ text: word, paragraphIndex: lineIndex });
        });
      });

      if (allWordsInfo.length === 0) {
        this.opts.words = [];
      } else {
        const wordDuration = totalDurationMs / allWordsInfo.length;
        this.opts.words = allWordsInfo.map((info, i) => ({
          text: info.text,
          from: i * wordDuration,
          to: (i + 1) * wordDuration,
          isKeyWord: false,
          paragraphIndex: info.paragraphIndex,
        }));
      }
    }

    // Sync originalOpts
    if (this.originalOpts) {
      if (this.originalOpts.caption) {
        this.originalOpts.caption.words = this.opts.words;
      } else {
        this.originalOpts.words = this.opts.words;
      }
    }

    // Only refresh if already initialized
    if (this.originalOpts && this.textStyle) {
      this.refreshCaptions().then(() => {
        this.emit('propsChange', { text: v });
      });
    }
  }

  // Text styling (hybrid JSON structure)
  // Provides direct access to styling properties
  override get style(): ICaptionStyle {
    if (!this.originalOpts) return {};
    const opts = this.originalOpts;
    return {
      fontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight,
      fontStyle: opts.fontStyle,
      color: opts.fill,
      align: opts.align,
      textCase: opts.textCase,
      verticalAlign: opts.verticalAlign,
      wordsPerLine: opts.wordsPerLine,
      stroke: opts.stroke
        ? typeof opts.stroke === 'object'
          ? { color: opts.stroke.color, width: opts.stroke.width }
          : { color: opts.stroke, width: opts.strokeWidth ?? 0 }
        : undefined,
      shadow: opts.dropShadow
        ? {
            color: opts.dropShadow.color ?? '#000000',
            alpha: opts.dropShadow.alpha ?? 0.5,
            blur: opts.dropShadow.blur ?? 4,
            distance: opts.dropShadow.distance ?? 0,
            angle: opts.dropShadow.angle ?? 0,
          }
        : undefined,
    };
  }

  override set style(v: Partial<ICaptionOpts> | ICaptionStyle) {
    this.updateStyle(v as Partial<ICaptionOpts>);
  }

  get wordsPerLine(): 'single' | 'multiple' {
    return this.opts.wordsPerLine;
  }

  set wordsPerLine(v: 'single' | 'multiple') {
    this.updateStyle({ wordsPerLine: v });
  }

  get fontFamily(): string {
    return this.opts.fontFamily;
  }

  set fontFamily(v: string) {
    this.updateStyle({ fontFamily: v });
  }

  get fontUrl(): string {
    return this.opts.fontUrl;
  }

  set fontUrl(v: string) {
    this.updateStyle({ fontUrl: v });
  }

  get fontSize(): number {
    return this.opts.fontSize;
  }

  set fontSize(v: number) {
    this.updateStyle({ fontSize: v });
  }

  get fontWeight(): string | number {
    return this.opts.fontWeight;
  }

  set fontWeight(v: string | number) {
    this.updateStyle({ fontWeight: v });
  }

  get fontStyle(): 'normal' | 'italic' | 'oblique' {
    return this.opts.fontStyle;
  }

  set fontStyle(v: 'normal' | 'italic' | 'oblique') {
    this.updateStyle({ fontStyle: v });
  }

  get fill(): ICaptionOpts['fill'] {
    return this.opts.fill;
  }

  set fill(v: ICaptionOpts['fill']) {
    this.updateStyle({ fill: v });
  }

  get align(): 'left' | 'center' | 'right' {
    return this.opts.align;
  }

  set align(v: 'left' | 'center' | 'right') {
    this.updateStyle({ align: v });
  }

  get stroke(): ICaptionOpts['stroke'] {
    return this.originalOpts?.stroke;
  }

  set stroke(v: ICaptionOpts['stroke']) {
    this.updateStyle({ stroke: v });
  }

  get strokeWidth(): number {
    return this.opts.strokeWidth;
  }

  set strokeWidth(v: number) {
    this.updateStyle({ strokeWidth: v });
  }

  get dropShadow(): ICaptionOpts['dropShadow'] {
    return this.originalOpts?.dropShadow;
  }

  set dropShadow(v: ICaptionOpts['dropShadow']) {
    this.updateStyle({ dropShadow: v });
  }

  get caption(): ICaptionOpts['caption'] {
    return this.originalOpts?.caption;
  }

  set caption(v: ICaptionOpts['caption']) {
    this.updateStyle({ caption: v });
  }

  /**
   * Bottom offset from video bottom (hybrid JSON structure)
   */
  bottomOffset?: number;

  /**
   * Text case proxy
   */
  get textCase(): string {
    return this.originalOpts?.textCase || 'none';
  }

  set textCase(v: 'none' | 'uppercase' | 'lowercase' | 'title') {
    this.updateStyle({ textCase: v });
  }

  /**
   * Unique identifier for this clip instance
   */
  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Media ID of the source clip
   */
  get mediaId(): string | undefined {
    return this.opts.mediaId;
  }

  set mediaId(v: string | undefined) {
    this.opts.mediaId = v;
    if (this.originalOpts) this.originalOpts.mediaId = v;
  }

  /**
   * Array of effects to be applied to this clip
   * Each effect specifies key, startTime, duration, and optional targets
   */
  effects: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }> = [];

  /**
   * Words getter for the clip
   */
  get words() {
    return this.opts.words;
  }

  /**
   * Words setter that triggers re-render and ensures consistency
   */
  set words(v: ICaptionOpts['words']) {
    const wordsArray = v ?? [];
    this.opts.words = wordsArray;
    if (this.originalOpts) {
      if (this.originalOpts.caption) {
        this.originalOpts.caption.words = v;
      } else {
        this.originalOpts.words = v;
      }
    }
    // Update text property to match words
    const newText = wordsArray
      .map((w) => w.text)
      .filter((t) => t && t.trim() !== '')
      .join(' ');

    if (this._text !== newText) {
      this.text = newText; // This will trigger text setter, sync, refresh, and emit
    } else {
      // Text is same, but words metadata/timing might have changed
      this.refreshCaptions().then(() => {
        this.emit('propsChange', { words: v });
      });
    }
  }

  // Internal opts with defaults applied
  private opts!: {
    fontSize: number;
    fontFamily: string;
    fontUrl: string;
    fontWeight: string | number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    fill: ICaptionOpts['fill'];
    strokeWidth: number;
    align: 'left' | 'center' | 'right';
    wordWrapWidth: number;
    wordWrap: boolean;
    lineHeight: number;
    letterSpacing: number;
    textCase: 'none' | 'uppercase' | 'lowercase' | 'title';
    videoWidth: number;
    videoHeight: number;
    bottomOffset: number;
    keyword: string;
    background: string;
    active: string;
    activeFill: string;
    appeared: string;
    words: Array<{
      text: string;
      from: number;
      to: number;
      isKeyWord: boolean;
      paragraphIndex?: number;
    }>;
    preserveKeywordColor: boolean;
    mediaId?: string;
    wordsPerLine: 'single' | 'multiple';
  };
  // Pixi rendering fields (to mirror TextClip)
  private pixiTextContainer: Container | null = null;
  private renderTexture: RenderTexture | null = null;
  private wordTexts: CaptionSplitBitmapText[] = [];
  private textStyle!: TextStyle;
  private textStyleBase!: TextStyle;
  private _refreshing = false;
  private _needsRefresh = false;
  private externalRenderer: Application['renderer'] | null = null;
  private pixiApp: Application | null = null;
  private originalOpts: ICaptionOpts | null = null;

  constructor(
    text: string,
    opts: ICaptionOpts = {},
    renderer?: Application['renderer']
  ) {
    super();
    // Store original options for serialization (shallow copy is fine since options are primitives)
    this.originalOpts = { ...opts };
    // Store external renderer if provided (e.g., from Studio)
    this.externalRenderer = renderer ?? null;
    // Set default options (matching TextClip defaults where applicable)
    this.opts = {
      fontSize: opts.fontSize ?? 30,
      fontFamily: opts.fontFamily ?? 'Arial',
      fontUrl: opts.fontUrl ?? '',
      fontWeight: opts.fontWeight ?? 'normal',
      fontStyle:
        (opts.fontStyle as 'normal' | 'italic' | 'oblique') ?? 'normal',
      fill: opts.fill ?? '#ffffff',
      strokeWidth: opts.strokeWidth ?? 0,
      align: opts.align ?? 'center',
      wordWrapWidth: opts.wordWrapWidth ?? 0,
      wordWrap: opts.wordWrap ?? false,
      lineHeight: opts.lineHeight ?? 1,
      letterSpacing: opts.letterSpacing ?? 0,
      textCase: opts.textCase ?? 'none',
      videoWidth:
        opts.caption?.positioning?.videoWidth ?? opts.videoWidth ?? 1280,
      videoHeight:
        opts.caption?.positioning?.videoHeight ?? opts.videoHeight ?? 720,
      bottomOffset:
        opts.caption?.positioning?.bottomOffset ?? opts.bottomOffset ?? 30,
      keyword:
        opts.caption?.colors?.keyword ?? opts.colors?.keyword ?? '#ffff00',
      background:
        opts.caption?.colors?.background ??
        opts.colors?.background ??
        '#000000',
      active: opts.caption?.colors?.active ?? opts.colors?.active ?? '#ffffff',
      activeFill:
        opts.caption?.colors?.activeFill ??
        opts.colors?.activeFill ??
        '#00ff00',
      appeared:
        opts.caption?.colors?.appeared ?? opts.colors?.appeared ?? '#ffffff',
      words: opts.caption?.words ?? opts.words ?? [],
      preserveKeywordColor:
        opts.caption?.preserveKeywordColor ??
        opts.preserveKeywordColor ??
        false,
      mediaId: opts.mediaId,
      wordsPerLine: opts.wordsPerLine ?? 'multiple',
    };

    this._initialLayoutApplied = opts.initialLayoutApplied ?? false;
    if (this._initialLayoutApplied) {
      this._isXPositionedManually = true;
    }

    // Initialize constrained state if we have a wrap limit
    if (this.opts.wordWrapWidth > 0) {
      this._isWidthConstrained = true;
      this._width = this.opts.wordWrapWidth;
      this.opts.wordWrap = true;
    }

    // Now set the text, which will use this.opts.words if they exist
    this.text = text;
    this._lastProcessedText = this._text;

    // Create PixiJS TextStyle from options (same pattern as TextClip)
    // Build style object conditionally to avoid passing undefined values
    const styleOptions: LocalTextStyleOptions = {
      fontSize: this.opts.fontSize,
      fontFamily: this.opts.fontFamily,
      fontWeight: this.opts.fontWeight as TextStyleOptions['fontWeight'],
      fontStyle: this.opts.fontStyle,
      align: this.opts.align,
    };

    // Handle fill - can be color or gradient (same as TextClip)
    if (
      opts.fill &&
      typeof opts.fill === 'object' &&
      opts.fill.type === 'gradient'
    ) {
      // Create gradient fill
      const gradient = new FillGradient(
        opts.fill.x0,
        opts.fill.y0,
        opts.fill.x1,
        opts.fill.y1
      );
      opts.fill.colors.forEach(({ ratio, color }) => {
        const colorNumber =
          typeof color === 'number' ? color : (parseColor(color) ?? 0xffffff);
        gradient.addColorStop(ratio, colorNumber);
      });
      styleOptions.fill = { fill: gradient };
    } else {
      let fillColor: number | undefined;
      if (opts.fill === 'transparent') {
        fillColor = 0xffffff;
      } else if (
        typeof opts.fill === 'string' ||
        typeof opts.fill === 'number'
      ) {
        fillColor = parseColor(opts.fill);
      }

      styleOptions.fill = fillColor ?? 0xffffff;
    }
    const isTransparent = (color?: string | number | null) =>
      color === 'transparent';

    // Handle stroke - can be color or advanced stroke object (same as TextClip)
    if (
      opts.stroke &&
      typeof opts.stroke === 'object' &&
      'color' in opts.stroke
    ) {
      if (!isTransparent(opts.stroke.color)) {
        const strokeColor = parseColor(opts.stroke.color);
        if (strokeColor !== undefined) {
          styleOptions.stroke = {
            color: strokeColor,
            width: opts.stroke.width,
          };
          if (opts.stroke.join) {
            styleOptions.stroke.join = opts.stroke.join as LineJoin;
          }
        }
      }
    } else {
      const strokeVal = (opts.stroke as string | number | null) ?? undefined;
      if (!isTransparent(strokeVal)) {
        const strokeColor = parseColor(strokeVal);
        if (strokeColor !== undefined) {
          styleOptions.stroke = {
            color: strokeColor,
            width: this.opts.strokeWidth ?? 0,
          };
        } else if (this.opts.strokeWidth && this.opts.strokeWidth > 0) {
          styleOptions.stroke = {
            color: 0x000000,
            width: this.opts.strokeWidth,
          };
        }
      }
    }

    // Only add dropShadow if provided (same as TextClip)
    if (opts.dropShadow) {
      const shadowColor = parseColor(opts.dropShadow.color);
      if (shadowColor !== undefined) {
        styleOptions.dropShadow = {
          color: shadowColor,
          alpha: opts.dropShadow.alpha ?? 0.5,
          blur: opts.dropShadow.blur ?? 4,
          angle: opts.dropShadow.angle ?? Math.PI / 6,
          distance: opts.dropShadow.distance ?? 2,
        };
      }
    }

    const style = new TextStyle(styleOptions as Partial<TextStyleOptions>);
    this.textStyle = style;

    // Create base style for measurements (excluding layout properties)
    const { align, fill, ...rest } = styleOptions;
    this.textStyleBase = new TextStyle(rest as Partial<TextStyleOptions>);

    this.ready = (async () => {
      await this.refreshCaptions();
      const meta = { ...this._meta };
      Log.info('CaptionClip ready:', meta);
      return meta;
    })();
  }

  /**
   * Update text styling options and refresh the caption rendering
   */
  async updateStyle(opts: Partial<ICaptionOpts>): Promise<void> {
    if (!this.originalOpts) this.originalOpts = {};
    // 1. Update originalOpts with new values
    this.originalOpts = { ...this.originalOpts, ...opts };

    // 2. Update internal opts
    if (opts.fontSize !== undefined) this.opts.fontSize = opts.fontSize;
    if (opts.fontFamily !== undefined) this.opts.fontFamily = opts.fontFamily;
    if (opts.fontUrl !== undefined) this.opts.fontUrl = opts.fontUrl;
    if (opts.fontWeight !== undefined) this.opts.fontWeight = opts.fontWeight;
    if (opts.fontStyle !== undefined)
      this.opts.fontStyle = opts.fontStyle as 'normal' | 'italic' | 'oblique';
    if (opts.fill !== undefined) this.opts.fill = opts.fill;
    if (opts.align !== undefined) this.opts.align = opts.align;
    if (opts.letterSpacing !== undefined)
      this.opts.letterSpacing = opts.letterSpacing;
    if (opts.lineHeight !== undefined) this.opts.lineHeight = opts.lineHeight;
    if (opts.textCase !== undefined) this.opts.textCase = opts.textCase;
    if (opts.wordWrapWidth !== undefined) {
      this.opts.wordWrapWidth = opts.wordWrapWidth;
      if (opts.wordWrapWidth > 0) {
        this._isWidthConstrained = true;
        this.opts.wordWrap = true;
      }
    }
    if (opts.wordsPerLine !== undefined)
      this.opts.wordsPerLine = opts.wordsPerLine;

    // Handle nested colors in opts.caption.colors
    if (opts.caption?.colors) {
      if (opts.caption.colors.appeared !== undefined)
        this.opts.appeared = opts.caption.colors.appeared;
      if (opts.caption.colors.active !== undefined)
        this.opts.active = opts.caption.colors.active;
      if (opts.caption.colors.activeFill !== undefined)
        this.opts.activeFill = opts.caption.colors.activeFill;
      if (opts.caption.colors.background !== undefined)
        this.opts.background = opts.caption.colors.background;
      if (opts.caption.colors.keyword !== undefined)
        this.opts.keyword = opts.caption.colors.keyword;
    }

    if (opts.caption?.preserveKeywordColor !== undefined) {
      this.opts.preserveKeywordColor = opts.caption.preserveKeywordColor;
    }

    // 3. Update TextStyle
    const styleOptions: LocalTextStyleOptions = {
      fontSize: this.opts.fontSize,
      fontFamily: this.opts.fontFamily,
      fontWeight: this.opts.fontWeight as TextStyleOptions['fontWeight'],
      fontStyle: this.opts.fontStyle,
      align: this.opts.align,
    };

    if (
      this.opts.fill &&
      typeof this.opts.fill === 'object' &&
      this.opts.fill.type === 'gradient'
    ) {
      const gradient = new FillGradient(
        this.opts.fill.x0,
        this.opts.fill.y0,
        this.opts.fill.x1,
        this.opts.fill.y1
      );
      this.opts.fill.colors.forEach(
        ({ ratio, color }: { ratio: number; color: string | number }) => {
          const colorNumber =
            typeof color === 'number' ? color : (parseColor(color) ?? 0xffffff);
          gradient.addColorStop(ratio, colorNumber);
        }
      );
      styleOptions.fill = { fill: gradient };
    } else {
      styleOptions.fill = 0xffffff;
    }

    // Handle stroke
    const hasStroke =
      opts.stroke !== undefined ||
      opts.strokeWidth !== undefined ||
      this.originalOpts.stroke ||
      this.originalOpts.strokeWidth;
    if (hasStroke) {
      if (
        this.originalOpts.stroke &&
        typeof this.originalOpts.stroke === 'object' &&
        'color' in this.originalOpts.stroke
      ) {
        const strokeColor = parseColor(this.originalOpts.stroke.color);
        if (strokeColor !== undefined) {
          styleOptions.stroke = {
            color: strokeColor,
            width: this.originalOpts.stroke.width,
          };
          if (this.originalOpts.stroke.join) {
            styleOptions.stroke.join = this.originalOpts.stroke.join;
          }
        }
      } else if (this.originalOpts?.stroke) {
        const stroke = this.originalOpts.stroke;
        const strokeColor = parseColor(
          typeof stroke === 'object' && stroke !== null && 'color' in stroke
            ? (stroke as { color: string | number }).color
            : (stroke as string | number)
        );
        const strokeWidth =
          opts.strokeWidth !== undefined
            ? opts.strokeWidth
            : this.originalOpts.strokeWidth !== undefined
              ? this.originalOpts.strokeWidth
              : 0;
        if (strokeColor !== undefined) {
          styleOptions.stroke = { color: strokeColor, width: strokeWidth };
        } else if (strokeWidth > 0) {
          styleOptions.stroke = { color: 0x000000, width: strokeWidth };
        }
      }
    }

    // Handle dropShadow
    const dropShadow =
      opts.dropShadow !== undefined
        ? opts.dropShadow
        : this.originalOpts.dropShadow;
    if (dropShadow) {
      const shadowColor = parseColor(dropShadow.color);
      if (shadowColor !== undefined) {
        styleOptions.dropShadow = {
          color: shadowColor,
          alpha: dropShadow.alpha !== undefined ? dropShadow.alpha : 0.5,
          blur: dropShadow.blur !== undefined ? dropShadow.blur : 4,
          angle:
            dropShadow.angle !== undefined ? dropShadow.angle : Math.PI / 6,
          distance: dropShadow.distance !== undefined ? dropShadow.distance : 2,
        };
      }
    }

    this.textStyle = new TextStyle(styleOptions as Partial<TextStyleOptions>);

    // Create base style for measurements (excluding layout properties)
    const { align, fill, ...rest } = styleOptions;
    this.textStyleBase = new TextStyle(rest as Partial<TextStyleOptions>);

    // 4. Refresh captions
    await this.refreshCaptions();
    this.emit('propsChange', opts);
  }

  private async refreshCaptions() {
    if (this._refreshing) {
      this._needsRefresh = true;
      return;
    }
    this._refreshing = true;
    this._needsRefresh = false;

    try {
      // Ensure latest fonts are available for measurement
      if (typeof document !== 'undefined') {
        await document.fonts.ready;
      }
      const oldWidth = this._width;
      const oldHeight = this._height;

      const finalVAlign = this.originalOpts?.verticalAlign || 'center';
      if (!this.pixiTextContainer) {
        this.pixiTextContainer = new Container();
      } else {
        // Clear existing children
        this.pixiTextContainer.removeChildren();
      }

      const metrics = CanvasTextMetrics.measureText(' ', this.textStyle);

      // 3. Create rendered word objects (flatten segments into individual words)
      const flattenedWords: CaptionSplitBitmapText[] = [];

      this.opts.words.forEach((segment, segmentIndex) => {
        const textCase = this.opts.textCase;
        let segmentText = segment.text || '';

        if (textCase === 'uppercase') {
          segmentText = segmentText.toUpperCase();
        } else if (textCase === 'lowercase') {
          segmentText = segmentText.toLowerCase();
        } else if (textCase === 'title') {
          segmentText = segmentText.replace(
            /\w\S*/g,
            (txt) =>
              txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
          );
        }

        // Split into individual words
        const subWords = segmentText.split(/\s+/).filter((v) => v.length > 0);

        subWords.forEach((wordStr) => {
          const wordText = new SplitBitmapText({
            text: wordStr,
            style: this.textStyle,
          }) as unknown as CaptionSplitBitmapText;
          wordText.segmentIndex = segmentIndex;

          const fill = "#ffffff";
          const fillToParse =
            typeof fill === 'object' && fill !== null && 'type' in fill
              ? 0xffffff
              : (fill as string | number);
          const initialColor = parseColor(fillToParse);
          wordText.tint = initialColor ?? 0xffffff;

          flattenedWords.push(wordText);
          this.pixiTextContainer!.addChild(wordText);
        });
      });

      this.wordTexts = flattenedWords;

      // 4. Calculate Layout (Lines)
      const paddingX = this._visualPaddingX;
      const paddingY = this._visualPaddingY;
      const lineHeight = this.opts.lineHeight * (this.opts.fontSize || 30);

      // Measure space width precisely for this Bitmap font
      const tempSpace = new SplitBitmapText({
        text: ' ',
        style: this.textStyleBase,
      });
      const spaceWidth = Math.ceil(
        tempSpace.getLocalBounds().width || tempSpace.width || metrics.width
      );
      tempSpace.destroy();

      const isAutoWidthNow =
        !this._isWidthConstrained &&
        (this.width === 0 ||
          this._lastContentWidth === 0 ||
          Math.abs(this.width - this._lastContentWidth) < 2);

      // Use a robust videoWidth fallback
      const videoWidth = this.opts.videoWidth || 1280;

      let wrapWidth = 0;
      if (this.opts.wordWrapWidth > 0 && this.opts.wordsPerLine !== 'single') {
        // Use the persistent wrap limit and subtract padding to keep text inside the box
        wrapWidth = this.opts.wordWrapWidth - paddingX * 2;
      } else if (this.opts.wordsPerLine === 'single') {
        // If wordsPerLine is 'single', each word gets its own line, so wrapWidth is effectively infinite
        wrapWidth = videoWidth * 5; // A very generous width
      } else if (!isAutoWidthNow && this.width > 0) {
        // Fallback for manual resizes
        wrapWidth = this.width + 10;
      } else {
        // In auto mode, use a very generous width (5x video) to allow text to grow in one line
        wrapWidth = videoWidth * 5;
      }

      // Sanity check: prevent NaN or 0 width from breaking layout
      if (isNaN(wrapWidth) || wrapWidth <= 0) {
        wrapWidth = videoWidth;
      }

      const lines: {
        words: CaptionSplitBitmapText[];
        width: number;
        height: number;
      }[] = [];

      let currentLine: CaptionSplitBitmapText[] = [];
      let currentLineWidth = 0;
      let currentLineHeight = 0;

      this.wordTexts.forEach((wordText, index) => {
        const bounds = wordText.getLocalBounds();
        const wordWidth = Math.ceil(bounds.width || wordText.width);
        const wordHeight = Math.ceil(bounds.height || wordText.height);

        const segmentIndex = wordText.segmentIndex;
        const wordData = this.opts.words[segmentIndex];
        const prevWordText = index > 0 ? this.wordTexts[index - 1] : null;
        const prevWordData = prevWordText
          ? this.opts.words[prevWordText.segmentIndex]
          : null;

        // Force new line if paragraphIndex changed (explicit breaks/newlines)
        // OR if wordsPerLine is set to 'single'
        const shouldForceNewLine =
          (prevWordData &&
            wordData &&
            wordData.paragraphIndex !== undefined &&
            wordData.paragraphIndex !== prevWordData.paragraphIndex) ||
          this.opts.wordsPerLine === 'single';

        const projectedWidth =
          currentLineWidth +
          (currentLineWidth > 0 ? spaceWidth : 0) +
          wordWidth;

        // Heuristic: only wrap if the word DOES NOT FIT anymore.
        // We allow words to fill up to the wrapWidth.
        if (
          !shouldForceNewLine &&
          (projectedWidth <= wrapWidth + 1 || currentLine.length === 0)
        ) {
          // Word fits!
          currentLine.push(wordText);
          currentLineWidth = projectedWidth;
          currentLineHeight = Math.max(currentLineHeight, wordHeight);
        } else {
          // Word doesn't fit or break forced
          if (currentLine.length > 0) {
            lines.push({
              words: currentLine,
              width: currentLineWidth,
              height: Math.max(currentLineHeight, lineHeight),
            });
          }
          currentLine = [wordText];
          currentLineWidth = wordWidth;
          currentLineHeight = wordHeight;
        }
      });

      if (currentLine.length > 0) {
        lines.push({
          words: currentLine,
          width: currentLineWidth,
          height: Math.max(currentLineHeight, lineHeight),
        });
      }

      // 6. Dimension Calculation (Logical vs Visual)
      let maxLineWidth = 0;
      let totalHeight = 0;
      lines.forEach((line) => {
        maxLineWidth = Math.max(maxLineWidth, line.width);
        totalHeight += line.height;
      });

      // logicalContentWidth is the tight width of the text lines
      const logicalContentWidth = maxLineWidth;
      const logicalContentHeight = totalHeight;

      // Determine Target Width (Selection Box & Texture Size)
      const textChanged = this._text !== this._lastProcessedText;
      this._lastProcessedText = this._text;

      const contentWidthWithPadding = logicalContentWidth + paddingX * 2;
      const contentHeightWithPadding = logicalContentHeight + paddingY * 2;

      let targetWidth = contentWidthWithPadding;
      let targetHeight = contentHeightWithPadding;

      if (this._isWidthConstrained) {
        if (textChanged) {
          // Snap to content on text change
          targetWidth = contentWidthWithPadding;
        } else {
          // Maintain manual stretch on move/sync/manual drag
          targetWidth = Math.max(contentWidthWithPadding, oldWidth);
        }
        // Cap by user defined limit if wordWrapWidth is set
        if (this.opts.wordWrapWidth > 0) {
          targetWidth = Math.min(targetWidth, this.opts.wordWrapWidth);
        }
      }

      // Sync selection box and texture dimensions EXACTLY
      const containerWidth = targetWidth;
      const containerHeight = targetHeight;

      // The area occupied by the text lines
      const textBlockHeight = logicalContentHeight;

      // 7. Positioning
      // Apply Vertical Alignment for the block as a whole
      let startY = 0;
      if (finalVAlign === 'top') {
        startY = paddingY;
      } else if (finalVAlign === 'bottom') {
        startY = containerHeight - textBlockHeight - paddingY;
      } else {
        startY = (containerHeight - textBlockHeight) / 2;
      }

      let currentY = startY;

      lines.forEach((line) => {
        // Calculate X start based on alignment within the EXACT containerWidth
        let currentX = paddingX;
        if (this.opts.align === 'center') {
          currentX = (containerWidth - line.width) / 2;
        } else if (this.opts.align === 'right') {
          currentX = containerWidth - line.width - paddingX;
        }

        line.words.forEach((wordText, wordIndex) => {
          // Position word
          wordText.x = Math.round(currentX);
          wordText.y = Math.round(currentY);

          // Advance X (add space unless it's the last word in the line)
          currentX +=
            (wordText.getLocalBounds().width || wordText.width) +
            (wordIndex < line.words.length - 1 ? spaceWidth : 0);
        });

        // Advance Y
        currentY += line.height;
      });

      // 8. Background Graphics
      // Create semi-transparent background graphics for the WHOLE visual area (including bleed)
      const bgGraphics = new Graphics();
      bgGraphics.label = 'containerBackground';

      const isTransparentBackground =
        this.opts.background === 'transparent' || !this.opts.background;

      const bgColor = isTransparentBackground
        ? 0x000000
        : parseColor(this.opts.background);

      const alpha = isTransparentBackground ? 0 : 1;
      const cornerRadius = 10;

      bgGraphics.roundRect(0, 0, containerWidth, containerHeight, cornerRadius);
      bgGraphics.fill({ color: bgColor, alpha });

      this.pixiTextContainer.addChildAt(bgGraphics, 0);

      // Reuse or recreate RenderTexture with container dimensions
      if (this.renderTexture) {
        if (
          Math.abs(this.renderTexture.width - containerWidth) > 0.5 ||
          Math.abs(this.renderTexture.height - containerHeight) > 0.5
        ) {
          this.renderTexture.destroy();
          this.renderTexture = RenderTexture.create({
            width: containerWidth,
            height: containerHeight,
          });
        }
      } else {
        this.renderTexture = RenderTexture.create({
          width: containerWidth,
          height: containerHeight,
        });
      }

      // Apply active states before rendering to avoid flicker during editing
      this.updateState(this._lastTickTime);

      // CRITICAL: Render content to the texture
      try {
        const renderer = await this.getRenderer();
        renderer.render({
          container: this.pixiTextContainer,
          target: this.renderTexture,
        });
      } catch (err) {
        Log.warn('CaptionClip: Could not render captions during refresh', err);
      }

      // 9. Dimension Tracking & Anchoring
      const isAutoWidth = !this._isWidthConstrained;
      const isAutoHeight =
        this.height === 0 ||
        this._lastContentHeight === 0 ||
        Math.abs(this.height - this._lastContentHeight) < 2;

      if (
        isAutoWidth &&
        this._initialLayoutApplied &&
        oldWidth > 0 &&
        oldHeight > 0
      ) {
        // ONLY keep the HORIZONTAL center stable if it's an AUTOMATIC change (not manual resize)
        // This prevents 'fighting' with the transformer during manual resize.
        // We compare unpadded dimensions
        const dx = targetWidth - oldWidth;

        if (
          Math.abs(dx) > 0.1 &&
          !this._isXPositionedManually &&
          this.opts.align === 'center'
        ) {
          this.left -= dx / 2;
        } else if (
          Math.abs(dx) > 0.1 &&
          !this._isXPositionedManually &&
          this.opts.align === 'right'
        ) {
          this.left -= dx;
        }
      }

      this._meta.width = logicalContentWidth;
      this._meta.height = logicalContentHeight;
      this._meta.duration = Infinity;

      // Update selection box dimensions
      this._width = containerWidth;
      this._height = containerHeight;

      // Update tracking values
      this._lastContentWidth = this._width;
      this._lastContentHeight = this._height;
      // We don't automatically update top/left here to allow user positioning,
      // unless it's initial auto-positioning.
      // In TextClip it doesn't update top/left, only width/height.
      // However, Caption has a tradition of centering at the bottom.
      // We'll keep the videoWidth/Height logic but wrap it in an isAuto check if needed.
      // Actually, let's stick to the plan of replicating TextClip's behavior which is mostly about dimensions.

      // If we're in auto mode AND haven't positioned yet, we might want to keep it centered at the bottom
      if (!this._initialLayoutApplied && (isAutoWidth || isAutoHeight)) {
        const videoWidth = this.opts.videoWidth;
        const videoHeight = this.opts.videoHeight;
        const bottomOffset = this.opts.bottomOffset;

        const newTop = videoHeight - logicalContentHeight - bottomOffset;
        const newLeft = (videoWidth - logicalContentWidth) / 2;

        this.top = newTop;
        this.left = newLeft;
        this._initialLayoutApplied = true;
      }
    } finally {
      this._refreshing = false;
      if (this._needsRefresh) {
        this.refreshCaptions();
      }
    }
  }

  private lastLoggedTime = -1;

  updateState(currentTime: number) {
    // currentTime is in microseconds (relative to clip start)
    // word.from and word.to are in milliseconds (relative to clip start)

    // Convert currentTime to milliseconds for easier comparison
    const currentTimeMs = currentTime / 1000;

    // Debug logging (only log once per second to avoid spam)
    const currentTimeSec = Math.floor(currentTime / 1e6);
    if (currentTimeSec !== this.lastLoggedTime) {
      this.lastLoggedTime = currentTimeSec;
    }

    this.wordTexts.forEach((wordText) => {
      const segmentIndex = wordText.segmentIndex;
      const word = this.opts.words[segmentIndex];

      if (!word) return;

      const isActive = currentTimeMs >= word.from && currentTimeMs < word.to;
      const hasBeenActive = currentTimeMs >= word.to;

      const isKeywordWithColor =
        word.isKeyWord && !isTransparent(this.opts.keyword);

      let textColor = 0xffffff;
      let textAlpha = 1;

      if (word.isKeyWord && isActive && isKeywordWithColor) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(
          this.opts.keyword
        ));
      } else if (isActive) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(
          this.opts.active
        ));
      } else if (
        hasBeenActive &&
        this.opts.preserveKeywordColor &&
        isKeywordWithColor
      ) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(
          this.opts.keyword
        ));
      } else if (hasBeenActive) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(
          this.opts.appeared
        ));
      } else {
        const fill = this.opts.fill;
        const fillToResolve =
          typeof fill === 'object' && fill !== null && 'type' in fill
            ? 0xffffff // Placeholder for gradient, handles elsewhere if needed
            : (fill as string | number);
        ({ color: textColor, alpha: textAlpha } = resolveColor(
          fillToResolve as any
        ));
      }

      // Aplicar color al texto
      wordText.children.forEach((child: Container) => {
        if (child.label !== 'bgRect') {
          child.tint = textColor;
          child.alpha = textAlpha;
        }
      });

      // -------- BACKGROUND --------
      const existingBg = wordText.getChildByLabel('bgRect') as Graphics | null;

      if (isActive) {
        const { color: bgColor, alpha: bgAlpha } = resolveColor(
          this.opts.activeFill,
          0xffa500
        );

        const padding = 15;
        const paddingX = 40;
        if (existingBg) existingBg.visible = false;
        const bounds = wordText.getLocalBounds();
        if (existingBg) existingBg.visible = true;
        const cornerRadius = 10;

        const bg = existingBg ?? new Graphics();

        bg.label = 'bgRect';
        bg.clear();

        bg.roundRect(
          bounds.x - paddingX / 2,
          bounds.y - padding / 2, // extraPadding is already applied to wordText.y
          bounds.width + paddingX,
          bounds.height + padding,
          cornerRadius
        );

        bg.fill({ color: bgColor, alpha: bgAlpha });
        bg.tint = 0xffffff;

        if (!existingBg) {
          wordText.addChildAt(bg, 0);
        }
      } else {
        if (existingBg) {
          wordText.removeChild(existingBg);
          existingBg.destroy();
        }
      }
    });
  }

  /**
   * Get the PixiJS Texture (RenderTexture) for optimized rendering in Studio
   */
  async getTexture(): Promise<Texture | null> {
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      return null;
    }

    const renderer = await this.getRenderer();
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // Return the texture as-is. Studio's display logic should handle its size.
    // However, the texture contains the bleed area.
    return this.renderTexture;
  }

  override async offscreenRender(
    ctx: CanvasRenderingContext2D,
    time: number
  ): Promise<{
    audio: Float32Array[];
    done: boolean;
  }> {
    const timestamp = time * this.playbackRate;
    // Store as microseconds for consistency with updateState and tick
    this._lastTickTime = timestamp * 1e6;
    this.animate(timestamp * 1e6);
    this._render(ctx); // Call BaseSprite's transform logic
    const { width: w, height: h } = this;
    const { video: imgSource, audio, done } = await this.getFrame(time);

    const outAudio = audio ?? [];

    if (done) {
      return { audio: outAudio, done: true };
    }

    if (imgSource != null) {
      ctx.save();
      // Draw the image matching our internal padding (bleed)
      // Since the texture IS ALREADY w x h (finalLogicalWidth/Height),
      // we draw it centered at the sprite's origin.
      ctx.drawImage(imgSource, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    return { audio: outAudio, done: false };
  }

  /**
   * Set an external renderer (e.g., from Studio) to avoid creating our own Pixi App
   */
  setRenderer(renderer: Application['renderer']): void {
    this.externalRenderer = renderer;
  }

  private async getRenderer(): Promise<Application['renderer']> {
    if (this.externalRenderer != null) return this.externalRenderer;
    if (this.pixiApp?.renderer == null) {
      throw new Error(
        'CaptionClip: No renderer available. Provide a renderer via setRenderer().'
      );
    }
    return this.pixiApp.renderer;
  }

  async tick(time: number): Promise<{
    video: ImageBitmap;
    state: 'success';
  }> {
    await this.ready;
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      throw new Error('CaptionClip not initialized');
    }

    this._lastTickTime = time;

    // Update internal state based on current time (in microseconds)
    this.updateState(time);

    // Render Pixi Text to render texture
    const renderer = await this.getRenderer();
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // Extract source from render texture
    const source = this.renderTexture.source?.resource?.source;
    let imageBitmap: ImageBitmap;
    if (source instanceof HTMLCanvasElement) {
      imageBitmap = await createImageBitmap(source);
    } else if (source instanceof OffscreenCanvas) {
      imageBitmap = await createImageBitmap(source);
    } else {
      // Fallback: use extract.canvas which should return a proper canvas
      const extract = renderer.extract;
      const extractedCanvas = extract.canvas(this.renderTexture);
      if (
        extractedCanvas instanceof HTMLCanvasElement ||
        extractedCanvas instanceof OffscreenCanvas
      ) {
        imageBitmap = await createImageBitmap(extractedCanvas);
      } else {
        throw new Error('Unable to extract canvas from render texture');
      }
    }

    return { video: imageBitmap, state: 'success' };
  }

  async split(_time: number): Promise<[this, this]> {
    // For caption clips, splitting just returns two clones since text doesn't change over time
    await this.ready;
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  // Effects
  addEffect(effect: {
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }) {
    this.effects.push(effect);
  }

  editEffect(
    effectId: string,
    newEffectData: Partial<{
      key: string;
      startTime: number;
      duration: number;
    }>
  ) {
    const effect = this.effects.find((e) => e.id === effectId);
    if (effect) {
      Object.assign(effect, newEffectData);
    }
  }

  removeEffect(effectId: string) {
    const effectIndex = this.effects.findIndex((e) => e.id === effectId);
    if (effectIndex !== -1) {
      this.effects.splice(effectIndex, 1);
    }
  }

  async clone() {
    await this.ready;
    // Use originalOpts when available to preserve all options
    const opts = this.originalOpts || {};
    const newClip = new Caption(this.text, opts) as this;
    this.copyStateTo(newClip);
    // Copy id and effects
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    return newClip;
  }

  destroy(): void {
    if (this.destroyed) return;
    Log.info('Caption destroy');

    // Destroy wordTexts array first
    try {
      this.wordTexts.forEach((wordText) => {
        if (wordText != null && !wordText.destroyed) {
          wordText.destroy({ children: true });
        }
      });
    } catch (err) {
      // Ignore errors during destroy
    } finally {
      this.wordTexts = [];
    }

    // Destroy pixiTextContainer first (must be destroyed before app)
    // Note: pixiTextContainer is not added to stage, but may reference app internals
    try {
      if (this.pixiTextContainer != null) {
        // Check if pixiTextContainer is still valid before destroying
        if (!this.pixiTextContainer.destroyed) {
          this.pixiTextContainer.destroy({ children: true });
        }
      }
    } catch (err) {
      // Ignore errors during destroy - object may already be destroyed
      // Swallow error to prevent crashes during cleanup
    } finally {
      this.pixiTextContainer = null;
    }

    // Destroy renderTexture (before app, as it may reference app's renderer)
    try {
      if (this.renderTexture != null) {
        if (!this.renderTexture.destroyed) {
          this.renderTexture.destroy(true);
        }
      }
    } catch (err) {
      // Ignore errors during destroy
      // Swallow error to prevent crashes during cleanup
    } finally {
      this.renderTexture = null;
    }

    // Clear external renderer reference (we don't own it, so we don't destroy it)
    this.externalRenderer = null;

    // Destroy fallback Pixi App if we created one
    if (this.pixiApp != null) {
      try {
        const app = this.pixiApp as {
          destroyed?: boolean;
          renderer?: Application['renderer'];
        };
        if (app.destroyed !== true && app.renderer != null) {
          this.pixiApp.destroy(true, {
            children: true,
            texture: true,
          });
        }
      } catch (err) {
        // Ignore errors during destroy
      } finally {
        this.pixiApp = null;
      }
    }

    super.destroy();
  }

  toJSON(main: boolean = false): CaptionJSON {
    const base = super.toJSON(main);

    // Build style object from originalOpts
    const style: TextStyleJSON = {};
    if (this.originalOpts) {
      const opts = this.originalOpts;
      if (opts.fontSize !== undefined) style.fontSize = opts.fontSize;
      if (opts.fontFamily !== undefined) style.fontFamily = opts.fontFamily;
      if (opts.fontWeight !== undefined) style.fontWeight = opts.fontWeight;
      if (opts.fontStyle !== undefined) style.fontStyle = opts.fontStyle;
      if (opts.fill !== undefined) style.color = opts.fill;
      if (opts.align !== undefined) style.align = opts.align;
      if (opts.textCase !== undefined) style.textCase = opts.textCase;
      if (opts.fontUrl !== undefined) style.fontUrl = opts.fontUrl;
      if (opts.verticalAlign !== undefined)
        style.verticalAlign = opts.verticalAlign;
      if (opts.wordWrapWidth !== undefined)
        style.wordWrapWidth = opts.wordWrapWidth;
      if (opts.wordWrap !== undefined) style.wordWrap = opts.wordWrap;

      // Handle stroke
      if (opts.stroke) {
        if (typeof opts.stroke === 'object') {
          style.stroke = {
            color: opts.stroke.color,
            width: opts.stroke.width,
          };
        } else {
          style.stroke = {
            color: opts.stroke,
            width: this.opts.strokeWidth ?? 0,
          };
        }
      }

      if (opts.dropShadow) {
        style.shadow = {
          color: (opts.dropShadow.color ?? '#000000') as string,
          alpha: opts.dropShadow.alpha ?? 0.5,
          blur: opts.dropShadow.blur ?? 4,
          distance: opts.dropShadow.distance ?? 0,
          angle: opts.dropShadow.angle ?? 0,
        };
      }
    }

    // Build new nested caption structure
    const caption: CaptionDataJSON = {};

    // Words array
    if (this.opts.words && this.opts.words.length > 0) {
      caption.words = this.opts.words;
    }

    // Colors sub-object - check both new nested and old flat structure
    const colors: CaptionColorsJSON = {};
    const colorsSource =
      this.originalOpts?.caption?.colors ?? this.originalOpts?.colors;
    if (colorsSource?.appeared !== undefined) {
      colors.appeared = colorsSource.appeared;
    }
    if (colorsSource?.active !== undefined) {
      colors.active = colorsSource.active;
    }
    if (colorsSource?.activeFill !== undefined) {
      colors.activeFill = colorsSource.activeFill;
    }
    if (colorsSource?.background !== undefined) {
      colors.background = colorsSource.background;
    }
    if (colorsSource?.keyword !== undefined) {
      colors.keyword = colorsSource.keyword;
    }

    // Add preserveKeywordColor if defined - check both new nested and old flat structure
    let preserveKeywordColor: boolean | undefined;
    if (this.originalOpts?.caption?.preserveKeywordColor !== undefined) {
      preserveKeywordColor = this.originalOpts.caption.preserveKeywordColor;
    } else if (this.originalOpts?.preserveKeywordColor !== undefined) {
      preserveKeywordColor = this.originalOpts.preserveKeywordColor;
    }

    if (Object.keys(colors).length > 0) {
      caption.colors = colors;
    }
    if (preserveKeywordColor !== undefined) {
      caption.preserveKeywordColor = preserveKeywordColor;
    }

    // Positioning sub-object - check both new nested and old flat structure
    const positioning: CaptionPositioningJSON = {};
    if (this.bottomOffset !== undefined) {
      positioning.bottomOffset = this.bottomOffset;
    }
    const videoWidth =
      this.originalOpts?.caption?.positioning?.videoWidth ??
      this.originalOpts?.videoWidth;
    const videoHeight =
      this.originalOpts?.caption?.positioning?.videoHeight ??
      this.originalOpts?.videoHeight;
    if (videoWidth !== undefined) {
      positioning.videoWidth = videoWidth;
    }
    if (videoHeight !== undefined) {
      positioning.videoHeight = videoHeight;
    }
    if (Object.keys(positioning).length > 0) {
      caption.positioning = positioning;
    }

    return {
      ...base,
      type: 'Caption',
      text: this.text,
      style,
      caption: Object.keys(caption).length > 0 ? caption : undefined,
      id: this.id,
      effects: this.effects,
      mediaId: this.mediaId,
      wordsPerLine: this.opts.wordsPerLine,
    } as CaptionJSON;
  }

  /**
   * Create a Caption instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to a Caption instance
   */
  static async fromObject(json: CaptionJSON): Promise<Caption> {
    if (json.type !== 'Caption') {
      throw new Error(`Expected Caption, got ${json.type}`);
    }

    // Support new structure (text + style) and old structure (options)
    const text = json.text || '';
    const style = json.style || {};

    // Build options object from style
    const captionOpts: ICaptionOpts = {};
    if (style.fontSize !== undefined) captionOpts.fontSize = style.fontSize;
    if (style.fontFamily !== undefined)
      captionOpts.fontFamily = style.fontFamily;
    if (style.fontWeight !== undefined)
      captionOpts.fontWeight = style.fontWeight;
    if (style.fontStyle !== undefined)
      captionOpts.fontStyle = style.fontStyle as
        | 'normal'
        | 'italic'
        | 'oblique';
    if (style.color !== undefined) captionOpts.fill = style.color;
    if (style.align !== undefined) captionOpts.align = style.align;
    if (style.textCase !== undefined) captionOpts.textCase = style.textCase;
    if (style.verticalAlign !== undefined)
      captionOpts.verticalAlign = style.verticalAlign;
    if (style.wordWrapWidth !== undefined)
      captionOpts.wordWrapWidth = style.wordWrapWidth;
    if (style.wordWrap !== undefined) captionOpts.wordWrap = style.wordWrap;

    // Handle wordsPerLine from style or root
    if (style.wordsPerLine !== undefined) {
      captionOpts.wordsPerLine = style.wordsPerLine;
    } else if (json.wordsPerLine !== undefined) {
      captionOpts.wordsPerLine = json.wordsPerLine;
    }

    // Handle fontUrl from style (new) or top-level (old)
    if (style.fontUrl !== undefined) {
      captionOpts.fontUrl = style.fontUrl;
    } else if (json.fontUrl !== undefined) {
      captionOpts.fontUrl = json.fontUrl;
    }

    // Handle mediaId
    if (json.mediaId) {
      captionOpts.mediaId = json.mediaId;
    }

    // Handle stroke
    if (style.stroke) {
      captionOpts.stroke = style.stroke.color;
      captionOpts.strokeWidth = style.stroke.width;
    }

    if (style.shadow) {
      captionOpts.dropShadow = {
        color: style.shadow.color,
        alpha: style.shadow.alpha,
        blur: style.shadow.blur,
        distance: style.shadow.distance,
        angle: style.shadow.angle,
      };
    }

    // Handle new nested structure vs old flat structure
    if (json.caption) {
      captionOpts.caption = json.caption;
    } else {
      // Old flat structure (backward compatibility)
      if (json.bottomOffset !== undefined) {
        captionOpts.bottomOffset = json.bottomOffset;
      }

      // Restore words array if present
      if (json.words !== undefined) {
        captionOpts.words = json.words;
      }

      // Restore caption-specific color properties (backward compatibility)
      if (
        json.appearedColor !== undefined ||
        json.activeColor !== undefined ||
        json.activeFillColor !== undefined ||
        json.backgroundColor !== undefined ||
        json.isKeyWordColor !== undefined
      ) {
        captionOpts.colors = {};
        if (json.appearedColor !== undefined) {
          captionOpts.colors.appeared = json.appearedColor;
        }
        if (json.activeColor !== undefined) {
          captionOpts.colors.active = json.activeColor;
        }
        if (json.activeFillColor !== undefined) {
          captionOpts.colors.activeFill = json.activeFillColor;
        }
        if (json.backgroundColor !== undefined) {
          captionOpts.colors.background = json.backgroundColor;
        }
        if (json.isKeyWordColor !== undefined) {
          captionOpts.colors.keyword = json.isKeyWordColor;
        }
      }
      if (json.preservedColorKeyWord !== undefined) {
        captionOpts.preserveKeywordColor = json.preservedColorKeyWord;
      }

      // Restore layout properties
      if (json.videoWidth !== undefined) {
        captionOpts.videoWidth = json.videoWidth;
      }
      if (json.videoHeight !== undefined) {
        captionOpts.videoHeight = json.videoHeight;
      }
    }

    // Set initialLayoutApplied to true to preserve loaded left/top
    captionOpts.initialLayoutApplied = true;

    const clip = new Caption(text, captionOpts);

    // Apply properties
    clip.left = json.left;
    clip.top = json.top;
    clip.width = json.width;
    clip.height = json.height;
    clip.angle = json.angle;

    clip.display.from = json.display.from;
    clip.display.to = json.display.to;
    clip.duration = json.duration;
    clip.playbackRate = json.playbackRate;

    clip.zIndex = json.zIndex;
    clip.opacity = json.opacity;
    clip.flip = json.flip;

    clip.wordsPerLine = json.wordsPerLine ?? 'multiple';

    // Apply animation if present
    if (json.animation) {
      clip.setAnimation(json.animation.keyFrames, json.animation.opts);
    }

    // Restore id and effects if present
    if (json.id) {
      clip.id = json.id;
    }
    if (json.effects) {
      clip.effects = json.effects;
    }

    await clip.ready;
    return clip;
  }

  override getVisibleHandles(): Array<
    'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb' | 'rot'
  > {
    return ['mr', 'mb', 'br', 'rot'];
  }
}
