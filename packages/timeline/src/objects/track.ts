import { Rect, classRegistry } from "fabric";

export interface TrackItemProps extends Pick<Rect, "top" | "left" | "width" | "height"> {
  id: string;
  top: number;
  left: number;
  tScale: number;
  accepts: string[];
  clipIds: string[];
  magnetic?: boolean;
  static?: boolean;
  metadata?: Record<string, any>;
}

const ownDefaults: Partial<Rect> = {
  selectable: false,
  evented: false,
  strokeWidth: 0,
  stroke: "transparent",
};

class Track extends Rect {
  static ownDefaults = ownDefaults;
  static type = "Track";
  public id: string;
  public accepts: string[] = [];
  public metadata?: Record<string, any>;
  public clipIds: string[] = [];
  public magnetic?: boolean;
  public static?: boolean;
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Track.ownDefaults,
    };
  }

  constructor(props: TrackItemProps) {
    super(props);
    Object.assign(this, Track.ownDefaults);
    this.id = props.id;
    this.accepts = props.accepts || [];
    this.clipIds = props.clipIds || [];
    this.magnetic = props.magnetic;
    this.static = props.static;
    this.metadata = props.metadata;
    this.fill = "rgba(34, 34, 37, 0.8)";
    this.objectCaching = false;
  }

  updateCoords(size: number) {
    this.width = size;
  }
}

classRegistry.setClass(Track, "Track");

export default Track;
