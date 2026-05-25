import { Control, Rect, RectProps, classRegistry } from "fabric";
import { ACTIVE_SELECTION_COLOR, ACTIVE_SELECTION_WIDTH } from "../constants/objects";
import { createResizeControls } from "../controls";
import { IClip, IDisplay } from "../types";

export interface ResizableBaseProps extends Pick<RectProps, "width" | "height" | "top" | "left"> {
  id: string;
  tScale: number;
  display: IDisplay;
}

export type ResizableProps<T extends object = {}> = ResizableBaseProps & T;

class Resizable extends Rect {
  static type = "Resizable";
  declare id: string;
  public isSelected = false;
  declare tScale: number;
  declare display: IDisplay;
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Resizable.ownDefaults,
    };
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
    hoverCursor: "default",
  };

  public isResizable = true;

  constructor(props: ResizableProps) {
    super(props);
    Object.assign(this, Resizable.ownDefaults);

    // this.strokeWidth = 0;
    this.tScale = props.tScale;
    this.display = props.display;
  }

  public sync(itemDetail: IClip) {
    this.set({ text: (itemDetail as any).text });
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }

  // add custom text to the track item
  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    if (this.isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 6);
      ctx.lineWidth = ACTIVE_SELECTION_WIDTH;
      ctx.strokeStyle = ACTIVE_SELECTION_COLOR;
      ctx.stroke();
      ctx.restore();
    }
  }
}
classRegistry.setClass(Resizable, "Resizable");

export default Resizable;
