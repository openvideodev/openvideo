import { Transition } from "../../objects";
import Timeline from "../../timeline";
import {
  FabricObject,
  FabricObjectProps,
  ObjectEvents,
  SerializedObjectProps,
  TPointerEvent,
  ActiveSelection,
  TPointerEventInfo,
  TEvent
} from "fabric";

function onMouseWheel(this: Timeline, e: TPointerEventInfo<WheelEvent>) {
  const canScrollY = this.height < this.bounding.height;
  const canScrollX = this.width < this.bounding.width;

  if (!canScrollX && !canScrollY) return;
  const vt = this.viewportTransform;

  let newPosX = vt[4];
  let newPosY = vt[5];
  const SCROLL_MULTIPLIER = 2;
  if (e.e.shiftKey) {
    newPosX = newPosX - e.e.deltaY * SCROLL_MULTIPLIER;
  } else {
    if (canScrollY) {
      newPosY = newPosY - e.e.deltaY * SCROLL_MULTIPLIER;
    }
    newPosX = newPosX - e.e.deltaX * SCROLL_MULTIPLIER;
  }

  this.setViewportPos(newPosX, newPosY);
}

function onSelectionCreated(this: Timeline) {
  const canvas = this;
  const activeSelection = canvas.getActiveObject();
  const activeObjects = canvas.getActiveObjects();
  const activeObjIds = activeObjects.map((obj) => obj.id);
  const validatedActiveIds = activeObjects
    .filter((obj) => {
      if (activeObjects.length === 1) {
        return true;
      } else if (obj.id && !(obj instanceof Transition)) {
        return true;
      } else if (obj instanceof Transition) {
        if (
          activeObjIds.includes(obj.fromId) &&
          activeObjIds.includes(obj.toId)
        ) {
          return true;
        }
      }
    })
    .map((obj) => obj.id);
  if (activeSelection instanceof ActiveSelection) {
    activeSelection.borderColor = "rgba(0, 216, 214,0.75)";
    activeSelection.hasControls = false;
    activeSelection.hoverCursor = "default";
    activeSelection.borderScaleFactor = 1;
    activeSelection.padding = 0;
    activeSelection.getObjects().forEach((obj) => {
      obj.setSelected(true);
    });
  } else {
    activeSelection?.setSelected(true);
  }
  if (
    validatedActiveIds.length === 1 &&
    String(activeSelection?.id) !== String(validatedActiveIds[0])
  ) {
    this.setActiveIds(validatedActiveIds);
  } else if (validatedActiveIds.length >= 1) {
    this.setActiveIds(validatedActiveIds);
  }
}

function onSelectionUpdated(
  this: Timeline,
  e: Partial<TEvent<TPointerEvent>> & {
    selected: FabricObject<
      Partial<FabricObjectProps>,
      SerializedObjectProps,
      ObjectEvents
    >[];
    deselected: FabricObject<
      Partial<FabricObjectProps>,
      SerializedObjectProps,
      ObjectEvents
    >[];
  }
) {
  const canvas = this;
  const activeSelection = canvas.getActiveObject();
  if (activeSelection instanceof ActiveSelection) {
    activeSelection.borderColor = "transparent";
    activeSelection.hasControls = false;
    activeSelection.hoverCursor = "default";
  }
  e.selected.forEach((obj) => {
    obj.setSelected(true);
  });
  e.deselected.forEach((obj) => {
    obj.setSelected(false);
  });

  const activeObjects = canvas.getActiveObjects();
  const activeIds = activeObjects.map((obj) => obj.id);
  this.setActiveIds(activeIds);
}

function onSelectionCleared(
  this: Timeline,
  e: Partial<TEvent<TPointerEvent>> & {
    deselected: FabricObject<
      Partial<FabricObjectProps>,
      SerializedObjectProps,
      ObjectEvents
    >[];
  }
) {
  e.deselected.forEach((obj) => {
    obj.setSelected(false);
  });
}

export const addSelectionEvents = (timeline: Timeline) => {
  timeline.on("selection:created", onSelectionCreated);
  timeline.on("selection:updated", onSelectionUpdated);
  timeline.on("selection:cleared", onSelectionCleared);
  timeline.on("mouse:wheel", onMouseWheel);
};

export const removeSelectionEvents = (timeline: Timeline) => {
  timeline.off("mouse:wheel", onMouseWheel);
  timeline.off("selection:created", onSelectionCreated);
  timeline.off("selection:updated", onSelectionUpdated);
  timeline.off("selection:cleared", onSelectionCleared);
};
