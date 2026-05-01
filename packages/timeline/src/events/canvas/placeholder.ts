import {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  FabricObjectProps,
  ObjectEvents,
  Point,
  SerializedObjectProps,
  TBBox,
  TPointerEvent
} from "fabric";
import { Helper, Placeholder, PreviewTrackItem, Track } from "../../objects";
import Timeline from "../../timeline";
import { clearPlaceholderObjects } from "../../utils/canvas";
import { IClip, ITransitionClip } from "../../types";

import { cloneDeep, throttle } from "lodash-es";
import TransitionGuide from "../../objects/transition-guide";
import { groupTrackItems } from "../../utils/group-items";
import { timeUsToUnits } from "../../utils";
import { MovingState } from "../../managers/drag-state-manager";

// Removed hardcoded availableItemTypes

function onMouseUp(this: Timeline) {
  const state = this.dragStateManager.getState();
  clearPlaceholderObjects(this, state.placeholderMovingObjects);
}

let draggedObjectInitalPositions: Record<string, number> | null = null;

function restorePrimaryMovingObjects(canvas: Timeline) {
  const state = canvas.dragStateManager.getState();
  if (!draggedObjectInitalPositions) return;
  if (draggedObjectInitalPositions) {
    state.primaryMovingObjects.forEach((obj) => {
      obj.left = draggedObjectInitalPositions![obj.id]!;
    });
  }
  draggedObjectInitalPositions = null;
}

function constrainObjectPosition(e: BasicTransformEvent<TPointerEvent>) {
  const target = e.transform?.target;
  if (!target) return;
  const left = target.left;
  target.left = Math.max(left, 0);
}

function findOverlapObject(objects: FabricObject[], boundingBox: TBBox) {
  const overlapObject = objects.find((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      boundingBox.left < objRect.left + objRect.width &&
      boundingBox.left + boundingBox.width - 1 > objRect.left &&
      boundingBox.top < objRect.top + objRect.height &&
      boundingBox.top + boundingBox.height > objRect.top
    );
  });
  return overlapObject;
}

function getOverlappedPosition(
  movingObject: FabricObject,
  overTarget: FabricObject
): number {
  const canvas = movingObject.canvas! as Timeline;
  const activeObj = canvas.getActiveObject()!;
  const movingObjectCenterX = activeObj.left + activeObj.width / 2;
  const overTargetCenterX = overTarget.left + overTarget.width / 2;

  if (movingObjectCenterX < overTargetCenterX) {
    // Return the left position of overTarget when movingObject is leaning to the left
    return overTarget.left - activeObj.width;
  } else if (movingObjectCenterX > overTargetCenterX) {
    // Return the right position of overTarget when movingObject is leaning to the right
    return overTarget.left + overTarget.width;
  } else {
    // Return the center position of overTarget when they are aligned
    return overTarget.left + overTarget.width;
  }
}

const checkCanBeDroppedOverlaped = (
  objects: FabricObject[],
  target: FabricObject,
  nextLeft: number
) => {
  if (nextLeft < 0) return false;
  const overlapObject = findOverlapObject(objects, {
    ...target.getBoundingRect(),
    left: nextLeft
  });

  if (overlapObject) return false;

  return true;
};

const isObjectAcceptedByTrack = (canvas: Timeline, object: FabricObject) => {
  const state = canvas.dragStateManager.getState();
  const draggingOverTrack = state.draggingOverTrack;
  const validateAccepts = draggingOverTrack?.accepts.map((accept) =>
    accept.toLowerCase()
  );

  const validateObjType = object.type.toLowerCase();

  if (object instanceof PreviewTrackItem) {
    return draggingOverTrack && validateAccepts?.includes(validateObjType);
  }
  return draggingOverTrack && validateAccepts?.includes(validateObjType);
};

function updatePlaceholderVisibility(canvas: Timeline, object: Placeholder) {
  const state = canvas.dragStateManager.getState();
  const isPointerOverHelperTrack = state.isPointerOverHelperTrack;
  if (isPointerOverHelperTrack) {
    object.opacity = 0;
  } else {
    object.opacity = 1;
  }
}

function getInitialPlaceholderPosition(canvas: Timeline) {
  const state = canvas.dragStateManager.getState();
  const firstObj = state.primaryMovingObjects[0];
  return {
    top: state.objectInitialPositions[firstObj.id]!.top,
    left: state.objectInitialPositions[firstObj.id]!.left
  };
}

function getDefaultPlaceholderPosition(canvas: Timeline, object: FabricObject) {
  const objectBounds = object.getBoundingRect();
  const state = canvas.dragStateManager.getState();
  const draggingOverTrack = state.draggingOverTrack;
  const primaryObjIds = state.primaryMovingObjects.map((obj) => obj.id);
  if (primaryObjIds.includes(object.id)) {
    const firstPrimaryObj = state.primaryMovingObjects[0];
    const objectBounds = firstPrimaryObj.getBoundingRect();
    return {
      top: draggingOverTrack!.top,
      left: objectBounds.left
    };
  }
  return {
    top: draggingOverTrack!.top,
    left: objectBounds.left
  };
}

function getOverlapPlaceholderPosition(
  canvas: Timeline,
  draggedObject: FabricObject,
  overlapObject: FabricObject,
  currentTrackObjects: FabricObject[],
  pointer: Point
) {
  const activeIds = canvas.getActiveObjects().map((obj) => obj.id);
  const position = getOverlappedPosition(draggedObject!, overlapObject);
  const filterCurrentTrackObjects = currentTrackObjects.filter(
    (obj) => !activeIds.includes(obj.id)
  );
  const canBeDropped = checkCanBeDroppedOverlaped(
    filterCurrentTrackObjects,
    draggedObject!,
    position
  );
  const state = canvas.dragStateManager.getState();
  state.orderNormalTrack = true;
  if (!canBeDropped || pointer.x - 20 < 0) {
    const track = state.draggingOverTrack!;
    const nearPoint = state.initialTrackPoints.reduce((a, b) =>
      Math.abs(b - pointer.x) < Math.abs(a - pointer.x) ? b : a
    );
    return {
      left: nearPoint,
      top: track.top
    };
  }
  return {
    left: position,
    top: overlapObject!.top
  };
}

const orderItemsByPoints = (objects: FabricObject[], points: number[]) => {
  objects.forEach((obj, index) => {
    obj.set({ left: points[index] });
  });
};

const onObjectMovingForPlaceholder = throttle(
  (
    e: BasicTransformEvent<TPointerEvent> & {
      target: FabricObject<
        Partial<FabricObjectProps>,
        SerializedObjectProps,
        ObjectEvents
      >;
    }
  ) => {
    const canvas = e.target.canvas! as Timeline;

    constrainObjectPosition(e);
    restorePrimaryMovingObjects(canvas);

    const state = canvas.dragStateManager.getState();

    const draggingOverTrack = state.draggingOverTrack;

    if (!draggingOverTrack) {
      // handle when there is no track
      state.placeholderMovingObjects.forEach((placeholderObject) => {
        placeholderObject.visible = false;
      });
      return;
    } else {
      const firstObject = state.primaryMovingObjects[0];
      if (
        firstObject &&
        canvas.itemTypes.includes(firstObject.type.toLowerCase())
      ) {
        state.placeholderMovingObjects.forEach((placeholderObject) => {
          placeholderObject.visible = true;
        });
      }
    }

    const draggedObjects = state.placeholderMovingObjects.map(
      (placeholderObject) => placeholderObject.draggedObject
    );

    const currentTrackObjects = (
      state.trackToItemsMap[draggingOverTrack.id] || []
    ).filter((o) => !draggedObjects.includes(o));

    const isAccepted = isObjectAcceptedByTrack(
      canvas,
      state.primaryMovingObjects[0]
    );

    if (draggingOverTrack.magnetic && isAccepted) {
      if (!state.updateItemsInTrack) {
        state.updateItemsInTrack = draggingOverTrack.id;
        state.initialTrackPoints = [];
      } else if (state.updateItemsInTrack !== draggingOverTrack.id) {
        state.updateItemsInTrack = draggingOverTrack.id;
        state.initialTrackPoints = [];
      }
      if (state.initialTrackPoints.length === 0) {
        state.updateItemsInTrack = draggingOverTrack.id;
        state.initialTrackPoints = getInitialPointAndSetPosObjs(
          canvas,
          state,
          draggingOverTrack as Track
        );
      }

      let intialPlaceholderPoint = 0;

      for (const [index, point] of state.initialTrackPoints.entries()) {
        const currentPoint = point;
        const nextPoint = state.initialTrackPoints[index + 1];
        const prevPoint = state.initialTrackPoints[index - 1];
        const diffNextPoint = nextPoint - currentPoint;
        const diffPrevPoint = currentPoint - prevPoint;
        if (!nextPoint) {
          intialPlaceholderPoint = currentPoint;
        } else if (
          currentPoint <= e.pointer.x &&
          currentPoint + diffNextPoint / 2 >= e.pointer.x
        ) {
          intialPlaceholderPoint = currentPoint;
          break;
        } else if (
          currentPoint - diffPrevPoint / 2 <= e.pointer.x &&
          e.pointer.x <= currentPoint
        ) {
          intialPlaceholderPoint = currentPoint;
          break;
        }
      }

      state.placeholderMovingObjects.forEach((placeholderObject) => {
        placeholderObject.opacity = 1;
        placeholderObject.left = intialPlaceholderPoint;
        placeholderObject.top = draggingOverTrack.top;
        intialPlaceholderPoint += placeholderObject.width;
      });
      state.placeholderMovingObjects.forEach((placeholderObject) => {
        const draggedObject = placeholderObject.draggedObject;
        canvas.positionAfterTransform[draggedObject.id] = {
          top: placeholderObject.top,
          left: placeholderObject.left
        };
      });
      canvas.trackIdAfterTransform =
        state.trackTopToIdMap[draggingOverTrack.top];
    } else {
      state.orderNormalTrack = false;
      if (
        state.updateItemsInTrack &&
        state.updateItemsInTrack !== draggingOverTrack.id
      ) {
        const track = canvas
          .getObjects()
          .find((o) => o.id === state.updateItemsInTrack)!;
        if (track?.magnetic) {
          orderMagTeckWhenIsNotOver(canvas, state);
        } else {
          canvas.itemsManager.updateTrackItemCoords(true);
        }
        state.updateItemsInTrack = null;
        state.initialTrackPoints = [];
      }
      if (
        state.initialTrackPoints.length === 0 &&
        draggingOverTrack instanceof Track
      ) {
        state.updateItemsInTrack = draggingOverTrack.id;
        state.initialTrackPoints = getInitialPointAndSetPosObjs(
          canvas,
          state,
          draggingOverTrack
        );
      }
      const overlapObject = currentTrackObjects.find((draggedObject) => {
        return findOverlapObject(
          draggedObjects,
          draggedObject!.getBoundingRect()
        );
      });

      const diffBetweenObjs: number[] = [];
      const primaryObjs = state.primaryMovingObjects;
      const sortedPrimaryObjs = primaryObjs.sort((a, b) => a.left - b.left);
      const firstPrimaryObj = sortedPrimaryObjs[0];
      sortedPrimaryObjs.forEach((obj, index) => {
        if (!sortedPrimaryObjs[index - 1]) return;
        const diffObj = obj.left - firstPrimaryObj.left;
        diffBetweenObjs.push(diffObj);
      });

      state.placeholderMovingObjects.forEach((placeholderObject, index) => {
        const draggedObject = placeholderObject.draggedObject;
        if (draggedObject instanceof TransitionGuide) {
          placeholderObject.visible = false;
          return;
        }
        draggedObject.setCoords();
        updatePlaceholderVisibility(canvas, placeholderObject);

        let placeholderPosition = getPlaceholderPosition(
          canvas,
          draggedObject,
          currentTrackObjects,
          e.pointer,
          overlapObject
        );

        if (state.draggingOverTrack instanceof Helper) {
          placeholderObject.opacity = 0;
        } else {
          placeholderObject.opacity = 1;
        }

        if (
          draggedObject instanceof PreviewTrackItem &&
          placeholderPosition.isInvalidDrop &&
          state.draggingOverTrack instanceof Track
        ) {
          // placeholderObject.opacity = 0;
          const point = e.pointer;
          const vt = [...canvas.viewportTransform];
          const pointY = point.y - vt[5];
          selectClosestHelper(canvas, pointY);
        } else if (state.primaryMovingObjects.length > 1) {
          canvas.trackIdAfterTransform =
            state.trackTopToIdMap[placeholderPosition.top];
          canvas.positionAfterTransform[draggedObject.id] = {
            top: placeholderPosition.top,
            left: placeholderPosition.left + (diffBetweenObjs[index - 1] || 0)
          };
          placeholderObject.left =
            placeholderPosition.left + (diffBetweenObjs[index - 1] || 0);
          placeholderObject.top = placeholderPosition.top;
        } else {
          canvas.trackIdAfterTransform =
            state.trackTopToIdMap[placeholderPosition.top];
          canvas.positionAfterTransform[draggedObject.id] = {
            top: placeholderPosition.top,
            left: placeholderPosition.left
          };
          placeholderObject.left = placeholderPosition.left;
          placeholderObject.top = placeholderPosition.top;
        }
      });
    }
  }
);

const getInitialPointAndSetPosObjs = (
  canvas: Timeline,
  state: MovingState,
  draggingOverTrack: Track
) => {
  const objectsInTrack: FabricObject[] = [];
  draggingOverTrack.clipIds.forEach((item) => {
    const itemObject = canvas.getObjects().find((o) => o.id === item);
    if (!itemObject) return;
    objectsInTrack.push(itemObject);
  });
  const activeIds = state.activeObjects.map((obj) => obj.id);
  const objectsInTrackNotActive = objectsInTrack.filter(
    (obj) => !activeIds.includes(obj.id)
  );
  const sortedObjectByLeft = objectsInTrackNotActive.sort(
    (a, b) => a.left - b.left
  );
  let initialPost = 0;
  const initialTrackPoints: number[] = [];
  // If the track is magnetic, calculate the initial position of the objects
  if (draggingOverTrack.magnetic) {
    // Sort objects by left position
    setPositionMagneticObj(
      canvas,
      sortedObjectByLeft,
      initialPost,
      initialTrackPoints
    );
  } else {
    setPositionRegularObj(draggingOverTrack, initialTrackPoints, canvas);
  }

  return initialTrackPoints;
};

function orderMagTeckWhenIsNotOver(canvas: Timeline, state: MovingState) {
  const objectsInTrack: FabricObject[] = [];
  const magneticTrack = canvas
    .getObjects()
    .find((o) => o.id === state.updateItemsInTrack) as Track | undefined;
  if (!magneticTrack) return;
  magneticTrack.clipIds.forEach((item: string) => {
    const itemObject = canvas.getObjects().find((o) => o.id === item);
    if (!itemObject) return;
    objectsInTrack.push(itemObject);
  });
  const activeIds = state.activeObjects.map((obj) => obj.id);
  const objectsInTrackNotActive = objectsInTrack.filter(
    (obj) => !activeIds.includes(obj.id)
  );
  const sortedObjectByLeft = objectsInTrackNotActive.sort(
    (a, b) => a.left - b.left
  );
  state.initialTrackPoints.length > sortedObjectByLeft.length &&
    orderItemsByPoints(sortedObjectByLeft, state.initialTrackPoints);
}

function setPositionMagneticObj(
  canvas: Timeline,
  sortedObjectByLeft: FabricObject[],
  initialPost: number,
  initialTrackPoints: number[]
) {
  const state = canvas.dragStateManager.getState();
  const overTrack = state.draggingOverTrack;
  const primaryObjIds = state.primaryMovingObjects.map((obj) => obj.id);
  if (!canvas) return;
  const transitionIds = canvas.transitionIds.filter(
    (id) => (canvas.transitionsMap[id] as ITransitionClip).key !== "none"
  );
  sortedObjectByLeft.forEach((obj) => {
    obj.set({ left: initialPost });
    initialPost += obj.width;
    const transitionTo = transitionIds.find(
      (id) => (canvas.transitionsMap[id] as ITransitionClip).toClipId === obj.id
    );
    if (!transitionTo) {
      initialTrackPoints.push(obj.left);
    }
  });
  const lastObject = sortedObjectByLeft[sortedObjectByLeft.length - 1];
  initialTrackPoints.push((lastObject?.left || 0) + (lastObject?.width || 0));
  if ((overTrack as Track)?.clipIds?.includes(primaryObjIds[0])) {
    const primaryObj = state.primaryMovingObjects[0];
    const clonedArray = [...initialTrackPoints];
    if (primaryObj) {
      const index = clonedArray.findIndex((n) => n > primaryObj?.left);
      if (index !== -1)
        initialTrackPoints.splice(
          index,
          0,
          timeUsToUnits(primaryObj.display.from, canvas.tScale)
        );
    }
  }
}

function setPositionRegularObj(
  draggingOverTrack: Track,
  initialTrackPoints: number[],
  canvas: Timeline
) {
  const itemIds = draggingOverTrack.clipIds;
  const itemInTrack: Record<string, IClip> = {};
  const transitionInTrack: Record<string, ITransitionClip> = {};
  const activeIds = canvas.getActiveObjects().map((o) => o.id);
  Object.values(canvas.trackItemsMap).forEach((o) => {
    if (itemIds.includes(o.id)) itemInTrack[o.id] = o;
  });
  const transitionInTrackIds = canvas
    .getObjects("Transition")
    .filter((o) => o.top === draggingOverTrack.top)
    .map((o) => o.id);
  Object.values(canvas.transitionsMap).forEach((o) => {
    if (transitionInTrackIds.includes(o.id)) transitionInTrack[o.id] = o;
  });
  const groupedItems = groupTrackItems({
    trackItemIds: cloneDeep(itemIds),
    transitionsMap: cloneDeep(transitionInTrack),
    trackItemsMap: cloneDeep(itemInTrack)
  });
  initialTrackPoints.push(0);
  groupedItems.forEach((group) => {
    if (group.length === 1) {
      const obj = canvas.getObjects().find((o) => o.id === group[0].id)!;
      if (!activeIds.includes(obj.id)) {
        // initialTrackPoints.push(obj.left);
        initialTrackPoints.push(obj.left + obj.width);
      }
    } else {
      // const firstItem = group[0];
      const lastItem = group[group.length - 1];
      const lastObj = canvas.getObjects().find((o) => o.id === lastItem.id)!;
      // const firstObj = canvas.getObjects().find((o) => o.id === firstItem.id)!;
      // initialTrackPoints.push(firstObj.left);
      initialTrackPoints.push(lastObj.width + lastObj.left);
    }
  });
}

function selectClosestHelper(canvas: Canvas, pointY: number): void {
  const overTracks = canvas.getObjects("Helper");
  const closestHelp = overTracks.reduce((prev: FabricObject, curr: FabricObject) =>
    Math.abs(curr.top - pointY) < Math.abs(prev.top - pointY) ? curr : prev
  ) as Helper;
  closestHelp.setSelected(true);
}

const getPlaceholderPosition = (
  canvas: Timeline,
  draggedObject: FabricObject,
  trackObjects: FabricObject[],
  pointer: Point,
  overObject?: FabricObject
): { top: number; left: number; isInvalidDrop?: boolean } => {
  const isObjectAccepted = isObjectAcceptedByTrack(canvas, draggedObject);
  if (!isObjectAccepted && draggedObject instanceof PreviewTrackItem) {
    return {
      top: 0,
      left: 0,
      isInvalidDrop: true
    };
  }

  if (!isObjectAccepted) {
    return getInitialPlaceholderPosition(canvas);
  }

  if (overObject) {
    if (draggedObject instanceof PreviewTrackItem) {
      return {
        top: 0,
        left: 0,
        isInvalidDrop: true
      };
    }
    return getOverlapPlaceholderPosition(
      canvas,
      draggedObject,
      overObject,
      trackObjects,
      pointer
    );
  }

  return getDefaultPlaceholderPosition(canvas, draggedObject);
};

export function addPlaceholderEvents(timeline: Timeline) {
  timeline.on("mouse:up", onMouseUp.bind(timeline));
  timeline.on("object:moving", onObjectMovingForPlaceholder);
}

export function removePlaceholderEvents(timeline: Timeline) {
  timeline.off("mouse:up", onMouseUp.bind(timeline));
  timeline.off("object:moving", onObjectMovingForPlaceholder);
}
