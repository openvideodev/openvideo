import { BaseTimelineClip, BaseClipProps } from './base';
import { Control } from 'fabric';
import { createResizeControls } from '../controls';

export class Effect extends BaseTimelineClip {
  isSelected: boolean;
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  static ownDefaults = {
    rx: 10,
    ry: 10,
    objectCaching: false,
    borderColor: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    fill: '#881337',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };
  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Effect.ownDefaults);
    this.set({
      // fill: options.fill || TRACK_COLORS.effect.solid,
    });
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? '#be123c' : '#9f1239';
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
}
