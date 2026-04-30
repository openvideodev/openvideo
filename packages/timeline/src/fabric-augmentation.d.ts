import "fabric";
import { IDropInfo } from "./interfaces/canvas";

declare module "fabric" {
  interface Canvas {
    orientation: "horizontal" | "vertical";
    positionBeforeTransform?: {
      top: number;
      left: number;
    };
    positionAfterTransform: Record<string, Pick<import("fabric").RectProps, "top" | "left">>;
    trackIdAfterTransform: string;
    trackOriginBeforeTransform?: string;
  }

  // Adding properties to the base props interface ensures they are present on all objects
  interface ObjectProps {
    id?: string;
    isAlignmentAuxiliary?: boolean;
    tScale?: number;
    playbackRate?: number;
    accepts?: string[];
    itemType?: string;
    items?: string[];
    isMain?: boolean;
    magnetic?: boolean;
    hasSrc?: boolean;
    hasDuration?: boolean;
    display?: {
      from: number;
      to: number;
    };
    isSelected?: boolean;
    animations?: unknown;
    trim?: {
      from: number;
      to: number;
    };
    text?: string;
    isTrimmable?: boolean;
    isResizable?: boolean;
    clipIds?: string[];
    availableDrop?: boolean;
    fromId?: string;
    toId?: string;
    kind?: string;
    direction?: string;
    strokeDashArray?: number[] | null;
  }

  interface FabricObject {
    id: string;
    tScale: number;
    accepts: string[];
    itemType: string;
    items: string[];
    clipIds: string[];
    display: {
      from: number;
      to: number;
    };
    
    // Additional properties that were missing
    isSelected?: boolean;
    magnetic?: boolean;
    playbackRate?: number;
    isMain?: boolean;
    isTrimmable?: boolean;
    trim?: {
      from: number;
      to: number;
    };
    hasSrc?: boolean;
    hasDuration?: boolean;
    isAlignmentAuxiliary?: boolean;
    availableDrop?: boolean;
    fromId?: string;
    toId?: string;
    kind?: string;
    direction?: string;

    setSelected(selected: boolean): void;
    updateCoords(size?: number): void;
    onResizeSnap?(): void;
    onResize?(): void;
    onScale?(): void;
    setSrc?(...args: unknown[]): void;
    setDuration?(...args: unknown[]): void;
    sync?(itemDetail: unknown, tScale: number): void;
  }

  interface Control {
    controlOrientation: "left" | "right";
  }

  interface CanvasEvents {
    "track:create": IDropInfo;
    "track-items:moved": IDropInfo;
    "track-items:resized": {
      trackId: string;
      trackItemIds: string[];
      isOverlapped?: boolean;
    };
  }
}
