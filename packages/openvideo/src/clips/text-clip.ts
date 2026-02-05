import {
  type Application,
  SplitBitmapText,
  TextStyle,
  type LineJoin,
  RenderTexture,
  Color,
  FillGradient,
  type Texture,
  Container,
  Graphics,
  CanvasTextMetrics,
} from "pixi.js";
import { Log } from "../utils/log";
import { BaseClip } from "./base-clip";
import type { IClip } from "./iclip";
import type { TextJSON, TextStyleJSON } from "../json-serialization";
import { parseColor, resolveColor } from "../utils/color";
import type { BaseSpriteEvents } from "../sprite/base-sprite";

export interface ITextOpts {
  /**
   * Font size in pixels
   * @default 40
   */
  fontSize?: number;
  /**
   * Font family
   * @default 'Roboto'
   */
  fontFamily?: string;
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
   * Font URL for custom fonts
   */
  fontUrl?: string;
  /**
   * Text color (hex string, color name, or gradient object)
   * @default '#ffffff'
   */
  fill?:
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
  /**
   * Stroke color (hex string or color name) or stroke object with advanced options
   */
  stroke?:
    | string
    | number
    | {
        color: string | number;
        width: number;
        join?: "miter" | "round" | "bevel";
        cap?: "butt" | "round" | "square";
        miterLimit?: number;
      };
  /**
   * Stroke width in pixels (used when stroke is a simple color)
   * @default 0
   */
  strokeWidth?: number;
  /**
   * Text alignment ('left', 'center', 'right')
   * @default 'left'
   */
  align?: "left" | "center" | "right";
  /**
   * Alias for align to match UI property naming
   */
  textAlign?: "left" | "center" | "right";
  /**
   * Vertical alignment ('top', 'center', 'bottom')
   * @default 'top'
   */
  verticalAlign?:
    | "top"
    | "center"
    | "bottom"
    | "underline"
    | "overline"
    | "strikethrough";
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
  textCase?: "none" | "uppercase" | "lowercase" | "title";
  /**
   * Text decoration ('none', 'underline', 'line-through', 'overline')
   * @default 'none'
   */
  textDecoration?: "none" | "underline" | "line-through" | "overline";
  /**
   * Words per line mode ('single' or 'multiple')
   * @default 'multiple'
   */
  wordsPerLine?: "single" | "multiple";
}

export interface ITextEvents extends BaseSpriteEvents {
  propsChange: Partial<
    {
      left: number;
      top: number;
      width: number;
      height: number;
      angle: number;
      zIndex: number;
      opacity: number;
      volume: number;
      text: string;
      style: any;
    } & ITextOpts
  >;
}

/**
 * Text clip using PixiJS Text for rendering
 *
 * @example
 * const textClip = new Text('Hello World', {
 *   fontSize: 48,
 *   fill: '#ffffff',
 *   stroke: '#000000',
 *   strokeWidth: 2,
 *   dropShadow: {
 *     color: '#000000',
 *     alpha: 0.5,
 *     blur: 4,
 *     distance: 2,
 *   },
 * });
 * textClip.duration = 5e6; // 5 seconds
 */
export class Text extends BaseClip<ITextEvents> {
  readonly type = "Text";
  ready: IClip["ready"];

  private _meta = {
    duration: Infinity,
    width: 0,
    height: 0,
  };

  get meta() {
    return { ...this._meta };
  }

  // Override width/height to trigger refreshText when resized by transformer
  // Use getters from BaseSprite but override setters
  override get width(): number {
    return (this as any)._width;
  }

  override set width(v: number) {
    if (Math.abs(this.width - v) < 0.1) return;
    (this as any)._width = v;
    this.refreshText().then(() => {
      this.emit("propsChange", { width: v });
    });
  }

  override get height(): number {
    return (this as any)._height;
  }

  override set height(v: number) {
    if (Math.abs(this.height - v) < 0.1) return;
    (this as any)._height = v;
    this.refreshText().then(() => {
      this.emit("propsChange", { height: v });
    });
  }

  private _lastContentWidth = 0;
  private _lastContentHeight = 0;

  private _text: string = "";

  /**
   * Text content (hybrid JSON structure)
   */
  get text(): string {
    return this._text;
  }

  set text(v: string) {
    if (this._text === v) return;
    this._text = v;
    // Only refresh if already initialized
    if (this.originalOpts && this.textStyle) {
      this.refreshText().then(() => {
        this.emit("propsChange", { text: v });
      });
    }
  }

  /**
   * Text styling (hybrid JSON structure)
   * Provides direct access to styling properties
   */
  /**
   * Text styling (hybrid JSON structure)
   * Provides direct access to styling properties
   */
  override get style(): any {
    return {
      fontSize: this.originalOpts.fontSize,
      fontFamily: this.originalOpts.fontFamily,
      fontWeight: this.originalOpts.fontWeight,
      fontStyle: this.originalOpts.fontStyle,
      fill: this.originalOpts.fill,
      align: this.originalOpts.align,
      stroke: this.originalOpts.stroke
        ? typeof this.originalOpts.stroke === "object"
          ? {
              color: this.originalOpts.stroke.color,
              width: this.originalOpts.stroke.width,
              join: this.originalOpts.stroke.join,
              cap: this.originalOpts.stroke.cap,
              miterLimit: this.originalOpts.stroke.miterLimit,
            }
          : {
              color: this.originalOpts.stroke,
              width: this.originalOpts.strokeWidth ?? 0,
            }
        : undefined,
      dropShadow: this.originalOpts.dropShadow
        ? {
            color: this.originalOpts.dropShadow.color ?? "#000000",
            alpha: this.originalOpts.dropShadow.alpha ?? 0.5,
            blur: this.originalOpts.dropShadow.blur ?? 4,
            distance: this.originalOpts.dropShadow.distance ?? 0,
            angle: this.originalOpts.dropShadow.angle ?? 0,
          }
        : undefined,
      wordWrap: this.originalOpts.wordWrap,
      wordWrapWidth: this.originalOpts.wordWrapWidth,
      lineHeight: this.originalOpts.lineHeight,
      letterSpacing: this.originalOpts.letterSpacing,
      textCase: this.originalOpts.textCase,
      textDecoration: this.originalOpts.textDecoration,
    };
  }

  override set style(opts: Partial<ITextOpts>) {
    this.updateStyle(opts);
  }

  /**
   * Text alignment proxy for compatibility with UI
   */
  get textAlign(): "left" | "center" | "right" {
    return (
      this.originalOpts.align || (this.originalOpts as any).textAlign || "left"
    );
  }

  set textAlign(v: "left" | "center" | "right") {
    this.updateStyle({ align: v });
  }

  /**
   * Vertical alignment or decoration proxy
   */
  get verticalAlign(): string {
    return (
      (this.originalOpts as any).verticalAlign ||
      this.originalOpts.textDecoration ||
      "top"
    );
  }

  set verticalAlign(v: string) {
    if (
      ["underline", "overline", "strikethrough", "line-through"].includes(v)
    ) {
      this.updateStyle({
        textDecoration: v === "strikethrough" ? "line-through" : (v as any),
      } as any);
      // Also store as verticalAlign for UI state persistence
      (this.originalOpts as any).verticalAlign = v;
    } else {
      this.updateStyle({ verticalAlign: v } as any);
    }
  }

  /**
   * Text case proxy
   */
  get textCase(): string {
    return this.originalOpts.textCase || "none";
  }

  set textCase(v: "none" | "uppercase" | "lowercase" | "title") {
    this.updateStyle({ textCase: v });
  }

  private pixiTextContainer: Container | null = null;
  private wordTexts: SplitBitmapText[] = [];
  private textStyle: TextStyle;
  private textStyleBase: TextStyle;
  private renderTexture: RenderTexture | null = null;
  // External renderer (preferred) - provided via constructor or setRenderer()
  // If not provided, Text will create its own minimal renderer as fallback
  private externalRenderer: Application["renderer"] | null = null;
  private pixiApp: Application | null = null; // Fallback renderer
  // Store original options for serialization to avoid accessing TextStyle properties
  private originalOpts: ITextOpts;

  /**
   * Unique identifier for this clip instance
   */
  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  constructor(
    text: string,
    opts: ITextOpts = {},
    renderer?: Application["renderer"],
  ) {
    super();
    // Store original options for serialization (shallow copy is fine since options are primitives)
    this.originalOpts = { ...opts };
    this.text = text;
    // Store external renderer if provided (e.g., from Studio)
    this.externalRenderer = renderer ?? null;

    // Create PixiJS TextStyle from options
    // Build style object conditionally to avoid passing undefined values
    const styleOptions = this.createStyleFromOpts(opts);
    const {
      wordWrap,
      wordWrapWidth,
      lineHeight,
      letterSpacing,
      fill,
      ...rest
    } = styleOptions;

    const style = new TextStyle(styleOptions);
    const styleBase = new TextStyle(rest);

    this.textStyle = style;
    this.textStyleBase = styleBase;

    // Initialize Pixi Text to measure dimensions
    // Initialize Pixi Text to measure dimensions
    this.ready = (async () => {
      await this.refreshText();

      // Constructor specific: check if we need to set duration from meta
      const meta = { ...this._meta };
      return meta;
    })();
  }

  /**
   * Set an external renderer (e.g., from Studio) to avoid creating our own Pixi App
   * This is an optimization for Studio preview
   * Can be called before ready() completes
   */
  setRenderer(renderer: Application["renderer"]): void {
    this.externalRenderer = renderer;
  }

  /**
   * Get the renderer for rendering text to RenderTexture
   * Creates a minimal renderer as fallback if no external renderer is provided
   */
  private async getRenderer(): Promise<Application["renderer"]> {
    // Use external renderer if available (preferred)
    if (this.externalRenderer != null) {
      return this.externalRenderer;
    }

    if (this.pixiApp?.renderer == null) {
      throw new Error(
        "TextClip: Failed to create renderer. Please provide a renderer via constructor or setRenderer() method.",
      );
    }

    return this.pixiApp.renderer;
  }

  /**
   * Get the PixiJS Texture (RenderTexture) for optimized rendering in Studio
   * This avoids ImageBitmap → Canvas → Texture conversion
   *
   * @returns The RenderTexture containing the rendered text, or null if not ready
   */
  async getTexture(): Promise<Texture | null> {
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      return null;
    }

    // Get renderer (creates fallback if needed)
    const renderer = await this.getRenderer();

    // Render the text to the render texture
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // RenderTexture extends Texture, so we can return it directly
    return this.renderTexture;
  }

  async tick(_time: number): Promise<{
    video: ImageBitmap;
    state: "success";
  }> {
    await this.ready;

    if (this.pixiTextContainer == null || this.renderTexture == null) {
      throw new Error("Text not initialized");
    }

    // Validate RenderTexture dimensions before rendering
    if (this.renderTexture.width <= 0 || this.renderTexture.height <= 0) {
      throw new Error(
        `Invalid RenderTexture dimensions: ${this.renderTexture.width}x${this.renderTexture.height}`,
      );
    }

    // Get renderer (creates fallback if needed)
    const renderer = await this.getRenderer();

    // Render Pixi Text to render texture
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // Extract pixels and create ImageBitmap
    // Get the texture's source (which should be a canvas)
    // Use Texture.source instead of baseTexture (PixiJS v8.0.0+)
    const source = this.renderTexture.source?.resource?.source;

    let imageBitmap: ImageBitmap;
    if (source instanceof HTMLCanvasElement) {
      // Use the canvas directly
      imageBitmap = await createImageBitmap(source);
    } else if (source instanceof OffscreenCanvas) {
      // Use OffscreenCanvas directly
      imageBitmap = await createImageBitmap(source);
    } else {
      // Fallback: use extract.canvas which should return a proper canvas
      // Get renderer for extract (creates fallback if needed)
      const rendererForExtract = await this.getRenderer();
      const extract = rendererForExtract.extract;
      const extractedCanvas = extract.canvas(this.renderTexture);
      // Convert ICanvas to HTMLCanvasElement or OffscreenCanvas
      if (
        extractedCanvas instanceof HTMLCanvasElement ||
        extractedCanvas instanceof OffscreenCanvas
      ) {
        imageBitmap = await createImageBitmap(extractedCanvas);
      } else {
        // Last resort: create a new canvas and draw the texture
        const width = this.renderTexture.width;
        const height = this.renderTexture.height;
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (ctx == null) {
          throw new Error("Failed to create 2d context for fallback rendering");
        }
        // We can't easily extract pixels, so throw an error
        throw new Error("Unable to extract canvas from render texture");
      }
    }

    return {
      video: imageBitmap,
      state: "success",
    };
  }

  async split(_time: number): Promise<[this, this]> {
    // For text clips, splitting just returns two clones since text doesn't change over time
    await this.ready;
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  override animate(time: number): void {
    super.animate(time, this.pixiTextContainer);
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
    }>,
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
    // Use originalOpts when available (especially for gradients and complex objects)
    // Fall back to extracting from TextStyle for simple properties
    const style = this.textStyle;
    const originalOpts = this.originalOpts || {};

    // Helper to convert color to number
    const colorToNumber = (color: any): number | undefined => {
      if (color === undefined || color === null) return undefined;
      if (typeof color === "number") return color;
      if (color instanceof Color) return color.toNumber();
      return undefined;
    };

    // Start with original options (preserves gradients and complex objects)
    const opts: ITextOpts = {
      fontSize: originalOpts.fontSize ?? style.fontSize,
      fontFamily:
        originalOpts.fontFamily ??
        (Array.isArray(style.fontFamily)
          ? style.fontFamily[0]
          : typeof style.fontFamily === "string"
            ? style.fontFamily
            : "Roboto"),
      fontWeight: originalOpts.fontWeight ?? style.fontWeight,
      fontStyle: originalOpts.fontStyle ?? style.fontStyle,
      align:
        originalOpts.align ??
        (style.align === "justify"
          ? "left"
          : (style.align as "left" | "center" | "right")),
      textCase: originalOpts.textCase,
      textDecoration: originalOpts.textDecoration,
    };

    // Handle fill - prefer originalOpts to preserve gradients
    if (
      originalOpts.fill &&
      typeof originalOpts.fill === "object" &&
      "type" in originalOpts.fill &&
      originalOpts.fill.type === "gradient"
    ) {
      opts.fill = originalOpts.fill;
    } else {
      // Extract simple color fill from style
      const fillColor = colorToNumber(style.fill);
      opts.fill = fillColor ?? 0xffffff;
    }

    // Handle stroke - prefer originalOpts to preserve advanced stroke options
    if (
      originalOpts.stroke &&
      typeof originalOpts.stroke === "object" &&
      "color" in originalOpts.stroke
    ) {
      opts.stroke = originalOpts.stroke;
    } else {
      // Extract simple stroke color from style
      const strokeColor = colorToNumber(style.stroke);
      if (strokeColor !== undefined) {
        opts.stroke = strokeColor;
        opts.strokeWidth =
          originalOpts.strokeWidth ?? (style as any).strokeThickness ?? 0;
      } else {
        opts.strokeWidth =
          originalOpts.strokeWidth ?? (style as any).strokeThickness ?? 0;
      }
    }

    // Extract dropShadow if present
    if (originalOpts.dropShadow) {
      opts.dropShadow = originalOpts.dropShadow;
    } else if (style.dropShadow) {
      const ds = style.dropShadow;
      const shadowColor = colorToNumber(ds.color);
      if (shadowColor !== undefined) {
        opts.dropShadow = {
          color: shadowColor,
          alpha: ds.alpha,
          blur: ds.blur,
          angle: ds.angle,
          distance: ds.distance,
        };
      }
    }

    // Extract other properties
    if (originalOpts.wordWrap !== undefined) {
      opts.wordWrap = originalOpts.wordWrap;
      opts.wordWrapWidth = originalOpts.wordWrapWidth;
    } else if (style.wordWrap) {
      opts.wordWrap = style.wordWrap;
      opts.wordWrapWidth = style.wordWrapWidth;
    }
    if (originalOpts.lineHeight !== undefined) {
      opts.lineHeight = originalOpts.lineHeight;
    } else if (style.lineHeight !== undefined) {
      // CRITICAL: style.lineHeight is absolute pixels, but ITextOpts.lineHeight is a multiplier
      // Convert back to multiplier by dividing by fontSize
      const fontSize = opts.fontSize ?? style.fontSize ?? 40;
      opts.lineHeight = style.lineHeight / fontSize;
    }
    if (originalOpts.letterSpacing !== undefined) {
      opts.letterSpacing = originalOpts.letterSpacing;
    } else if (style.letterSpacing !== undefined) {
      opts.letterSpacing = style.letterSpacing;
    }

    const newClip = new Text(this.text, opts) as this;
    await newClip.ready;
    this.copyStateTo(newClip);
    // Copy id and effects
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    return newClip;
  }

  /**
   * Update text styling options and refresh the texture
   * This is used for dynamic updates like resizing with text reflow
   */
  async updateStyle(opts: Partial<ITextOpts>): Promise<void> {
    // 1. Flatten style object if it exists (allows compatibility with editor's updates)
    let processedOpts = { ...opts };
    if ((opts as any).style) {
      processedOpts = { ...processedOpts, ...(opts as any).style };
      delete (processedOpts as any).style;
    }

    // 2. Update originalOpts with new values
    this.originalOpts = { ...this.originalOpts, ...processedOpts };

    // 3. Create new style options
    const styleOptions = this.createStyleFromOpts(this.originalOpts);
    const {
      wordWrap,
      wordWrapWidth,
      lineHeight,
      letterSpacing,
      fill,
      ...rest
    } = styleOptions;
    const styleBase = new TextStyle(rest);
    // 3. Update TextStyle
    const style = new TextStyle(styleOptions);
    this.textStyle = style;
    this.textStyleBase = styleBase;

    // 4. Refresh text and texture
    await this.refreshText();
    this.emit("propsChange", opts);
  }

  /**
   * Refresh the internal Pixi Text and RenderTexture
   * Calculates dimensions based on text bounds and wrapping options
   */
  private async refreshText(): Promise<void> {
    const style = this.textStyle;
    const styleBase = this.textStyleBase;

    let textToRender = this.text;
    const textCase = this.originalOpts.textCase;

    if (textCase === "uppercase") {
      textToRender = textToRender.toUpperCase();
    } else if (textCase === "lowercase") {
      textToRender = textToRender.toLowerCase();
    } else if (textCase === "title") {
      textToRender = textToRender.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
      );
    }

    if (typeof document !== "undefined") {
      await document.fonts.ready;
    }

    if (!this.pixiTextContainer) {
      this.pixiTextContainer = new Container();
    } else {
      this.pixiTextContainer.removeChildren();
    }

    // Split text into words for SplitBitmapText
    const words = textToRender.split(/\s+/).filter((v) => v.length > 0);

    // Cleanup old word texts
    this.wordTexts.forEach((w) => w.destroy());
    this.wordTexts = words.map((wordStr) => {
      const wordText = new SplitBitmapText({
        text: wordStr,
        style: this.textStyle,
      });
      this.pixiTextContainer!.addChild(wordText);
      return wordText;
    });

    // 4. Calculate Layout (Lines) - mostly following CaptionClip logic
    const decoration =
      this.originalOpts.textDecoration ||
      (this.originalOpts as any).verticalAlign;
    const lineHeightMultiplier = this.originalOpts.lineHeight ?? 1;
    const fontSize = style.fontSize ?? 40;
    const lineHeight = fontSize * lineHeightMultiplier;

    // Heuristics for space width
    const metrics = CanvasTextMetrics.measureText(" ", styleBase as TextStyle);

    const tempSpace = new SplitBitmapText({
      text: " ",
      style: this.textStyleBase,
    });
    const spaceWidth = Math.ceil(
      tempSpace.getLocalBounds().width || tempSpace.width || metrics.width,
    );
    tempSpace.destroy();

    const wrapWidth =
      style.wordWrap && style.wordWrapWidth > 0 ? style.wordWrapWidth : 1e5;

    const lines: { words: SplitBitmapText[]; width: number; height: number }[] =
      [];
    let currentLine: SplitBitmapText[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;

    this.wordTexts.forEach((wordText) => {
      const bounds = wordText.getLocalBounds();
      const wordWidth = Math.ceil(bounds.width || wordText.width);
      const wordHeight = Math.ceil(bounds.height || wordText.height);

      const projectedWidth =
        currentLineWidth + (currentLineWidth > 0 ? spaceWidth : 0) + wordWidth;

      if (projectedWidth <= wrapWidth || currentLine.length === 0) {
        currentLine.push(wordText);
        currentLineWidth = projectedWidth;
        currentLineHeight = Math.max(currentLineHeight, wordHeight);
      } else {
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

    // 5. Dimension Calculation
    let maxLineWidth = 0;
    let totalHeight = 0;
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, line.width);
      totalHeight += line.height;
    });

    const textWidth = maxLineWidth;
    const textHeight = totalHeight;

    let contentWidth = textWidth;
    if (style.wordWrap && style.wordWrapWidth > 0) {
      contentWidth = Math.max(contentWidth, style.wordWrapWidth);
    }
    const contentHeight = textHeight;

    const isAutoWidth =
      this.width === 0 || Math.abs(this.width - this._lastContentWidth) < 0.1;
    const isAutoHeight =
      this.height === 0 ||
      Math.abs(this.height - this._lastContentHeight) < 0.1;

    const containerWidth = isAutoWidth
      ? contentWidth
      : Math.max(contentWidth, this.width || 0);
    const containerHeight = isAutoHeight
      ? contentHeight
      : Math.max(contentHeight, this.height || 0);

    this._lastContentWidth = contentWidth;
    this._lastContentHeight = contentHeight;

    // 6. Positioning words within the container
    let startY = 0;
    const finalVAlign = (this.originalOpts as any).verticalAlign || "top";
    if (finalVAlign === "center") {
      startY = (containerHeight - textHeight) / 2;
    } else if (finalVAlign === "bottom") {
      startY = containerHeight - textHeight;
    }

    let currentY = startY;
    const graphics = new Graphics();
    let hasDecoration = false;

    lines.forEach((line) => {
      let currentX = 0;
      const finalAlign = this.textAlign;
      if (finalAlign === "center") {
        currentX = (containerWidth - line.width) / 2;
      } else if (finalAlign === "right") {
        currentX = containerWidth - line.width;
      }

      const lineXStart = currentX;

      line.words.forEach((wordText, wordIndex) => {
        wordText.x = Math.round(currentX);
        wordText.y = Math.round(currentY);
        currentX +=
          (wordText.getLocalBounds().width || wordText.width) +
          (wordIndex < line.words.length - 1 ? spaceWidth : 0);
      });

      // Handle Text Decoration
      if (
        decoration &&
        decoration !== "none" &&
        ["underline", "overline", "strikethrough", "line-through"].includes(
          decoration,
        )
      ) {
        hasDecoration = true;
        const finalDecoration =
          decoration === "strikethrough" ? "line-through" : decoration;
        const lineThickness = Math.max(1, fontSize / 12);

        // Determine Line Color
        let lineColor = 0xffffff;
        if (typeof style.fill === "number") {
          lineColor = style.fill;
        } else if (
          style.fill &&
          typeof style.fill === "object" &&
          "fill" in style.fill
        ) {
          lineColor = 0xffffff;
        }

        let yOffset = 0;
        if (finalDecoration === "underline") {
          yOffset = line.height;
        } else if (finalDecoration === "line-through") {
          yOffset = line.height / 2;
        } else if (finalDecoration === "overline") {
          yOffset = 0;
        }

        graphics.rect(
          lineXStart,
          currentY + yOffset,
          line.width,
          lineThickness,
        );
        graphics.fill(lineColor);
      }

      currentY += line.height;
    });

    if (hasDecoration) {
      this.pixiTextContainer.addChild(graphics);
    }

    // Reuse or resize render texture efficiently
    if (this.renderTexture) {
      this.renderTexture.destroy();
    }
    this.renderTexture = RenderTexture.create({
      width: containerWidth,
      height: containerHeight,
    });

    // Update clip dimensions
    this._meta.width = containerWidth;
    this._meta.height = containerHeight;

    (this as any)._width = containerWidth;
    (this as any)._height = containerHeight;

    if (this.duration === 0 && this._meta.duration !== Infinity) {
      this.duration = this._meta.duration;
      this.display.to = this.display.from + this.duration;
    }
  }

  /**
   * Helper to create PixiJS TextStyle options from Text options
   */
  private createStyleFromOpts(opts: ITextOpts): any {
    const fontSize = opts.fontSize ?? 40;
    const lineHeightMultiplier = opts.lineHeight ?? 1;

    const styleOptions: any = {
      fontSize,
      fontFamily: opts.fontFamily ?? "Roboto",
      fontWeight: (opts.fontWeight as any) ?? "normal",
      fontStyle: opts.fontStyle ?? "normal",
      align: opts.align ?? "left",
      wordWrap: opts.wordWrap ?? false,
      wordWrapWidth: opts.wordWrapWidth ?? 100,
      lineHeight: fontSize * lineHeightMultiplier,
      letterSpacing: opts.letterSpacing ?? 0,
    };

    // Handle fill - can be color or gradient
    if (
      opts.fill &&
      typeof opts.fill === "object" &&
      opts.fill.type === "gradient"
    ) {
      // Create gradient fill
      const gradient = new FillGradient(
        opts.fill.x0,
        opts.fill.y0,
        opts.fill.x1,
        opts.fill.y1,
      );
      opts.fill.colors.forEach(({ ratio, color }) => {
        const colorNumber =
          typeof color === "number" ? color : (parseColor(color) ?? 0xffffff);
        gradient.addColorStop(ratio, colorNumber);
      });
      styleOptions.fill = { fill: gradient };
    } else {
      // Simple color fill
      const { color: fillColor, alpha: fillAlpha } = resolveColor(
        opts.fill as string,
      );
      styleOptions.fill = fillColor;
      if (fillAlpha < 1) {
        styleOptions.fillAlpha = fillAlpha;
      }
    }

    // Handle stroke - can be color or advanced stroke object
    if (
      opts.stroke &&
      typeof opts.stroke === "object" &&
      "color" in opts.stroke
    ) {
      // Advanced stroke object
      const strokeColor = parseColor(opts.stroke.color);
      if (strokeColor !== undefined) {
        styleOptions.stroke = {
          color: strokeColor,
          width: opts.stroke.width,
          join: opts.stroke.join as LineJoin,
          cap: opts.stroke.cap,
          miterLimit: opts.stroke.miterLimit,
        };
      }
    } else {
      // Simple stroke color
      const strokeColor = parseColor(opts.stroke);
      const strokeWidth = opts.strokeWidth ?? 0;
      if (strokeColor !== undefined && strokeWidth > 0) {
        styleOptions.stroke = { color: strokeColor, width: strokeWidth };
      } else if (opts.strokeWidth && opts.strokeWidth > 0) {
        // If strokeWidth is provided but no color, use black as default
        styleOptions.stroke = { color: 0x000000, width: opts.strokeWidth };
      }
    }

    // Only add dropShadow if provided
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

    return styleOptions;
  }

  destroy(): void {
    if (this.destroyed) return;
    Log.info("Text destroy");

    // Destroy pixiTextContainer first (must be destroyed before app)
    try {
      if (this.pixiTextContainer != null) {
        if (!this.pixiTextContainer.destroyed) {
          this.pixiTextContainer.destroy({ children: true });
        }
      }
    } catch (err) {
      // Ignore errors during destroy
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

  toJSON(main: boolean = false): TextJSON {
    const base = super.toJSON(main);

    // Build style object from originalOpts
    const style: TextStyleJSON = {};
    if (this.originalOpts.fontSize !== undefined)
      style.fontSize = this.originalOpts.fontSize;
    if (this.originalOpts.fontFamily !== undefined)
      style.fontFamily = this.originalOpts.fontFamily;
    if (this.originalOpts.fontWeight !== undefined)
      style.fontWeight = this.originalOpts.fontWeight as any;
    if (this.originalOpts.fontStyle !== undefined)
      style.fontStyle = this.originalOpts.fontStyle;
    if (this.originalOpts.fill !== undefined)
      style.color = this.originalOpts.fill as any;
    if (this.originalOpts.align !== undefined)
      style.align = this.originalOpts.align;
    if (this.originalOpts.wordWrap !== undefined)
      style.wordWrap = this.originalOpts.wordWrap;
    if (this.originalOpts.wordWrapWidth !== undefined)
      style.wordWrapWidth = this.originalOpts.wordWrapWidth;
    if (this.originalOpts.lineHeight !== undefined)
      style.lineHeight = this.originalOpts.lineHeight;
    if (this.originalOpts.letterSpacing !== undefined)
      style.letterSpacing = this.originalOpts.letterSpacing;

    // Handle stroke
    if (this.originalOpts.stroke) {
      if (typeof this.originalOpts.stroke === "object") {
        style.stroke = {
          color: this.originalOpts.stroke.color as any,
          width: this.originalOpts.stroke.width,
          join: this.originalOpts.stroke.join,
          cap: (this.originalOpts.stroke as any).cap, // cap might be missing from ITextOpts definition but present in object
          miterLimit: (this.originalOpts.stroke as any).miterLimit,
        };
      } else {
        style.stroke = {
          color: this.originalOpts.stroke as any,
          width: this.originalOpts.strokeWidth ?? 0,
        };
      }
    }

    if (this.originalOpts.dropShadow) {
      style.shadow = {
        color: (this.originalOpts.dropShadow.color ?? "#000000") as string,
        alpha: this.originalOpts.dropShadow.alpha ?? 0.5,
        blur: this.originalOpts.dropShadow.blur ?? 4,
        distance: this.originalOpts.dropShadow.distance ?? 0,
        angle: this.originalOpts.dropShadow.angle ?? 0,
      };
    }

    return {
      ...base,
      type: "Text",
      text: this.text,
      style,
      id: this.id,
      effects: this.effects,
    } as TextJSON;
  }

  /**
   * Create a Text instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to a Text instance
   */
  static async fromObject(json: TextJSON): Promise<Text> {
    if (json.type !== "Text") {
      throw new Error(`Expected Text, got ${json.type}`);
    }

    // Support new structure (text + style) and old structure (options)
    const text = json.text || "";
    const style = json.style || {};

    // Build options object from style
    const textClipOpts: ITextOpts = {};
    if (style.fontSize !== undefined) textClipOpts.fontSize = style.fontSize;
    if (style.fontFamily !== undefined)
      textClipOpts.fontFamily = style.fontFamily;
    if (style.fontWeight !== undefined)
      textClipOpts.fontWeight = style.fontWeight as any;
    if (style.fontStyle !== undefined) textClipOpts.fontStyle = style.fontStyle;
    if (style.color !== undefined) textClipOpts.fill = style.color;
    if (style.align !== undefined) textClipOpts.align = style.align;
    if (style.wordWrap !== undefined) textClipOpts.wordWrap = style.wordWrap;
    if (style.wordWrapWidth !== undefined)
      textClipOpts.wordWrapWidth = style.wordWrapWidth;
    if (style.lineHeight !== undefined)
      textClipOpts.lineHeight = style.lineHeight;
    if (style.letterSpacing !== undefined)
      textClipOpts.letterSpacing = style.letterSpacing;

    // Handle stroke
    if (style.stroke) {
      if (
        style.stroke.join ||
        style.stroke.cap ||
        style.stroke.miterLimit !== undefined
      ) {
        textClipOpts.stroke = {
          color: style.stroke.color,
          width: style.stroke.width,
          join: style.stroke.join,
          cap: style.stroke.cap,
          miterLimit: style.stroke.miterLimit,
        };
      } else {
        textClipOpts.stroke = style.stroke.color;
        textClipOpts.strokeWidth = style.stroke.width;
      }
    }

    if (style.shadow) {
      textClipOpts.dropShadow = {
        color: style.shadow.color,
        alpha: style.shadow.alpha,
        blur: style.shadow.blur,
        distance: style.shadow.distance,
        angle: style.shadow.angle,
      };
    }

    const clip = new Text(text, textClipOpts);

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

  /**
   * Override handle visibility for text clips
   * Text clips should only show: mr (mid-right), mb (mid-bottom), br (bottom-right), and rot (rotation)
   * This allows resizing width and height independently while preventing corner handles that might distort text
   */
  override getVisibleHandles(): Array<
    "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb" | "rot"
  > {
    return ["mr", "mb", "br", "rot"];
  }
}
