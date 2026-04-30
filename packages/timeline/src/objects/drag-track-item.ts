import { Rect, RectProps, classRegistry } from "fabric";

export interface PreviewTrackItemProps
  extends Pick<RectProps, "width" | "height" | "top" | "left"> {
  id: string;
  type: string;
  duration: number;
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Formatear con ceros a la izquierda
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

class PreviewTrackItem extends Rect {
  static type = "PreviewTrackItem";
  public duration: number;
  public fromId: string;
  public toId: string;
  public isSelected = false;
  public name: string;
  public durationString: string;
  public itemType: string;
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...PreviewTrackItem.ownDefaults
    };
  }

  static ownDefaults = {
    objectCaching: false,
    borderColor: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    borderOpacityWhenMoving: 1,
    hoverCursor: "default",
    rx: 4,
    ry: 4
  };

  constructor(props: PreviewTrackItemProps) {
    super(props);
    Object.assign(this, PreviewTrackItem.ownDefaults);
    this.id = props.id;
    this.fill = "#27272a";
    this.name = props.type.toUpperCase();
    this.durationString = formatTime(props.duration);
    this.itemType = props.type;
  }

  public _render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    super._render(ctx);

    // Apply clipping to the rectangle bounds
    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.clip();

    this.drawTextIdentity(ctx);
    ctx.restore();
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    // Set font and text properties
    ctx.font = "600 12px 'Geist variable'";
    ctx.textAlign = "left";

    // Measure text widths
    const nameWidth = ctx.measureText(this.name).width;
    const durationWidth = ctx.measureText(this.durationString).width;

    // Define rectangle dimensions
    const padding = 8;
    const spacing = 4;
    const rectY = 4 - this.height / 2; // Adjust for the new origin
    const rectHeight = 20;
    const radius = 4;

    // Draw name rectangle and text
    const nameRectX = 4 - this.width / 2; // Adjust for the new origin
    const nameRectWidth = nameWidth + padding * 2;

    this.drawRoundedRect(
      ctx,
      nameRectX,
      rectY,
      nameRectWidth,
      rectHeight,
      radius
    );
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText(this.name, nameRectX + padding, rectY + 14);

    // Draw duration rectangle and text
    const durationRectX = nameRectX + nameRectWidth + spacing;
    const durationRectWidth = durationWidth + padding * 2;

    this.drawRoundedRect(
      ctx,
      durationRectX,
      rectY,
      durationRectWidth,
      rectHeight,
      radius
    );
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText(this.durationString, durationRectX + padding, rectY + 14);
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
    } else {
      // Fallback for browsers that don't support roundRect
      ctx.fillRect(x, y, width, height);
    }
  }
}

classRegistry.setClass(PreviewTrackItem, "PreviewTrackItem");
export default PreviewTrackItem;
