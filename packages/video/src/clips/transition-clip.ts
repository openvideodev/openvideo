import { BaseClip } from './base-clip';
import { type IClip } from './iclip';
import { type TransitionKey } from '../transition/glsl/gl-transition';

export class Transition extends BaseClip {
  readonly type = 'Transition';
  ready: IClip['ready'];

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
   * The transition configuration
   */
  transitionEffect: {
    id: string;
    key: TransitionKey;
    name: string;
  };

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
    this.transitionEffect = {
      id: `trans_${Date.now()}`,
      key: transitionKey,
      name: transitionKey,
    };

    // Ready immediately
    this.ready = Promise.resolve(this._meta);
    this.duration = this._meta.duration;
  }

  async clone() {
    const newClip = new Transition(this.transitionEffect.key);
    this.copyStateTo(newClip);
    newClip.fromClipId = this.fromClipId;
    newClip.toClipId = this.toClipId;
    // newClip.id = this.id; // Allow new ID generation
    return newClip as this;
  }

  // Transition is invisible (it's applied via renderer logic), so it returns empty/dummy data
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
      type: 'Transition',
      transitionEffect: this.transitionEffect,
      fromClipId: this.fromClipId,
      toClipId: this.toClipId,
      id: this.id,
      effects: this.effects,
    };
  }

  /**
   * Create a Transition instance from a JSON object
   */
  static async fromObject(json: any): Promise<Transition> {
    if (json.type !== 'Transition') {
      throw new Error(`Expected Transition, got ${json.type}`);
    }

    const clip = new Transition(json.transitionEffect.key);
    clip.transitionEffect = json.transitionEffect;
    clip.fromClipId = json.fromClipId || null;
    clip.toClipId = json.toClipId || null;

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
