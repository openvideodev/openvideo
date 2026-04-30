import { Canvas, FabricObject, TPointerEvent } from "fabric";
import { Helper } from "../objects";
import { CanvasSpacing } from "@designcombo/types";
export const clearPlaceholderObjects = (
  canvas: Canvas,
  placeholderMovingObjects: FabricObject[]
) => {
  canvas.remove(...placeholderMovingObjects);
  placeholderMovingObjects = [];
};

export const clearTrackHelperGuides = (allObjects: FabricObject[]) => {
  allObjects.forEach((obj) => obj.setSelected(false));
};

export const isHelperTrack = (obj: FabricObject | undefined) => {
  return obj instanceof Helper;
};

export const calcCanvasSpacing = (
  payload?: Partial<CanvasSpacing>
): CanvasSpacing => {
  const defaultSpacing = {
    left: 16,
    right: 80
  };
  return Object.assign({}, defaultSpacing, payload);
};

const touchEvents = ["touchstart", "touchmove", "touchend"];
export const isTouchEvent = (event: TPointerEvent) =>
  touchEvents.includes(event.type) ||
  (event as PointerEvent).pointerType === "touch";
