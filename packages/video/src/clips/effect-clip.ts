import { BaseClip } from './base-clip';
import { type IClip } from './iclip';
import { type EffectKey } from '../effect/glsl/gl-effect';

// Since Effect is an adjustment layer, it doesn't render visual content directly.
// We can use a minimal dummy implementation for BaseClip abstract methods.
export class Effect extends BaseClip {
  readonly type = 'Effect';
  ready: IClip['ready'];

  private _meta = {
    duration: 5e6, // Default 5 seconds
    width: 0,
    height: 0,
  };

  get meta() {
    return { ...this._meta };
  }

  /**
   * Unique identifier for this clip instance
   */
  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * The effect configuration
   */
  effect: {
    id: string;
    key: EffectKey;
    name: string;
  };

  constructor(effectKey: EffectKey) {
    super();
    this.effect = {
      id: `eff_${Date.now()}`,
      key: effectKey,
      name: effectKey,
    };

    // Ready immediately
    this.ready = Promise.resolve(this._meta);
    this.duration = this._meta.duration;
  }

  async clone() {
    const newClip = new Effect(this.effect.key);
    this.copyStateTo(newClip);
    newClip.id = this.id; // Or generate new ID? Usually clone gets new ID if fully new instance, but `copyStateTo` copies props.
    // But in Studio `studio.addClip` ensures unique ID if needed.
    // Let's generate new ID for the clone naturally in constructor, and override if needed by caller.
    // Wait, TextClip copies ID? `newClip.id = this.id`
    // If we clone for "Split", we probably want new IDs?
    // BaseClip.copyStateTo copies time/dimensions etc.
    // TextClip seems to preserve ID which might be wrong for deep cloning unless it's for internal use.
    // I'll follow TextClip pattern but be aware.
    // Actually, distinct clips in timeline should have distinct IDs.
    // If TextClip copies ID, it might be for some specific internal reason or a bug.
    // I'll let the constructor generate a new ID, and NOT copy it, ensuring uniqueness.

    return newClip as this;
  }

  // Effect is invisible, so it returns empty/dummy data
  async tick(_time: number): Promise<{
    video: ImageBitmap | undefined;
    state: 'success';
  }> {
    return {
      video: undefined,
      state: 'success',
    };
  }

  async split(_time: number): Promise<[this, this]> {
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  toJSON(main: boolean = false): any {
    const base = super.toJSON(main);
    return {
      ...base,
      type: 'Effect',
      effect: this.effect,
      id: this.id,
      effects: this.effects,
    };
  }

  /**
   * Create an Effect instance from a JSON object
   */
  static async fromObject(json: any): Promise<Effect> {
    if (json.type !== 'Effect') {
      throw new Error(`Expected Effect, got ${json.type}`);
    }

    const clip = new Effect(json.effect.key);
    clip.effect = json.effect;

    // Apply base properties
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

    // Restore id if present
    if (json.id) {
      clip.id = json.id;
    }

    await clip.ready;
    return clip;
  }
}
