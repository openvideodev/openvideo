import { BaseClip } from "./base-clip";
import type { IClipMeta } from "./iclip";

export class Placeholder extends BaseClip {
  type: string = "Placeholder";

  meta: IClipMeta = {
    width: 0,
    height: 0,
    duration: 0,
  };

  constructor(
    src: string,
    meta: Partial<IClipMeta> = {},
    type: string = "Placeholder",
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

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationRafId: number | null = null;
  private renderPending = false;

  async tick(time: number): Promise<{
    video?: ImageBitmap | null;
    audio?: Float32Array[];
    state: "done" | "success";
  }> {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.meta.width;
      this.canvas.height = this.meta.height;
      this.ctx = this.canvas.getContext("2d");
    }

    const { canvas, ctx } = this;
    if (ctx) {
      const { width, height } = canvas;
      if (width > 0 && height > 0) {
        // 1. Clear and Draw Background
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Spinner
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 100;
        const thickness = radius / 4;

        // Rotation based on real-time (performance.now())
        // ensures it spins even if the engine's time is 0
        const rotation = (performance.now() / 2000) * Math.PI * 2;

        ctx.save();

        // Create a gradient for the spinner tail effect
        const gradient = ctx.createConicGradient(rotation, centerX, centerY);
        gradient.addColorStop(0, "#ffffff"); // Head
        gradient.addColorStop(0.2, "#ffffff");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(0.8, "rgba(255, 255, 255, 0.1)"); // Tail
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";

        ctx.beginPath();
        // Draw 270 degrees of the ring starting from the current rotation
        ctx.arc(centerX, centerY, radius, rotation, rotation + Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();

        // 4. Add a subtle border
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, width, height);
      }
    }

    // Schedule next render via rAF with back-pressure guard.
    // renderPending prevents flooding: we only emit request-render
    // once per completed render cycle (tick clears the flag below).
    this.renderPending = false; // Current tick() is completing — allow next request
    if (this.animationRafId === null) {
      const scheduleNext = () => {
        if (this.destroyed) {
          this.animationRafId = null;
          return;
        }
        if (!this.renderPending) {
          this.renderPending = true;
          this.emit("request-render" as any);
        }
        this.animationRafId = requestAnimationFrame(scheduleNext);
      };
      this.animationRafId = requestAnimationFrame(scheduleNext);
    }

    const frame =
      canvas.width > 0 && canvas.height > 0
        ? await createImageBitmap(canvas)
        : null;

    return {
      video: frame,
      state: "success",
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

  /**
   * Create a Placeholder instance from a JSON object
   */
  static async fromObject(json: any): Promise<Placeholder> {
    if (json.type !== "Placeholder") {
      throw new Error(`Expected Placeholder, got ${json.type}`);
    }

    const clip = new Placeholder(json.src, {
      width: json.width,
      height: json.height,
      duration: json.duration,
    });

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

    // Restore id if present
    if (json.id) {
      clip.id = json.id;
    }

    await clip.ready;
    return clip;
  }
}
