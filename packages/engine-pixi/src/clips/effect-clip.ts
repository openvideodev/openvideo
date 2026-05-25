import { BaseClip } from "./base-clip";
import { type IClip } from "./iclip";
import { type EffectKey } from "../effect/glsl/gl-effect";
import { camelToWords } from "../utils/effect";

// Since Effect is an adjustment layer, it doesn't render visual content directly.
// We can use a minimal dummy implementation for BaseClip abstract methods.

export class Effect extends BaseClip {
  readonly type = "Effect";
  ready: IClip["ready"];

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
   * The effect key
   */
  effectKey: EffectKey;

  /**
   * Effect parameters / values
   */
  values: Record<string, any> = {};

  constructor(effectKey: EffectKey) {
    super();
    this.effectKey = effectKey;
    this.name = camelToWords(effectKey);

    // Ready immediately
    this.ready = Promise.resolve(this._meta);
    this.duration = this._meta.duration;
  }

  async clone() {
    const newClip = new Effect(this.effectKey);
    this.copyStateTo(newClip);
    newClip.values = { ...this.values };
    return newClip as this;
  }

  // Effect is invisible, so it returns empty/dummy data
  async tick(_time: number): Promise<{
    video: ImageBitmap | undefined;
    state: "success";
  }> {
    return {
      video: undefined,
      state: "success",
    };
  }

  async split(_time: number): Promise<[this, this]> {
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  toJSON(_main: boolean = false): any {
    return {
      id: this.id,
      type: "Effect",
      name: this.name,
      timing: {
        display: {
          from: this.timing.display.from,
          to: this.timing.display.to,
        },
        trim: {
          from: this.timing.trim.from,
          to: this.timing.trim.to,
        },
        duration: this.timing.duration,
        playbackRate: this.timing.playbackRate,
      },
      effectKey: this.effectKey,
      values: this.values,
    };
  }

  /**
   * Create an Effect instance from a JSON object
   */
  static async fromObject(json: any): Promise<Effect> {
    if (json.type !== "Effect") {
      throw new Error(`Expected Effect, got ${json.type}`);
    }

    const key = json.effectKey;
    if (!key) {
      throw new Error(`Missing effectKey in Effect JSON`);
    }

    const clip = new Effect(key);
    clip.values = json.values || {};

    const timing = json.timing || {
      display: json.display || { from: 0, to: 0 },
      trim: json.trim || { from: 0, to: 0 },
      duration: json.duration ?? 0,
      playbackRate: json.playbackRate ?? 1,
    };

    clip.display.from = timing.display.from;
    clip.display.to = timing.display.to;
    clip.duration = timing.duration;

    if (json.id) {
      clip.id = json.id;
    }

    await clip.ready;
    return clip;
  }
}
