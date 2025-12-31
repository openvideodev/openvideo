import { BaseTimelineClip, BaseClipProps } from './base';
import { TRACK_COLORS } from '../utils';
import { Control } from 'fabric';
import { createTrimControls } from '../controls';

export class VideoClip extends BaseTimelineClip {
  isSelected: boolean;
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTrimControls() };
  }

  static ownDefaults = {
    rx: 4,
    ry: 4,
    objectCaching: false,
    borderColor: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    fill: '#27272a',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    // Object.assign(this, VideoClip.ownDefaults);
    this.set({
      fill: options.fill || TRACK_COLORS.video.solid,
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
    const borderWidth = 2;
    const radius = 4;

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
