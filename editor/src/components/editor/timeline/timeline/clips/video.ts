import { BaseTimelineClip, BaseClipProps } from './base';
import { Control } from 'fabric';
import { createTrimControls } from '../controls';
import { editorFont } from '@/components/editor/constants';

export class Video extends BaseTimelineClip {
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
    fill: '#312e81',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Video.ownDefaults);
    this.set({
      // fill: options.fill || TRACK_COLORS.video.solid,
    });
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawIdentity(ctx: CanvasRenderingContext2D) {
    const svgPath = new Path2D(
      'M15 2.68164C14.9999 2.62494 14.9856 2.56904 14.958 2.51953C14.9303 2.46994 14.8901 2.42829 14.8418 2.39844C14.7935 2.36862 14.7383 2.35119 14.6816 2.34863C14.6249 2.34609 14.5684 2.35841 14.5176 2.38379L11 4.1416V6.85742L14.5176 8.61621C14.5684 8.64159 14.6249 8.65391 14.6816 8.65137C14.7383 8.64881 14.7935 8.63138 14.8418 8.60156C14.8901 8.57171 14.9303 8.53006 14.958 8.48047C14.9856 8.43096 14.9999 8.37506 15 8.31836V2.68164ZM10 2.16699C10 1.85757 9.877 1.56059 9.6582 1.3418C9.43941 1.123 9.14243 1 8.83301 1H2.16699C1.85757 1 1.56059 1.123 1.3418 1.3418C1.123 1.56059 1 1.85757 1 2.16699V8.83301C1 9.14243 1.123 9.43941 1.3418 9.6582C1.56059 9.877 1.85757 10 2.16699 10H8.83301C9.14243 10 9.43941 9.877 9.6582 9.6582C9.877 9.43941 10 9.14243 10 8.83301V2.16699ZM11 3.02344L14.0703 1.48926C14.2735 1.38772 14.4996 1.34038 14.7266 1.35059C14.9534 1.3608 15.174 1.42851 15.3672 1.54785C15.5604 1.66724 15.7204 1.83389 15.8311 2.03223C15.9418 2.23062 15.9999 2.45445 16 2.68164V8.31836L15.9893 8.48828C15.9676 8.65614 15.914 8.81907 15.8311 8.96777C15.7204 9.16611 15.5604 9.33276 15.3672 9.45215C15.174 9.57149 14.9534 9.6392 14.7266 9.64941C14.4996 9.65962 14.2735 9.61228 14.0703 9.51074L11 7.97559V8.83301C11 9.40764 10.7716 9.95891 10.3652 10.3652C9.95891 10.7716 9.40764 11 8.83301 11H2.16699C1.59236 11 1.04109 10.7716 0.634766 10.3652C0.228437 9.95891 0 9.40764 0 8.83301V2.16699C0 1.59236 0.228437 1.04109 0.634766 0.634766C1.04109 0.228437 1.59236 0 2.16699 0H8.83301C9.40764 0 9.95891 0.228437 10.3652 0.634766C10.7716 1.04109 11 1.59236 11 2.16699V3.02344Z'
    );

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.translate(0, 11);
    ctx.font = `400 12px ${editorFont.fontFamily}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'left';
    ctx.clip();
    ctx.fillText(this.src || '', 36, 12);

    ctx.translate(8, 1);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fill(svgPath);
    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? '#4338ca' : '#3730a3';
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
