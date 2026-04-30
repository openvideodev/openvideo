import { Group, GroupProps, Rect, classRegistry } from "fabric";
import { ACTIVE_SELECTION_COLOR } from "../constants/objects";

export interface HelperProps extends Partial<GroupProps> {
  id: string;
  metadata: Record<string, any>;
  tScale: number;
  kind: "top" | "center" | "bottom";
  activeGuideFill?: string;
}

interface HelperSize {
  top: number;
  guide: number;
  bottom: number;
}
const sizes: Record<string, HelperSize> = {
  top: {
    top: 35,
    guide: 2,
    bottom: 3
  },
  center: {
    top: 3,
    guide: 2,
    bottom: 3
  },
  bottom: {
    top: 3,
    guide: 2,
    bottom: 35
  }
};

const getSizes = (kind: string, height: number) => {
  const size = sizes[kind];

  if (kind === "top") {
    return {
      top: height - (size.guide + size.bottom),
      guide: size!.guide,
      bottom: size!.bottom
    };
  }
  if (kind === "center") {
    return {
      top: size!.top,
      guide: size!.guide,
      bottom: size!.bottom
    };
  }
  return {
    top: size?.top,
    guide: size?.guide,
    bottom: height - (size?.guide + size?.top)
  };
};
class Helper extends Group {
  static type = "Helper";
  public guide: Rect;
  public topGuide: Rect;
  public bottomGuide: Rect;
  public metadata: Record<string, any>;
  public accepts: string[] = [];
  public kind: string;
  public activeGuideFill?: string;
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Helper.ownDefaults
    };
  }

  static ownDefaults = {
    selectable: false,
    evented: false
  };

  constructor(props: HelperProps) {
    const size = getSizes(props.kind, props.height!);
    const top = new Rect({
      top: 0,
      left: 0,
      strokeWidth: 0,
      fill: "transparent",
      selectable: true,
      height: size!.top,
      width: props.width
    });
    const guide = new Rect({
      top: size!.top,
      left: 0,
      strokeWidth: 0,
      fill: "transparent",
      selectable: true,
      height: size!.guide,
      width: props.width
    });
    const bottom = new Rect({
      top: size!.top + size!.guide,
      left: 0,
      strokeWidth: 0,
      fill: "transparent",
      selectable: true,
      height: size!.bottom,
      width: props.width
    });
    super([top, guide, bottom], props);
    Object.assign(this, Helper.ownDefaults);

    this.guide = guide;
    this.topGuide = top;
    this.bottomGuide = bottom;
    this.id = props.id;
    this.metadata = props.metadata;
    this.tScale = props.tScale;
    this.kind = props.kind;
    this.activeGuideFill = props.activeGuideFill || ACTIVE_SELECTION_COLOR;
  }

  updateCoords(size: number) {
    this.scaleToWidth(size);
    this.set("scaleY", 1);
  }

  public setSelected(selected: boolean) {
    if (selected) {
      this.guide.set("fill", this.activeGuideFill);
    } else {
      this.guide.set("fill", "transparent");
    }
  }
}

classRegistry.setClass(Helper, "Helper");

export default Helper;
