import { Log } from '../utils/log';
import { BaseClip } from './base-clip';
import type { IClip } from './iclip';
import type { CaptionJSON, TextStyleJSON } from '../json-serialization';
import {
  type Application,
  SplitBitmapText,
  TextStyle,
  RenderTexture,
  FillGradient,
  type Texture,
  Container,
  Graphics,
  CanvasTextMetrics,
} from 'pixi.js';
import { isTransparent, parseColor, resolveColor } from '../utils/color';

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
  fontWeight?: string;
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
  wordWrap?: boolean;
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
export class Caption extends BaseClip implements IClip {
  readonly type = 'Caption';
  ready: IClip['ready'];

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
  override get width(): number {
    return (this as any)._width;
  }

  override set width(v: number) {
    if (this.width === v) return;
    (this as any)._width = v;
    this.refreshCaptions();
    this.emit('propsChange', { width: v });
  }

  override get height(): number {
    return (this as any)._height;
  }

  override set height(v: number) {
    if (this.height === v) return;
    (this as any)._height = v;
    this.refreshCaptions();
    this.emit('propsChange', { height: v });
  }

  private _lastContentWidth = 0;
  private _lastContentHeight = 0;
  private _initialLayoutApplied = false;

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

    // Sync with words
    const wordTexts = v
      .trim()
      .split(/\s+/)
      .filter((t) => t !== '');
    const existingWords = this.opts?.words || [];

    if (wordTexts.length === existingWords.length && wordTexts.length > 0) {
      // Preserve timing and metadata
      this.opts.words = existingWords.map((word, i) => ({
        ...word,
        text: wordTexts[i],
      }));
    } else if (wordTexts.length > 0) {
      // Redistribute duration equally
      const totalDuration =
        this.duration > 0 && this.duration !== Infinity
          ? this.duration
          : 1000000; // default 1s if unknown
      const wordDuration = totalDuration / wordTexts.length;
      this.opts.words = wordTexts.map((text, i) => ({
        text,
        from: i * wordDuration,
        to: (i + 1) * wordDuration,
        isKeyWord: false,
      }));
    } else {
      this.opts.words = [];
    }

    // Sync originalOpts
    if (this.originalOpts) {
      if (this.originalOpts.caption) {
        this.originalOpts.caption.words = this.opts.words;
      } else {
        (this.originalOpts as any).words = this.opts.words;
      }
    }

    // Only refresh if already initialized
    if (this.originalOpts && this.textStyle) {
      this.refreshCaptions().then(() => {
        this.emit('propsChange', { text: v } as any);
      });
    }
  }

  // Text styling (hybrid JSON structure)
  // Provides direct access to styling properties
  override get style() {
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

  override set style(v: any) {
    this.updateStyle(v);
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

  get fontWeight(): string {
    return this.opts.fontWeight;
  }

  set fontWeight(v: string) {
    this.updateStyle({ fontWeight: v });
  }

  get fontStyle(): string {
    return this.opts.fontStyle;
  }

  set fontStyle(v: string) {
    this.updateStyle({ fontStyle: v });
  }

  get fill(): any {
    return this.opts.fill;
  }

  set fill(v: any) {
    this.updateStyle({ fill: v });
  }

  get align(): 'left' | 'center' | 'right' {
    return this.opts.align;
  }

  set align(v: 'left' | 'center' | 'right') {
    this.updateStyle({ align: v });
  }

  get stroke(): any {
    return this.originalOpts?.stroke;
  }

  set stroke(v: any) {
    this.updateStyle({ stroke: v });
  }

  get strokeWidth(): number {
    return this.opts.strokeWidth;
  }

  set strokeWidth(v: number) {
    this.updateStyle({ strokeWidth: v });
  }

  get dropShadow(): any {
    return this.originalOpts?.dropShadow;
  }

  set dropShadow(v: any) {
    this.updateStyle({ dropShadow: v });
  }

  get caption(): any {
    return this.originalOpts?.caption;
  }

  set caption(v: any) {
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
  set words(v: any[]) {
    this.opts.words = v;
    if (this.originalOpts) {
      if (this.originalOpts.caption) {
        this.originalOpts.caption.words = v;
      } else {
        this.originalOpts.words = v;
      }
    }
    // Update text property to match words
    const newText = v
      .map((w) => w.text)
      .filter((t) => t && t.trim() !== '')
      .join(' ');

    if (this._text !== newText) {
      this.text = newText; // This will trigger text setter, sync, refresh, and emit
    } else {
      // Text is same, but words metadata/timing might have changed
      this.refreshCaptions().then(() => {
        this.emit('propsChange', { words: v } as any);
      });
    }
  }

  // Internal opts with defaults applied - use 'any' for complex union types
  private opts!: {
    fontSize: number;
    fontFamily: string;
    fontUrl: string;
    fontWeight: string;
    fontStyle: string;
    fill: any; // Can be string, number, or gradient object
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
  };
  // Pixi rendering fields (to mirror TextClip)
  private pixiTextContainer: Container | null = null;
  private renderTexture: RenderTexture | null = null;
  private wordTexts: SplitBitmapText[] = [];
  private extraPadding = 0;
  private textStyle!: TextStyle;
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
      fontStyle: opts.fontStyle ?? 'normal',
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
    };

    // Now set the text, which will use this.opts.words if they exist
    this.text = text;

    // Create PixiJS TextStyle from options (same pattern as TextClip)
    // Build style object conditionally to avoid passing undefined values
    const styleOptions: any = {
      fontSize: this.opts.fontSize,
      fontFamily: this.opts.fontFamily,
      fontWeight: this.opts.fontWeight,
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
    const isTransparent = (color?: any) => color === 'transparent';

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
            styleOptions.stroke.join = opts.stroke.join;
          }
        }
      }
    } else {
      if (!isTransparent(opts.stroke)) {
        const strokeColor = parseColor(opts.stroke);
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

    const style = new TextStyle(styleOptions);
    this.textStyle = style;

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
    if (opts.fontStyle !== undefined) this.opts.fontStyle = opts.fontStyle;
    if (opts.fill !== undefined) this.opts.fill = opts.fill;
    if (opts.align !== undefined) this.opts.align = opts.align;
    if (opts.letterSpacing !== undefined)
      this.opts.letterSpacing = opts.letterSpacing;
    if (opts.lineHeight !== undefined) this.opts.lineHeight = opts.lineHeight;
    if (opts.textCase !== undefined) this.opts.textCase = opts.textCase;

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
    const styleOptions: any = {
      fontSize: this.opts.fontSize,
      fontFamily: this.opts.fontFamily,
      fontWeight: this.opts.fontWeight,
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
      this.opts.fill.colors.forEach(({ ratio, color }: any) => {
        const colorNumber =
          typeof color === 'number' ? color : (parseColor(color) ?? 0xffffff);
        gradient.addColorStop(ratio, colorNumber);
      });
      styleOptions.fill = { fill: gradient };
    } else {
      const fillColor =
        typeof this.opts.fill === 'string' || typeof this.opts.fill === 'number'
          ? parseColor(this.opts.fill)
          : undefined;
      styleOptions.fill = fillColor ?? 0xffffff;
    }

    // Handle stroke
    if (opts.stroke !== undefined || opts.strokeWidth !== undefined) {
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
      } else {
        const strokeColor = parseColor(this.originalOpts.stroke as any);
        const strokeWidth =
          opts.strokeWidth ?? this.originalOpts.strokeWidth ?? 0;
        if (strokeColor !== undefined) {
          styleOptions.stroke = { color: strokeColor, width: strokeWidth };
        } else if (strokeWidth > 0) {
          styleOptions.stroke = { color: 0x000000, width: strokeWidth };
        }
      }
    }

    // Handle dropShadow
    const dropShadow = opts.dropShadow ?? this.originalOpts.dropShadow;
    if (dropShadow) {
      const shadowColor = parseColor(dropShadow.color);
      if (shadowColor !== undefined) {
        styleOptions.dropShadow = {
          color: shadowColor,
          alpha: dropShadow.alpha ?? 0.5,
          blur: dropShadow.blur ?? 4,
          angle: dropShadow.angle ?? Math.PI / 6,
          distance: dropShadow.distance ?? 2,
        };
      }
    }

    this.textStyle = new TextStyle(styleOptions);

    // 4. Refresh captions
    await this.refreshCaptions();
    this.emit('propsChange', opts as any);
  }

  private async refreshCaptions() {
    if (!this.pixiTextContainer) {
      this.pixiTextContainer = new Container();
    } else {
      // Clear existing children
      this.pixiTextContainer.removeChildren();
    }

    const style = this.textStyle;

    let currentX = 0;
    let maxHeight = 0;

    const textCase = this.opts.textCase;
    const metrics = CanvasTextMetrics.measureText(' ', this.textStyle);

    this.wordTexts = this.opts.words.map((word) => {
      let textToRender = word.text;

      // Handle empty words by creating an empty container to keep indices aligned
      if (!textToRender || textToRender.trim() === '') {
        const empty = new Container();
        empty.label = 'emptyWord';
        this.pixiTextContainer!.addChild(empty);
        return empty as any;
      }

      if (textCase === 'uppercase') {
        textToRender = textToRender.toUpperCase();
      } else if (textCase === 'lowercase') {
        textToRender = textToRender.toLowerCase();
      } else if (textCase === 'title') {
        textToRender = textToRender.replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        );
      }

      const wordText = new SplitBitmapText({
        text: textToRender,
        style,
      });

      wordText.x = currentX;
      wordText.y = 0;

      const bounds = wordText.getLocalBounds();
      const wordWidth = Math.ceil(bounds.width || wordText.width);
      const wordHeight = Math.ceil(bounds.height || wordText.height);

      maxHeight = Math.max(maxHeight, wordHeight);

      currentX += wordWidth + metrics.width;
      // totalTextWidth = currentX - metrics.width;

      this.pixiTextContainer!.addChild(wordText);

      const initialColor = parseColor(this.opts.fill);
      wordText.tint = initialColor ?? 0xffffff;

      return wordText;
    });

    // 4. Calculate Layout (Lines)
    const padding = 15;
    const spaceWidth = metrics.width;
    const lineHeight = this.opts.lineHeight * (this.opts.fontSize || 30); // Approximate line height

    // Determine wrapping width
    // Check if we are in "manual" mode (width set by user/transformer) or have explicit wordWrap
    let wrapWidth = Infinity;
    const isManualWidth =
      this.width > 0 && Math.abs(this.width - this._lastContentWidth) > 1;

    if (this.opts.wordWrap && this.opts.wordWrapWidth > 0) {
      wrapWidth = this.opts.wordWrapWidth - padding * 2;
    } else if (isManualWidth) {
      wrapWidth = this.width - padding * 2;
    }

    const lines: {
      words: SplitBitmapText[];
      width: number;
      height: number;
    }[] = [];
    let currentLine: SplitBitmapText[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;

    this.wordTexts.forEach((wordText) => {
      // Calculate word dimensions
      const bounds = wordText.getLocalBounds();
      const wordWidth = Math.ceil(bounds.width || wordText.width);
      const wordHeight = Math.ceil(bounds.height || wordText.height);

      // Check if word fits in current line
      const projectedWidth =
        currentLineWidth + (currentLineWidth > 0 ? spaceWidth : 0) + wordWidth;

      if (projectedWidth <= wrapWidth || currentLine.length === 0) {
        // Fits (or first word), add to current line
        currentLine.push(wordText);
        currentLineWidth = projectedWidth;
        currentLineHeight = Math.max(currentLineHeight, wordHeight);
      } else {
        // Doesn't fit, start new line
        lines.push({
          words: currentLine,
          width: currentLineWidth,
          height: currentLineHeight,
        });
        currentLine = [wordText];
        currentLineWidth = wordWidth;
        currentLineHeight = wordHeight;
      }
    });

    // Add last line
    if (currentLine.length > 0) {
      lines.push({
        words: currentLine,
        width: currentLineWidth,
        height: currentLineHeight,
      });
    }

    // 5. Dimension Calculation
    let maxLineWidth = 0;
    let totalHeight = 0;
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, line.width);
      totalHeight += line.height;
    });
    // Add spacing between lines if multiple lines
    if (lines.length > 1) {
      // Usually line height includes spacing, but we calculated explicit height.
      // Let's use standard line spacing (leading).
      // Simply stepping Y by lineHeight is cleaner than summing arbitrary word heights.
      // But for mixed fonts... let's stick to standard line height stepping?
      // Actually, let's use the explicit lineHeight logic for Y stepping.
      totalHeight = lines.length * lineHeight;
    } else {
      // Single line, use measured height if possible, or lineHeight
      totalHeight = Math.max(totalHeight, lineHeight);
    }

    const contentWidth = maxLineWidth + padding * 2;
    const contentHeight = totalHeight + padding * 2;

    const isAutoWidth = !isManualWidth;
    const isAutoHeight =
      this.height === 0 ||
      Math.abs(this.height - this._lastContentHeight) < 0.1;

    const containerWidth = isAutoWidth
      ? contentWidth
      : Math.max(contentWidth, this.width || 0);

    // Height should always match content for Captions to avoid "stuck" large heights
    const containerHeight = contentHeight;

    // Save content-only dimensions
    this._lastContentWidth = contentWidth;
    this._lastContentHeight = contentHeight;

    // 6. Positioning
    // Apply Vertical Alignment for the block as a whole
    let startY = 0;
    const finalVAlign = (this.originalOpts as any).verticalAlign || 'center';
    if (finalVAlign === 'top') {
      startY = padding;
    } else if (finalVAlign === 'bottom') {
      startY = containerHeight - contentHeight + padding;
    } else {
      startY = (containerHeight - contentHeight) / 2 + padding;
    }

    let currentY = startY;

    lines.forEach((line) => {
      // Calculate X start based on alignment
      let currentX = padding;
      if (this.opts.align === 'center') {
        // Center within the container width (or content width if they match)
        // NOTE: Should we center relative to `containerWidth` or `contentWidth`?
        // Standard is relative to containerWidth.
        currentX = (containerWidth - line.width) / 2;
      } else if (this.opts.align === 'right') {
        currentX = containerWidth - padding - line.width;
      } else {
        // Left align
        currentX = padding;
      }

      line.words.forEach((word) => {
        const bounds = word.getLocalBounds();
        const wordWidth = Math.ceil(bounds.width || word.width);

        word.x = currentX;
        word.y = currentY; // Top-aligned relative to line

        // Advance X
        currentX += wordWidth + spaceWidth;
      });

      // Advance Y
      currentY += lineHeight;
    });

    // 7. Background Graphics
    // Calculate global offset for the background block based on alignment
    let bgX = 0;
    if (this.opts.align === 'center') {
      bgX = (containerWidth - contentWidth) / 2;
    } else if (this.opts.align === 'right') {
      bgX = containerWidth - contentWidth;
    }

    let bgY = 0;
    if (finalVAlign === 'top') {
      bgY = 0;
    } else if (finalVAlign === 'bottom') {
      bgY = containerHeight - contentHeight;
    } else {
      bgY = (containerHeight - contentHeight) / 2;
    }

    // Create semi-transparent background graphics for the WHOLE container
    const bgGraphics = new Graphics();
    bgGraphics.label = 'containerBackground';

    const isTransparentBackground =
      this.opts.background === 'transparent' || !this.opts.background;

    const bgColor = isTransparentBackground
      ? 0x000000
      : parseColor(this.opts.background);

    const alpha = isTransparentBackground ? 0 : 1;
    const cornerRadius = 10;

    bgGraphics.roundRect(bgX, bgY, contentWidth, contentHeight, cornerRadius);
    bgGraphics.fill({ color: bgColor, alpha });

    this.pixiTextContainer.addChildAt(bgGraphics, 0);

    // Reuse or recreate RenderTexture with container dimensions
    if (this.renderTexture) {
      if (
        this.renderTexture.width !== containerWidth ||
        this.renderTexture.height !== containerHeight
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

    this._meta.width = containerWidth;
    this._meta.height = containerHeight;
    this._meta.duration = Infinity;

    // Update clip dimensions for BaseSprite
    (this as any)._width = containerWidth;
    (this as any)._height = containerHeight;
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

      const newTop = videoHeight - containerHeight - bottomOffset;
      const newLeft = (videoWidth - containerWidth) / 2;

      this.top = newTop;
      this.left = newLeft;
      this._initialLayoutApplied = true;
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

    this.opts.words.forEach((word, index) => {
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
        ({ color: textColor, alpha: textAlpha } = resolveColor(this.opts.fill));
      }

      const wordText = this.wordTexts[index];

      if (!wordText) {
        console.warn(
          `¡WARNING: SplitBitmapText was not found for word "${word.text}"!`
        );
        return;
      }

      // Aplicar color al texto
      wordText.children.forEach((child: any) => {
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

        const padding = 10;
        if (existingBg) existingBg.visible = false;
        const bounds = wordText.getLocalBounds();
        if (existingBg) existingBg.visible = true;
        const cornerRadius = 16;

        const bg = existingBg ?? new Graphics();

        bg.label = 'bgRect';
        bg.clear();

        bg.roundRect(
          bounds.x - padding / 2,
          bounds.y - padding / 2 + this.extraPadding,
          bounds.width + padding,
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
   * This avoids ImageBitmap → Canvas → Texture conversion
   *
   * @returns The RenderTexture containing the rendered caption, or null if not ready
   */
  async getTexture(): Promise<Texture | null> {
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      console.log(
        '[CaptionClip] getTexture returning null - container or texture not ready'
      );
      return null;
    }

    // Get renderer (use external renderer if available)
    try {
      const renderer = await this.getRenderer();

      // Update caption highlighting based on current time
      // Note: We need the current time from the Studio, but for now we'll render the current state
      // The Studio will call updateState separately before calling getTexture

      // Render the caption to the render texture
      renderer.render({
        container: this.pixiTextContainer,
        target: this.renderTexture,
      });

      // RenderTexture extends Texture, so we can return it directly
      return this.renderTexture;
    } catch (error) {
      console.error('[CaptionClip] Error in getTexture:', error);
      return null;
    }
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
        const anyContainer = this.pixiTextContainer as any;
        // Only destroy if it's not already destroyed
        if (anyContainer.destroyed !== true) {
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
        const anyTexture = this.renderTexture as any;
        // Only destroy if not already destroyed
        if (anyTexture.destroyed !== true) {
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
        const anyApp = this.pixiApp as any;
        if (anyApp.destroyed !== true && anyApp.renderer != null) {
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
      if (opts.fontFamily !== undefined)
        style.fontFamily = opts.fontFamily as any;
      if (opts.fontWeight !== undefined)
        style.fontWeight = opts.fontWeight as any;
      if (opts.fontStyle !== undefined) style.fontStyle = opts.fontStyle;
      if (opts.fill !== undefined) style.color = opts.fill as any;
      if (opts.align !== undefined) style.align = opts.align;
      if (opts.textCase !== undefined) style.textCase = opts.textCase;
      if (opts.fontUrl !== undefined) style.fontUrl = opts.fontUrl;

      // Handle stroke
      if (opts.stroke) {
        if (typeof opts.stroke === 'object') {
          style.stroke = {
            color: opts.stroke.color as any,
            width: opts.stroke.width,
          };
        } else {
          style.stroke = {
            color: opts.stroke as any,
            width: opts.strokeWidth ?? 0,
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
    const caption: any = {};

    // Words array
    if (this.opts.words && this.opts.words.length > 0) {
      caption.words = this.opts.words;
    }

    // Colors sub-object - check both new nested and old flat structure
    const colors: any = {};
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
    const positioning: any = {};
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
      captionOpts.fontWeight = style.fontWeight as any;
    if (style.fontStyle !== undefined) captionOpts.fontStyle = style.fontStyle;
    if (style.color !== undefined) captionOpts.fill = style.color;
    if (style.align !== undefined) captionOpts.align = style.align;
    if (style.textCase !== undefined) captionOpts.textCase = style.textCase;

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

    // Apply animation if present
    if (json.animation) {
      clip.setAnimation(json.animation.keyFrames, json.animation.opts);
    }

    // Restore id and effects if present
    if ((json as any).id) {
      clip.id = (json as any).id;
    }
    if ((json as any).effects) {
      clip.effects = (json as any).effects;
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
