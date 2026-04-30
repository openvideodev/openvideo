import { Control, Rect, RectProps, classRegistry } from "fabric";
import {
  ACTIVE_SELECTION_COLOR,
  ACTIVE_SELECTION_WIDTH
} from "../constants/objects";
import { createMediaControls } from "../controls";
import { IClip, ITrim } from "../types";
import { timeUsToUnits } from "../utils";
interface IDisplay {
  from: number;
  to: number;
}

export interface TrimmableBaseProps
  extends Pick<RectProps, "width" | "height" | "top" | "left"> {
  id: string;
  tScale: number;
  display: IDisplay;
  trim: ITrim;
}

export type TrimmableProps<T extends object = {}> = TrimmableBaseProps & T;

class Trimmable extends Rect {
  static type = "Trimmable";
  public id: string;
  public resourceId: string = "";
  public tScale: number;
  public isSelected = false;
  declare display: IDisplay;
  declare trim: ITrim;
  public duration: number;
  declare src: string;
  public isTrimmable = true;
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createMediaControls() };
  }

  static ownDefaults = {
    rx: 6,
    ry: 6,
    objectCaching: false,
    borderColor: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    fill: "#27272a",
    borderOpacityWhenMoving: 1,
    hoverCursor: "default"
  };

  constructor(options: TrimmableProps) {
    super(options);
    Object.assign(this, Trimmable.ownDefaults);

    this.id = options.id;
    this.tScale = options.tScale;
    this.objectCaching = false;
    this.rx = 8;
    this.ry = 8;
  }

  public sync(itemDetail: IClip, tScale: number) {
    const newWidthInTime = (itemDetail.trim?.to || 0) - (itemDetail.trim?.from || 0);
    const newWidthInUnits = timeUsToUnits(
      newWidthInTime,
      tScale,
      itemDetail.playbackRate
    );
    this.set({
      duration: itemDetail.duration,
      display: itemDetail.display,
      trim: itemDetail.trim,
      width: newWidthInUnits
    });
    this.setCoords();
  }

  // add custom text to the track item
  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    if (this.isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        this.rx
      );
      ctx.lineWidth = ACTIVE_SELECTION_WIDTH;
      ctx.strokeStyle = ACTIVE_SELECTION_COLOR;
      ctx.stroke();
      ctx.restore();
    }
  }

  public onResizeSnap() {}

  public setSrc(src: string) {
    this.src = src;
  }
}

classRegistry.setClass(Trimmable, "Trimmable");

export default Trimmable;
