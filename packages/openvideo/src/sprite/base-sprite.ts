import EventEmitter from "../event-emitter";
import {
  IAnimation,
  AnimationTransform,
  animationRegistry,
} from "../animation";
type IRectBaseProps = any;
interface IAnimationOpts {
  duration: number;
  delay?: number;
  iterCount?: number;
}

type TAnimateProps = IRectBaseProps & { opacity: number };

export type TAnimationKeyFrame = Array<[number, Partial<TAnimateProps>]>;

type TKeyFrameOpts = Partial<
  Record<`${number}%` | "from" | "to", Partial<TAnimateProps>>
>;

export interface BaseSpriteEvents {
  propsChange: Partial<{
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
    zIndex: number;
    opacity: number;
    volume: number;
  }>;
  [key: string]: any;
  [key: symbol]: any;
}

/**
 * Sprite base class
 *
 * @see {@link OffscreenSprite}
 */
export abstract class BaseSprite<
  T extends BaseSpriteEvents = BaseSpriteEvents
> extends EventEmitter<T> {
  /**
   * Unique identifier for the sprite/clip
   */
  id = "";
  /**
   * Name of the sprite/clip
   */
  name = "";

  /**
   * Control display time range of clips, commonly used in editing scenario timeline (track) module
   * from: start time offset in microseconds
   * to: end time (from + duration) in microseconds
   */
  display = {
    from: 0,
    to: 0,
  };

  /**
   * Duration of the clip in microseconds
   * Cannot exceed the duration of the referenced {@link IClip}
   */
  duration = 0;

  /**
   * Playback rate of current clip, 1 means normal playback
   * **Note**
   *    1. When setting playbackRate, duration must be actively corrected
   *    2. Audio uses the simplest interpolation algorithm to change rate, so changing rate will cause pitch variation, for custom algorithm please use {@link Video.tickInterceptor} to implement
   */
  playbackRate = 1;
  /**
   * Trim range of the source media in microseconds
   * from: start time in microseconds
   * to: end time in microseconds
   */
  trim = {
    from: 0,
    to: 0,
  };

  constructor() {
    super();
  }

  // Spatial properties
  protected _left = 0;
  /**
   * Left position (x coordinate)
   */
  get left(): number {
    return this._left;
  }
  set left(v: number) {
    const changed = this._left !== v;
    this._left = v;
    if (changed) this.emit("propsChange", { left: v });
  }

  protected _top = 0;
  /**
   * Top position (y coordinate)
   */
  get top(): number {
    return this._top;
  }
  set top(v: number) {
    const changed = this._top !== v;
    this._top = v;
    if (changed) this.emit("propsChange", { top: v });
  }

  protected _width = 0;
  /**
   * Width
   */
  get width(): number {
    return this._width;
  }
  set width(v: number) {
    const changed = this._width !== v;
    this._width = v;
    if (changed) this.emit("propsChange", { width: v });
  }

  protected _height = 0;
  /**
   * Height
   */
  get height(): number {
    return this._height;
  }
  set height(v: number) {
    const changed = this._height !== v;
    this._height = v;
    if (changed) this.emit("propsChange", { height: v });
  }

  private _angle = 0;
  /**
   * Rotation angle in degrees
   */
  get angle(): number {
    return this._angle;
  }
  set angle(v: number) {
    const changed = this._angle !== v;
    this._angle = v;
    if (changed) this.emit("propsChange", { angle: v });
  }

  /**
   * Center point calculated from position and dimensions
   */
  get center(): { x: number; y: number } {
    return {
      x: this.left + this.width / 2,
      y: this.top + this.height / 2,
    };
  }

  private _zIndex = 0;
  get zIndex(): number {
    return this._zIndex;
  }

  /**
   * Control layering relationship between clips, clips with smaller zIndex will be occluded
   */
  set zIndex(v: number) {
    const changed = this._zIndex !== v;
    this._zIndex = v;
    if (changed) this.emit("propsChange", { zIndex: v });
  }

  private _opacity = 1;
  /**
   * Opacity (0.0 to 1.0)
   */
  get opacity(): number {
    return this._opacity;
  }
  set opacity(v: number) {
    const changed = this._opacity !== v;
    this._opacity = v;
    if (changed) this.emit("propsChange", { opacity: v } as any);
  }

  private _volume = 1;
  /**
   * Audio volume level (0.0 to 1.0)
   */
  get volume(): number {
    return this._volume;
  }
  set volume(v: number) {
    const changed = this._volume !== v;
    this._volume = v;
    if (changed) this.emit("propsChange", { volume: v } as any);
  }

  /**
   * Flip clip horizontally or vertically
   */
  flip: "horizontal" | "vertical" | null = null;

  effects: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
    targets?: number[];
  }> = [];

  /**
   * Styling properties (e.g., stroke, dropShadow, borderRadius)
   * This is a generic object to hold visual styles across different clip types
   */
  protected _style: any = {};

  get style(): any {
    return this._style;
  }

  set style(v: any) {
    this._style = v;
  }

  private animatKeyFrame: TAnimationKeyFrame | null = null;

  private animatOpts: Required<IAnimationOpts> | null = null;

  /**
   * List of active animations
   */
  public animations: IAnimation[] = [];

  /**
   * Current transform offsets/multipliers from animations
   * Resets every frame in animate()
   */
  public renderTransform: AnimationTransform = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 1,
    opacity: 1,
    angle: 0,
  };

  /**
   * @see {@link IClip.ready}
   * For clips, this should be Promise<IClipMeta>, but for BaseSprite it's just Promise<void>
   */
  protected _render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    const { center } = this;
    ctx.setTransform(
      // Horizontal scale, skew
      this.flip === "horizontal" ? -1 : 1,
      0,
      // Vertical skew, scale
      0,
      this.flip === "vertical" ? -1 : 1,
      // Coordinate origin offset x y
      center.x,
      center.y
    );

    ctx.globalAlpha = this.opacity * (this.renderTransform.opacity ?? 1);

    const x = this.renderTransform.x ?? 0;
    const y = this.renderTransform.y ?? 0;
    const angleOffset = this.renderTransform.angle ?? 0;
    const scale = this.renderTransform.scale ?? 1;

    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(((this.flip == null ? 1 : -1) * (angleOffset * Math.PI)) / 180);
  }

  /**
   * Add animation to clip, usage reference CSS animation
   *
   * @example
   * sprite.setAnimation(
   *   {
   *     '0%': { x: 0, y: 0 },
   *     '25%': { x: 1200, y: 680 },
   *     '50%': { x: 1200, y: 0 },
   *     '75%': { x: 0, y: 680 },
   *     '100%': { x: 0, y: 0 },
   *   },
   *   { duration: 4e6, iterCount: 1 },
   * );
   *
   */
  setAnimation(keyFrame: TKeyFrameOpts, opts: IAnimationOpts): void {
    this.animatKeyFrame = Object.entries(keyFrame).map(([k, val]) => {
      const numK = { from: 0, to: 100 }[k] ?? Number(k.slice(0, -1));
      if (isNaN(numK) || numK > 100 || numK < 0) {
        throw Error("keyFrame must between 0~100");
      }
      return [numK / 100, val];
    }) as TAnimationKeyFrame;
    this.animatOpts = Object.assign({}, this.animatOpts, {
      duration: opts.duration,
      delay: opts.delay ?? 0,
      iterCount: opts.iterCount ?? Infinity,
    });
  }

  /**
   * If current sprite has animation set, set sprite's animation properties to state at specified time
   */
  animate(time: number, target?: any): void {
    // Reset render transforms
    this.renderTransform = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      opacity: 1,
      angle: 0,
    };

    // 1. Process new modular animations
    for (const anim of this.animations) {
      const transform = anim.getTransform(time);
      if (transform.x !== undefined) this.renderTransform.x! += transform.x;
      if (transform.y !== undefined) this.renderTransform.y! += transform.y;
      if (transform.width !== undefined)
        this.renderTransform.width! += transform.width;
      if (transform.height !== undefined)
        this.renderTransform.height! += transform.height;
      if (transform.angle !== undefined)
        this.renderTransform.angle! += transform.angle;
      if (transform.scale !== undefined)
        this.renderTransform.scale! *= transform.scale;
      if (transform.opacity !== undefined)
        this.renderTransform.opacity! *= transform.opacity;

      if (target && anim.apply) {
        anim.apply(target, time);
      }
    }

    // 2. Process legacy keyframe animation (for backward compatibility)
    if (
      this.animatKeyFrame == null ||
      this.animatOpts == null ||
      time < this.animatOpts.delay
    )
      return;

    const updateProps = linearTimeFn(
      time,
      this.animatKeyFrame,
      this.animatOpts
    );
    // Only update properties that are actually in the animation keyframes
    // This ensures manual property settings (like opacity) are preserved if not animated
    for (const k in updateProps) {
      switch (k) {
        case "opacity":
          this.opacity = updateProps[k] as number;
          break;
        case "x":
          this.left = updateProps[k] as number;
          break;
        case "y":
          this.top = updateProps[k] as number;
          break;
        case "w":
          this.width = updateProps[k] as number;
          break;
        case "h":
          this.height = updateProps[k] as number;
          break;
        case "angle":
          this.angle = updateProps[k] as number;
          break;
      }
    }
  }

  /**
   * Add a modular animation to the clip
   * @param name Preset name or 'keyframes'
   * @param opts Animation options (duration, delay, etc.)
   * @param params Preset-specific parameters or KeyframeData
   */
  addAnimation(name: string, opts: any, params?: any): string {
    const anim = animationRegistry.create(name, opts, params);
    this.animations.push(anim);
    return anim.id;
  }

  /**
   * Remove an animation by ID
   */
  removeAnimation(id: string): void {
    this.animations = this.animations.filter((a) => a.id !== id);
  }

  /**
   * Clear all modular animations
   */
  clearAnimations(): void {
    this.animations = [];
  }

  /**
   * Update an existing animation by ID
   * @param id Animation ID to update
   * @param type Animation type (preset name or 'keyframes')
   * @param opts Animation options
   * @param params Preset-specific parameters or KeyframeData
   */
  updateAnimation(id: string, type: string, opts: any, params?: any): void {
    const index = this.animations.findIndex((a) => a.id === id);
    if (index === -1) return;

    const newAnim = animationRegistry.create(type, { ...opts, id }, params);
    this.animations[index] = newAnim;
  }

  /**
   * Copy current sprite's properties to target
   *
   * Used for cloning or copying state between {@link OffscreenSprite} instances
   */
  copyStateTo<T extends BaseSprite>(target: T) {
    target.animatKeyFrame = this.animatKeyFrame;
    target.animatOpts = this.animatOpts;
    target.zIndex = this.zIndex;
    target.opacity = this.opacity;
    target.volume = this.volume;
    target.flip = this.flip;
    target.left = this.left;
    target.top = this.top;
    target.width = this.width;
    target.height = this.height;
    target.angle = this.angle;
    target.display = { ...this.display };
    target.duration = this.duration;
    target.playbackRate = this.playbackRate;
    target.trim = { ...this.trim };
    target.style = JSON.parse(JSON.stringify(this.style || {}));
    target.animations = [...this.animations];
    // Copy src if target is a BaseClip
    if ("src" in this && "src" in target) {
      (target as any).src = (this as any).src;
    }
  }

  /**
   * Update multiple properties at once
   */
  update(updates: Partial<this>) {
    Object.assign(this, updates);
    this.emit("propsChange", updates as any);
  }

  protected destroy() {
    this.all.clear();
  }
}

export function linearTimeFn(
  time: number,
  keyFrame: TAnimationKeyFrame,
  opts: Required<IAnimationOpts>
): Partial<TAnimateProps> {
  const offsetTime = time - opts.delay;
  const t = offsetTime % opts.duration;
  const progress =
    offsetTime / opts.duration >= opts.iterCount || offsetTime === opts.duration
      ? 1
      : t / opts.duration;

  const idx = keyFrame.findIndex((it) => it[0] >= progress);
  if (idx === -1) return {};

  const startState = keyFrame[idx - 1];
  const nextState = keyFrame[idx];
  const nextFrame = nextState[1];
  if (startState == null) return nextFrame;
  const startFrame = startState[1];

  const result: Partial<TAnimateProps> = {};
  // Progress between two Frame states
  const stateProcess =
    (progress - startState[0]) / (nextState[0] - startState[0]);
  for (const prop in nextFrame) {
    if (!Object.hasOwn(nextFrame, prop)) continue;
    // Skip symbol keys - only process string keys
    if (typeof prop !== "string") continue;
    const p = prop as Extract<keyof TAnimateProps, string>;
    if (startFrame[p] == null) continue;
    result[p] = (nextFrame[p] - startFrame[p]) * stateProcess + startFrame[p];
  }

  return result;
}
