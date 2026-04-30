import { FabricObject, TPointerEvent, TPointerEventInfo } from "fabric";
import Timeline from "../../timeline";
import {
  SPACE_TO_RESIZE_X,
  SPACE_TO_RESIZE_Y
} from "../../constants/constants";

let activeObject: FabricObject | undefined;
let resizing: boolean = false;

function validateCursorShape(
  target: FabricObject,
  point: { x: number; y: number }
) {
  const canvas = target.canvas! as Timeline;
  const itemTypes = canvas.objectTypes;
  if (itemTypes.includes(target.type)) {
    if (!activeObject) activeObject = target;
    const top = target.top;
    const height = target.height;
    const left = target.left;
    const width = target.width;
    const pointX = point.x;
    const pointY = point.y;
    const validatePosY =
      Math.abs(pointY - (top + height / 2)) <= SPACE_TO_RESIZE_Y;
    if (Math.abs(pointX - left) <= SPACE_TO_RESIZE_X && validatePosY) {
      canvas.hoverCornerItem = true;
      target.hoverCursor = "ew-resize";
    } else if (
      Math.abs(pointX - left - width) <= SPACE_TO_RESIZE_X &&
      validatePosY
    ) {
      canvas.hoverCornerItem = true;
      target.hoverCursor = "ew-resize";
    } else {
      canvas.hoverCornerItem = false;
      target.hoverCursor = "move";
    }
    canvas.requestRenderAll();
  }
}

function mouseMoveEvent(this: Timeline, e: TPointerEventInfo<TPointerEvent>) {
  const canvas = this;
  const target = canvas.findTarget(e.e);
  const point = canvas.getScenePoint(e.e!);
  if (target) {
    if (target.isSelected && activeObject) {
      target.hoverCursor = "default";
    }
    validateCursorShape(target, point);
  }
}

function mouseUpEvent(this: Timeline) {
  if (!activeObject) return;
  activeObject.lockMovementX = false;
  activeObject.lockMovementY = false;
  activeObject = undefined;
}

function onAfterRender(
  this: Timeline,
  e: {
    ctx: CanvasRenderingContext2D;
  }
) {
  if (!activeObject) return;
  if (resizing) return;
  activeObject._renderControls(e.ctx);
}

function mouseOutEvent(this: Timeline) {
  if (!activeObject) return;
  activeObject = undefined;
  this.requestRenderAll();
}

function onObjectResizing(this: Timeline) {
  resizing = true;
}

function onObjectModified(this: Timeline) {
  resizing = false;
}

export function addHoverControlEvents(timeline: Timeline) {
  timeline.on("mouse:out", mouseOutEvent.bind(timeline));
  timeline.on("mouse:up", mouseUpEvent.bind(timeline));
  timeline.on("mouse:move", mouseMoveEvent.bind(timeline));
  timeline.on("after:render", onAfterRender.bind(timeline));
  timeline.on("object:resizing", onObjectResizing.bind(timeline));
  timeline.on("object:modified", onObjectModified.bind(timeline));
}

export function removeHoverControlsEvents(timeline: Timeline) {
  timeline.off("mouse:out", mouseOutEvent.bind(timeline));
  timeline.off("mouse:up", mouseUpEvent.bind(timeline));
  timeline.off("mouse:move", mouseMoveEvent.bind(timeline));
  timeline.off("after:render", onAfterRender.bind(timeline));
  timeline.off("object:resizing", onObjectResizing.bind(timeline));
  timeline.off("object:modified", onObjectModified.bind(timeline));
}
