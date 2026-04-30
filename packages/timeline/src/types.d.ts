import {
  Canvas as BaseCanvas,
  FabricObject as BaseFabricObject,
  CanvasEvents as BaseCanvasEvents,
  RectProps
} from "fabric";
import { ItemType } from "./interfaces/combo";
import { IDropInfo } from "./interfaces/canvas";

declare module "fabric" {
  export declare class Canvas extends BaseCanvas {
    __eventListeners: {};
    orientation: "horizontal" | "vertical";
    positionBeforeTransform?: {
      top: number;
      left: number;
    };
    positionAfterTransform: Record<string, Pick<RectProps, "top" | "left">>;
    trackIdAfterTransform: string;
    trackOriginBeforeTransform?: string;
  }

  export declare class FabricObject extends BaseFabricObject {
    id: string;
    isAlignmentAuxiliary?: boolean;
    setSelected(selected: boolean): void;
    updateCoords(size?: number): void;
    tScale: number;
    playbackRate?: number;
    accepts: ItemType[];
    itemType: string;
    items: string[];
    isMain?: boolean;
    magnetic?: boolean;
    onResizeSnap?(): void;
    onResize?(): void;
    onScale?(): void;
    setSrc?(...args: any[]): void;
    setDuration?(...args: any[]): void;
    hasSrc?: boolean;
    hasDuration?: boolean;
    src?: string;
    display: {
      from: number;
      to: number;
    };
    isSelected?: boolean;
    animations?: any;
    trim?: {
      from: number;
      to: number;
    };
    text?: string;
    isTrimmable?: boolean;
    isResizable?: boolean;
    sync?(itemDetail: any, tScale: number): void;
  }

  export declare class Control extends BaseControl {
    controlOrientation: "left" | "right";
  }

  export interface CanvasEvents extends BaseCanvasEvents {
    "track:create": IDropInfo;
    "track-items:moved": IDropInfo;
    "track-items:resized": {
      trackId: string;
      trackItemIds: string[];
      isOverlapped?: boolean;
    };
  }
}
