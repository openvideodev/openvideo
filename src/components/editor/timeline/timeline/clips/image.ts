import { BaseTimelineClip, BaseClipProps } from './base';
import { TRACK_COLORS } from '../utils';
import { createResizeControls } from '../controls';
import { Control } from 'fabric';

export class ImageClip extends BaseTimelineClip {
  isSelected: boolean;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  constructor(options: BaseClipProps) {
    super(options);
    this.set({
      fill: options.fill || TRACK_COLORS.image.solid,
    });
  }
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? 'rgba(255, 255, 255,1.0)'
      : 'rgba(255, 255, 255,0.05)';
    const borderWidth = 1;
    const radius = 6;

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
}
