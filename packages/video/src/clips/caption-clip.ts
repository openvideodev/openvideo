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

  /**
   * Caption text content (hybrid JSON structure)
   */
  text: string;

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
    this.text = v
      .map((w) => w.text)
      .filter((t) => t && t.trim() !== '')
      .join(' ');

    this.refreshCaptions().then(() => {
      this.emit('propsChange', {} as any);
    });
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
    this.text = text;
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
    let totalWidth = 0;

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
      totalWidth = currentX - metrics.width;

      this.pixiTextContainer!.addChild(wordText);

      const initialColor = parseColor(this.opts.fill);
      wordText.tint = initialColor ?? 0xffffff;

      return wordText;
    });

    const width = totalWidth;
    const height = maxHeight;

    // Create semi-transparent background container
    const bgGraphics = new Graphics();
    bgGraphics.label = 'containerBackground';

    const isTransparentBackground =
      this.opts.background === 'transparent' || !this.opts.background;

    const bgColor = isTransparentBackground
      ? 0x000000
      : parseColor(this.opts.background);

    const alpha = isTransparentBackground ? 0 : 1;
    const padding = 15;
    const cornerRadius = 10;

    bgGraphics.roundRect(
      0,
      0,
      width + padding * 2,
      height + padding * 2,
      cornerRadius
    );
    bgGraphics.fill({ color: bgColor, alpha });

    this.wordTexts.forEach((w) => {
      this.extraPadding = 0;
      w.pivot.y = 0;
      w.pivot.x = 0;
      w.y = padding - this.extraPadding;

      w.x += padding;
    });

    this.pixiTextContainer.addChildAt(bgGraphics, 0);

    const finalWidth = width + padding * 2;
    const finalHeight = height + padding * 2;

    // Reuse or recreate RenderTexture
    if (this.renderTexture) {
      this.renderTexture.resize(finalWidth, finalHeight);
    } else {
      this.renderTexture = RenderTexture.create({
        width: finalWidth,
        height: finalHeight,
      });
    }

    // CRITICAL: Render content to the texture BEFORE updating clip dimensions.
    // This ensures that when PixiSpriteRenderer updates, it uses the correct texture size for scaling.
    try {
      const renderer = await this.getRenderer();
      renderer.render({
        container: this.pixiTextContainer,
        target: this.renderTexture,
      });
    } catch (err) {
      Log.warn('CaptionClip: Could not render captions during refresh', err);
    }

    this._meta.width = finalWidth;
    this._meta.height = finalHeight;
    this._meta.duration = Infinity;

    const videoWidth = this.opts.videoWidth;
    const videoHeight = this.opts.videoHeight;
    const bottomOffset = this.opts.bottomOffset;

    // Calculate new position
    const newTop = videoHeight - finalHeight - bottomOffset;
    const newLeft = (videoWidth - finalWidth) / 2;

    // Always sync width and height with content to prevent stretching
    // Use atomic update to avoid multiple propsChange events and redundant renders
    this.update({
      width: finalWidth,
      height: finalHeight,
      top: newTop,
      left: newLeft,
    } as any);
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
}
