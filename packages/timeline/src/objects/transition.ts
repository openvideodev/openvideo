import { Control, Rect, RectProps, classRegistry } from "fabric";

import {
  ACTIVE_SELECTION_COLOR,
  ACTIVE_SELECTION_WIDTH
} from "../constants/objects";
import { createTransitionControls } from "../controls";

interface TransitionProps
  extends Pick<RectProps, "width" | "height" | "top" | "left"> {
  id: string;
  tScale: number;
  duration: number;
  fromId: string;
  toId: string;
  kind: string;
  strokeDashArray?: number[];
}

class Transition extends Rect {
  static type = "Transition";
  public duration: number;
  public fromId: string;
  public toId: string;
  public kind: string = "none";
  public isSelected = false;
  public isHovered = false;
  public availableDrop = true;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTransitionControls() };
  }

  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Transition.ownDefaults
    };
  }

  static ownDefaults = {
    objectCaching: false,
    borderColor: "transparent",
    stroke: "transparent",
    strokeWidth: 1.5,
    fill: "rgba(32, 32, 32, 0.8)",
    borderOpacityWhenMoving: 1,
    hoverCursor: "pointer",
    lockMovementX: true,
    lockMovementY: true,
    duration: 1_500_000,
    rx: 6,
    ry: 6
  };

  constructor(props: TransitionProps) {
    super(props);
    Object.assign(this, Transition.ownDefaults);
    this.id = props.id;
    this.centeredScaling = true;
    this.strokeWidth = 0;
    this.tScale = props.tScale;
    this.duration = props.duration;
    this.fromId = props.fromId;
    this.toId = props.toId;
    this.kind = props.kind;
    this.strokeDashArray = props.strokeDashArray || [];

    // Use width and height from props if provided, otherwise default to ownDefaults or super
    this.width = props.width || this.width;
    this.height = props.height || this.height;

    if (this.kind === "none") {
      this.hasControls = false;
    }

    this.on("mouseover", () => {
      this.isHovered = true;
      this.canvas?.requestRenderAll();
    });

    this.on("mouseout", () => {
      this.isHovered = false;
      this.canvas?.requestRenderAll();
    });
  }

  public updateCoords() {}

  // add custom text to the track item
  public _render(ctx: CanvasRenderingContext2D) {
    if (this.kind === "none" && !this.isHovered && !this.isSelected) {
      return;
    }
    const visualWidth = 24;
    const visualHeight = 24;

    ctx.save();
    ctx.fillStyle = this.fill as string;
    ctx.beginPath();
    ctx.roundRect(
      -visualWidth / 2,
      -visualHeight / 2,
      visualWidth,
      visualHeight,
      this.rx
    );
    ctx.fill();
    ctx.restore();

    this.drawIcon(ctx);
    this.updateSelected(ctx);
  }

  private drawIcon(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (this.kind === "none") {
      // Plus icon
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.stroke();
    } else {
      // Transition icon (two triangles)
      ctx.fillStyle = "white";
      ctx.beginPath();
      // Left triangle
      ctx.moveTo(-6, -5);
      ctx.lineTo(-1, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      // Right triangle
      ctx.moveTo(6, -5);
      ctx.lineTo(1, 0);
      ctx.lineTo(6, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const visualWidth = 24;
    const visualHeight = 24;

    const strokeStyle = this.availableDrop
      ? this.isSelected
        ? ACTIVE_SELECTION_COLOR
        : "rgba(255, 255, 255, 0.15)"
      : "red";

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      -visualWidth / 2,
      -visualHeight / 2,
      visualWidth,
      visualHeight,
      this.rx
    );
    ctx.lineWidth = ACTIVE_SELECTION_WIDTH + (this.isSelected ? 1 : 0);
    ctx.setLineDash(this.strokeDashArray as any); // Set the dash pattern
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
    ctx.restore();
  }
}

classRegistry.setClass(Transition, "Transition");

export default Transition;
