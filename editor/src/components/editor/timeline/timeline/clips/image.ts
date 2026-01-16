import { BaseTimelineClip, BaseClipProps } from './base';
import { createResizeControls } from '../controls';
import { Control } from 'fabric';
import { editorFont } from '@/components/editor/constants';

export class Image extends BaseTimelineClip {
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
    fill: '#164e63',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Image.ownDefaults);
    this.set({
      // fill: options.fill || TRACK_COLORS.image.solid,
    });
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawIdentity(ctx: CanvasRenderingContext2D) {
    const textPath = new Path2D(
      'M13.2002 0C14.0489 0 14.8628 0.337384 15.4629 0.9375C16.063 1.53762 16.4004 2.3515 16.4004 3.2002V13.2002C16.4004 14.0489 16.063 14.8628 15.4629 15.4629C14.8628 16.063 14.0489 16.4004 13.2002 16.4004H3.2002C2.3515 16.4004 1.53762 16.063 0.9375 15.4629C0.337384 14.8628 0 14.0489 0 13.2002V3.2002C0 2.3515 0.337384 1.53762 0.9375 0.9375C1.53762 0.337384 2.3515 0 3.2002 0H13.2002ZM6.11719 7.50879C5.8989 7.50879 5.63401 7.60033 5.35254 7.87109L1.40039 11.8232V13.2002C1.40039 13.6776 1.59017 14.1351 1.92773 14.4727C2.2653 14.8102 2.72281 15 3.2002 15H13.2002C13.6776 15 14.1351 14.8102 14.4727 14.4727C14.8102 14.1351 15 13.6776 15 13.2002V11.8232L12.7148 9.53809C12.4335 9.2674 12.1684 9.17587 11.9502 9.17578C11.7319 9.17587 11.4669 9.26733 11.1855 9.53809L10.8564 9.86621L12.0283 11.0381C12.3017 11.3114 12.3016 11.7549 12.0283 12.0283C11.7549 12.3016 11.3114 12.3017 11.0381 12.0283L6.88184 7.87109L6.77637 7.77734C6.53441 7.57873 6.30804 7.50887 6.11719 7.50879ZM3.2002 1.40039C2.72281 1.40039 2.2653 1.59017 1.92773 1.92773C1.59017 2.2653 1.40039 2.72281 1.40039 3.2002V9.84277L4.38184 6.8623L4.57031 6.69434C5.02323 6.32345 5.55268 6.1084 6.11719 6.1084C6.68149 6.10848 7.21029 6.32362 7.66309 6.69434L7.85254 6.8623L9.86719 8.87695L10.2148 8.5293L10.4043 8.36133C10.8571 7.99062 11.3859 7.77547 11.9502 7.77539C12.595 7.77548 13.1939 8.05626 13.6855 8.5293L15 9.84375V3.2002C15 2.72281 14.8102 2.2653 14.4727 1.92773C14.1351 1.59017 13.6776 1.40039 13.2002 1.40039H3.2002ZM10.709 4.16699C11.0954 4.16724 11.4082 4.48074 11.4082 4.86719C11.408 5.25349 11.0953 5.56616 10.709 5.56641H10.7002C10.3137 5.56641 10.0002 5.25364 10 4.86719C10 4.48059 10.3136 4.16699 10.7002 4.16699H10.709Z'
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
    ctx.fill(textPath);
    ctx.restore();
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? '#0891b2' : '#155e75';
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
