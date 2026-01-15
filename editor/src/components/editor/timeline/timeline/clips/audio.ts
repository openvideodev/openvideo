import { BaseTimelineClip, BaseClipProps } from './base';
import { Control } from 'fabric';
import { createTrimControls } from '../controls';

export class Audio extends BaseTimelineClip {
  isSelected: boolean;
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTrimControls() };
  }

  static ownDefaults = {
    rx: 10,
    ry: 10,
    objectCaching: false,
    borderColor: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    fill: '#1e3a8a',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Audio.ownDefaults);
    this.set({
      // fill: options.fill || TRACK_COLORS.audio.solid,
      fill: '#1e3a8a',
    });
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    // this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }
  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? '#3b82f6' : '#1d4ed8';
    const borderWidth = 2;
    const radius = 10;

    ctx.save();
    ctx.fillStyle = borderColor;

    // Create a path for the outer rectangle
    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      radius
    );

    // Create a path for the inner rectangle (the hole)
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      radius - borderWidth
    );

    // Use even-odd fill rule to create the border effect
    ctx.fill('evenodd');
    ctx.restore();
  }
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
}
