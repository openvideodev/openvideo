import { BaseClip } from './base-clip';
import type { IClipMeta } from './iclip';

export class Placeholder extends BaseClip {
  type: string = 'Placeholder';

  meta: IClipMeta = {
    width: 0,
    height: 0,
    duration: 0,
  };

  constructor(
    src: string,
    meta: Partial<IClipMeta> = {},
    type: string = 'Placeholder'
  ) {
    super();
    this.type = type;
    this.src = src;
    this.meta = {
      width: meta.width || 1280,
      height: meta.height || 720,
      duration: meta.duration || 5000000,
    };

    this.width = this.meta.width;
    this.height = this.meta.height;
    this.duration = this.meta.duration;
    this.trim.to = this.duration;
    this.display.to = this.display.from + this.duration;

    this.ready = Promise.resolve(this.meta);
  }

  private placeholderFrame: ImageBitmap | null = null;

  async tick(time: number): Promise<{
    video?: ImageBitmap | null;
    audio?: Float32Array[];
    state: 'done' | 'success';
  }> {
    if (!this.placeholderFrame) {
      const canvas = document.createElement('canvas');
      canvas.width = this.meta.width;
      canvas.height = this.meta.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.floor(canvas.height / 10)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);

        // Add a subtle border or something to make it visible
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }
      this.placeholderFrame = await createImageBitmap(canvas);
    }

    return {
      video: this.placeholderFrame,
      state: time >= this.duration ? 'done' : 'success',
      audio: [],
    };
  }

  async clone() {
    const clip = new Placeholder(this.src, this.meta);
    this.copyStateTo(clip);
    clip.id = this.id;
    return clip as this;
  }

  async split(time: number): Promise<[this, this]> {
    const pre = await this.clone();
    const post = await this.clone();

    pre.trim.to = time + this.trim.from;
    post.trim.from = time + this.trim.from;

    pre.duration = pre.trim.to - pre.trim.from;
    post.duration = post.trim.to - post.trim.from;

    pre.display.to = pre.display.from + pre.duration;
    post.display.from = pre.display.to;
    post.display.to = post.display.from + post.duration;

    return [pre, post];
  }
}
