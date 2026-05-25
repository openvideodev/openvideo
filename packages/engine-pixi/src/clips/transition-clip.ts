import { BaseClip } from "./base-clip";
import { type IClip } from "./iclip";
import { type TransitionKey } from "../transition/glsl/gl-transition";

export class Transition extends BaseClip {
  readonly type = "Transition";
  ready: IClip["ready"];

  private _meta = {
    duration: 2e6, // Default 2 seconds
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
   * The transition key
   */
  transitionKey: TransitionKey;

  /**
   * ID of the clip from which the transition starts
   */
  fromClipId: string | null = null;

  /**
   * ID of the clip to which the transition ends
   */
  toClipId: string | null = null;

  constructor(transitionKey: TransitionKey) {
    super();
    this.transitionKey = transitionKey;

    // Ready immediately
    this.ready = Promise.resolve(this._meta);
    this.duration = this._meta.duration;
  }

  async clone() {
    const newClip = new Transition(this.transitionKey);
    this.copyStateTo(newClip);
    newClip.fromClipId = this.fromClipId;
    newClip.toClipId = this.toClipId;
    return newClip as this;
  }

  // Transition is invisible (it's applied via renderer logic), so it returns empty/dummy data
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
      type: "Transition",
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
      transitionKey: this.transitionKey,
      fromClipId: this.fromClipId,
      toClipId: this.toClipId,
    };
  }

  /**
   * Create a Transition instance from a JSON object
   */
  static async fromObject(json: any): Promise<Transition> {
    if (json.type !== "Transition") {
      throw new Error(`Expected Transition, got ${json.type}`);
    }

    const key = json.transitionKey;
    if (!key) {
      throw new Error(`Missing transitionKey in Transition JSON`);
    }

    const clip = new Transition(key);
    clip.fromClipId = json.fromClipId || null;
    clip.toClipId = json.toClipId || null;

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
