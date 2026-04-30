import {
  DragEventData,
  DropEventData,
  FabricObject,
  Point,
  classRegistry
} from "fabric";
import { cloneDeep, pick } from "lodash-es";
import Timeline from "../../timeline";
import {
  Helper,
  Placeholder,
  PreviewTrackItem,
  Track,
  Transition
} from "../../objects";
import TransitionGuide from "../../objects/transition-guide";
import { DRAG_END, DRAG_START } from "../../global";
import { generateId, timeUsToUnits, unitsToTimeUs } from "../../utils";
import {
  clearPlaceholderObjects,
  clearTrackHelperGuides
} from "../../utils/canvas";
import { clearAuxiliaryObjects } from "../../utils/guideline";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../../constants/constants";
import {
  GroupElement,
  groupByTransition
} from "../../utils/group-by-transition";
import { IClip } from "@designcombo/types";

// Removed hardcoded ALLOWED_DROP_TYPES

let previewItem: TransitionGuide | PreviewTrackItem;
let nextTransition: Transition;
let transitions: Transition[] = [];
let draggedTypeItem: string = "";

function findNearestObjectToPoint(
  point: Point,
  objects: Transition[]
): Transition | null {
  let minDistance = Infinity;
  let nearestObject: Transition | null = null;

  const centerPoint = new Point(point.x, point.y);

  objects.forEach((obj: Transition) => {
    const distance = Math.sqrt(
      Math.pow(obj.left - centerPoint.x, 2) +
        Math.pow(obj.top - centerPoint.y, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestObject = obj;
    }
  });
  return nearestObject;
}

const createPreviewTrackItem = ({
  width,
  height,
  id,
  left,
  top,
  type,
  duration
}: {
  width: number;
  height: number;
  id: string;
  left: number;
  top: number;
  type: string;
  duration: number;
}) => {
  if (type === "transition") {
    return new TransitionGuide({
      top: 0,
      left: 0,
      height: 48,
      width: 48,
      id: "TransitionGuide"
    });
  }
  const Klass =
    (classRegistry.getClass("PreviewTrackItem") as typeof PreviewTrackItem) ||
    PreviewTrackItem;
  return new Klass({
    top,
    left,
    height,
    width,
    id,
    type,
    duration
  });
};

function onDragEnter(this: Timeline, e: DragEventData) {
  // Get the drag data
  const draggedDataString = e.e.dataTransfer?.types[0] as string;
  if (!draggedDataString) return;
  const draggedData = JSON.parse(draggedDataString);
  const draggedType = draggedData.type;
  if (draggedType !== "transition" && !this.itemTypes.includes(draggedType.toLowerCase())) return;

  const duration = draggedData.duration ? draggedData.duration * 1_000_000 : 5_000_000;
  const canvas = this;
  canvas.discardActiveObject();
  canvas.setActiveIds([]);

  const width = timeUsToUnits(duration, this.tScale);
  const height = canvas.getItemSize(draggedType);
  const items = canvas.itemsManager.getTrackItems();

  previewItem = createPreviewTrackItem({
    width: width,
    height: height,
    id: "TransitionGuide",
    left: 0,
    top: 0,
    type: draggedType,
    duration
  });
  previewItem.visible = false;
  draggedTypeItem = draggedType;
  if (draggedType === "transition") {
    transitions = canvas.getObjects("Transition") as Transition[];
    const appliedTransitions = transitions.filter((t) => t.kind !== "none");
    transitions.forEach((obj) => {
      console.log(obj)
      const toObj = items.find((i) => i.id === obj.toId);
      const fromObj = items.find((i) => i.id === obj.fromId);
      const previewItemWidth = obj.width;
      if (
        !(
          (toObj?.width || 0) >= previewItemWidth / 2 &&
          (fromObj?.width || 0) >= previewItemWidth / 2
        )
      ) {
        obj.availableDrop = false;
      }
      const toTransitionToObj = appliedTransitions.find(
        (t) => t.fromId === obj.toId
      );
      if (toTransitionToObj) {
        if (
          toTransitionToObj.width + previewItemWidth / 2 >=
          (toObj?.width || 0)
        ) {
          obj.availableDrop = false;
        }
      }
      const fromTransitionFromObj = appliedTransitions.find(
        (t) => t.toId === obj.fromId
      );
      if (fromTransitionFromObj) {
        if (
          fromTransitionFromObj.width + previewItemWidth / 2 >=
          (fromObj?.width || 0)
        ) {
          obj.availableDrop = false;
        }
      }
      obj.visible = true;
    });
  }

  const state = this.dragStateManager.getState();

  canvas.trackIdAfterTransform = "";
  canvas.positionAfterTransform = {};
  const activeSelection = previewItem;
  const activeObjects = [previewItem];
  this.dragStateManager.setState({
    activeTrackToItemsMap: {},
    primaryTracks: {},
    secondaryTracks: {},
    trackTops: [],
    trackToItemsMap: {},
    activeObjects: [],
    trackTopToIdMap: {},
    isDragOver: false
  });

  this.dragStateManager.setState({ activeObjects });

  const tracks = canvas.getObjects("Track") as Track[];

  const allTrackItems = canvas.itemsManager.getTrackItems();

  // populate trackToItemsMap and trackTopToIdMap
  tracks.forEach((track: Track) => {
    const trackItems = allTrackItems.filter((obj) => {
      return track.clipIds.includes(obj.id);
    });
    state.trackToItemsMap[track.id] = trackItems;
    state.trackTopToIdMap[track.top] = track.id;
    state.trackTops.push(track.top);
  });

  // ordered track tops
  state.trackTops.sort((a, b) => a - b);

  // drag start pointer position in targets
  state.primaryMovingObjects = activeObjects;

  // order primaryMovingObjects by left position
  state.primaryMovingObjects = state.primaryMovingObjects.sort(
    (a, b) => a.left - b.left
  );

  if (activeSelection) {
    canvas.positionBeforeTransform = {
      top: activeSelection.top,
      left: activeSelection.left
    };
  }

  state.placeholderMovingObjects = state.primaryMovingObjects.map((target) => {
    const targetBounds = target.getBoundingRect();

    state.objectInitialPositions[target.id] = {
      top: targetBounds.top,
      left: targetBounds.left
    };
    const targetPlaceholder = new Placeholder({
      id: `${target.id}-placeholder`,
      left: targetBounds.left,
      top: targetBounds.top,
      width: targetBounds.width,
      height: targetBounds.height
    });
    targetPlaceholder.visible = false;
    targetPlaceholder.draggedObject = target;
    return targetPlaceholder;
  });

  canvas.add(...state.placeholderMovingObjects);
  canvas.add(previewItem);

  this.emitter.emit(DRAG_START);
}

const clearData = (canvas: Timeline) => {
  const state = canvas.dragStateManager.getState();
  clearPlaceholderObjects(canvas, state.placeholderMovingObjects);
  if (!canvas) return;
  clearAuxiliaryObjects(canvas, canvas.getObjects());
  clearTrackHelperGuides(canvas.getObjects("Helper"));
};

function onDragLeave(this: Timeline) {
  draggedTypeItem = "";
  clearData(this);
  this.dragStateManager.setState({
    draggingOverTrack: null,
    isPointerOverHelperTrack: false
  });
  if (!previewItem) return;

  this.emitter.emit(DRAG_END);
  // get the canvas
  const canvas = this;
  transitions.forEach((obj) => {
    obj.strokeDashArray = [];
    obj.setSelected(false);
    if (obj.kind === "none") {
      obj.visible = false;
    }
  });

  canvas.getObjects("Helper", "Track").forEach((obj) => {
    if (obj.setSelected) {
      obj.setSelected(false);
    }
  });

  canvas.remove(previewItem);
}

function onDragOver(this: Timeline, e: DragEventData) {
  const state = this.dragStateManager.getState();
  const placeholderMoving = state.placeholderMovingObjects[0];
  if (!placeholderMoving.visible) {
    previewItem.visible = true;
    placeholderMoving.visible = true;
  }
  if (state.activeObjects[0] instanceof TransitionGuide)
    placeholderMoving.visible = false;
  if (!previewItem) return false;

  e.e.preventDefault();

  const canvas = this;
  const point = canvas.getScenePoint(e.e);

  previewItem.set({
    left: point.x - TIMELINE_OFFSET_CANVAS_LEFT,
    top: point.y - previewItem.height / 2
  });

  const nearestObjectToPoint = findNearestObjectToPoint(
    point,
    transitions.filter((t) => t.availableDrop)
  );

  if (nearestObjectToPoint) {
    nextTransition = nearestObjectToPoint;
    nearestObjectToPoint.strokeDashArray = [5, 1];
    nearestObjectToPoint.setSelected(true);
  }
  transitions.forEach((obj) => {
    if (!(obj === nearestObjectToPoint)) {
      obj.setSelected(false);
    }
  });
  this.dragStateManager.setState({ isDragOver: true });
  previewItem.setCoords();
  const transform = {
    target: previewItem,
    action: "drag",
    originX: "center",
    originY: "center",
    offsetX: point.x - previewItem.left,
    offsetY: point.y - previewItem.top,
    scaleX: previewItem.scaleX,
    scaleY: previewItem.scaleY
  };

  state.activeObjects[0].type !== "transitionguide" &&
    canvas.fire("object:moving", {
      target: previewItem,
      e: e.e as any,
      pointer: point,
      transform: transform as any
    });
  const itemTypes = this.itemTypes;
  if (itemTypes.includes(draggedTypeItem)) {
    if (state.draggingOverTrack instanceof Track) {
      this.dragStateManager.setState({ isPointerOverHelperTrack: false });
      const activeLeft = state.activeObjects[0].left;
      const activeRight =
        state.activeObjects[0].left + state.activeObjects[0].width;
      let isOverlapping = false;
      const itemIds = state.draggingOverTrack.clipIds;

      canvas
        .getObjects()
        .filter((obj) => itemIds.includes(obj.id))
        .forEach((obj) => {
          if (obj.left <= activeLeft && obj.left + obj.width >= activeLeft) {
            isOverlapping = true;
          } else if (
            obj.left <= activeRight &&
            obj.left + obj.width >= activeRight
          ) {
            isOverlapping = true;
          } else if (
            activeLeft <= obj.left &&
            activeRight >= obj.left + obj.width
          ) {
            isOverlapping = true;
          }
        });

      if (
        state.draggingOverTrack.accepts.includes(draggedTypeItem) &&
        !isOverlapping
      ) {
        state.placeholderMovingObjects[0].left = state.activeObjects[0].left;
        state.placeholderMovingObjects[0].top = state.draggingOverTrack.top;
        canvas.getObjects("Helper").forEach((obj) => {
          if (obj.setSelected) {
            obj.setSelected(false);
          }
        });
      } else {
        state.placeholderMovingObjects.forEach((obj) => {
          obj.opacity = 0;
        });
      }
    } else if (state.draggingOverTrack instanceof Helper) {
      this.dragStateManager.setState({ isPointerOverHelperTrack: true });
      state.draggingOverTrack.setSelected(true);
    }
  }

  canvas.requestRenderAll();
}

function onDrop(this: Timeline, e: DropEventData) {
  draggedTypeItem = "";
  const canvas = this;
  clearData(canvas);
  const state = this.dragStateManager.getState();
  const overTrack = state.draggingOverTrack;
  this.dragStateManager.setState({
    draggingOverTrack: null,
    isPointerOverHelperTrack: false
  });
  // Get the drag data
  const draggedDataString = e.e.dataTransfer?.types[0] as string;
  // const draggedData = JSON.parse(draggedDataString);
  const draggedData = JSON.parse(e.e.dataTransfer!.getData(draggedDataString));
  if (draggedData.type !== "transition") {
    const previewItem = state.activeObjects[0];
    // Use previewItem.left directly as it's already in canvas coordinates (considering scroll)
    const positionXInTime = unitsToTimeUs(previewItem.left, canvas.tScale);
    if (overTrack instanceof Track) {
      const placeholder = state.placeholderMovingObjects[0];
      // add an item when the track is accepted
      if (placeholder.opacity !== 0) {
        const index = getIndexHelper(overTrack, this.getObjects("Track"));
        if (overTrack.magnetic) {
          const mostRight =
            state.initialTrackPoints[state.initialTrackPoints.length - 1];
          const positionXInTime = unitsToTimeUs(mostRight, canvas.tScale) || 0;
          addItem(canvas, draggedData, index, positionXInTime);
        } else addItem(canvas, draggedData, index, positionXInTime);
      }
      // add an item when it is not accepted in the track
      else {
        // Calculate position from viewport point considering scroll
        const scenePoint = canvas.getScenePoint(e.e);
        const positionXInTimeFromPoint = unitsToTimeUs(
          scenePoint.x,
          canvas.tScale
        );
        const pointY = scenePoint.y;
        const helpers = canvas.getObjects("Helper");
        const closestHelp = helpers.reduce((prev, curr) =>
          Math.abs(curr.top - pointY) < Math.abs(prev.top - pointY)
            ? curr
            : prev
        );
        const index = getIndexHelper(closestHelp, this.getObjects("Track"));
        addItem(canvas, draggedData, index, positionXInTimeFromPoint, true);
      }
    } else {
      // add an item to a new track
      // Calculate position from viewport point considering scroll
      const scenePoint = canvas.getScenePoint(e.e);
      const positionXInTimeFromPoint = unitsToTimeUs(
        scenePoint.x,
        canvas.tScale
      );
      const index = getIndexHelper(
        overTrack as unknown as Helper,
        this.getObjects("Track")
      );
      addItem(canvas, draggedData, index, positionXInTimeFromPoint, true);
    }

    this.remove(previewItem);
    this.requestRenderAll();
    return;
  }

  if (!previewItem) return;

  if (nextTransition) {
    const transitionId = nextTransition.id;
    const propstoUpdate = pick(draggedData, ["kind", "direction"]);
    // assign the new props to the nextTransition
    Object.keys(propstoUpdate).forEach((key) => {
      if (key === "kind") {
        nextTransition.kind = propstoUpdate[key];
      } else {
        (nextTransition as any)[key] = (propstoUpdate as any)[key];
      }
    });

    const currentTrackItemIds = cloneDeep(this.trackItemIds);
    const currentTransitionsMap = cloneDeep(this.transitionsMap);
    const currentTrackItemsMap = cloneDeep(this.trackItemsMap);

    // find next transition gropu
    currentTransitionsMap[transitionId] = {
      ...currentTransitionsMap[transitionId],
      ...propstoUpdate
    };

    const nextTransitionGroup = groupByTransition({
      trackItemIds: currentTrackItemIds,
      transitionsMap: currentTransitionsMap,
      trackItemsMap: currentTrackItemsMap
    });
    const currentTransition = currentTransitionsMap[transitionId];
    const currentFrom = currentTransition.fromId;

    const fromTransitionGroupNext =
      nextTransitionGroup.find((tg) => {
        return tg.find((i) => i.id === currentFrom);
      }) || [];

    const nextTrackItems = adjustTrackItemsInTransition(
      fromTransitionGroupNext
    );
    const updatedTrackItemsMap = updateTrackItemsMap(
      this.trackItemsMap,
      nextTrackItems
    );

    /**
     * 1.Restore current transition groups
     * 2. Add new items to transition group
     * 3. Fix positioning for transition group
     * 4. Render it
     */

    this.trackItemsMap = updatedTrackItemsMap;
    this.transitionsMap[transitionId] = {
      ...this.transitionsMap[transitionId],
      ...propstoUpdate
    };

    // this.itemsManager.updateTrackItemCoords();
    this.tracksManager.adjustMagneticTrack();
    this.calcBounding();
    this.transitionManager.updateTransitions();

    this.tracksManager.refreshTrackLayout();
    this.updateState({ kind: "add:transition", updateHistory: true });
  }
  transitions.forEach((obj) => {
    obj.strokeDashArray = [];
    obj.setSelected(false);
    if (obj.kind === "none") {
      obj.visible = false;
    }
  });
  canvas.remove(previewItem);
  canvas.requestRenderAll();
  this.emitter.emit(DRAG_END);
}

// put track items sequentially, update its display as needed

const adjustTrackItemsInTransition = (items: GroupElement[]): IClip[] => {
  const [firstItem] = items as IClip[];
  const trackItems = items.filter(
    (item) => item.type !== "Transition"
  ) as IClip[];

  let cumulativeStart = firstItem.display.from;

  return trackItems.map((item) => {
    const duration = item.display.to - item.display.from;
    const updatedDisplay = {
      from: cumulativeStart,
      to: cumulativeStart + duration
    };
    cumulativeStart = updatedDisplay.to;

    return {
      ...item,
      display: updatedDisplay
    };
  });
};

const updateTrackItemsMap = (
  trackItemsMap: Record<string, IClip>,
  updatedTrackItems: IClip[]
) => {
  let updatedTrackItemsMap = trackItemsMap;
  updatedTrackItems.forEach((item) => {
    updatedTrackItemsMap[item.id] = item;
  });
  return updatedTrackItemsMap;
};

const getIndexHelper = (overTrack: FabricObject, tracks: FabricObject[]) => {
  const sortedTracks = tracks.sort((a, b) => a.top - b.top);
  if (sortedTracks.length === 0) return 0;

  const lastTrack = sortedTracks[sortedTracks.length - 1];
  if (lastTrack.top + lastTrack.height <= overTrack.top) {
    return sortedTracks.length;
  }
  const helperTop = (overTrack as unknown as Helper).top;
  const index = sortedTracks.reduce((closestIndex, current, index) => {
    const currentDiff = Math.abs(current.top - helperTop);
    const closestDiff = Math.abs(sortedTracks[closestIndex].top - helperTop);

    return currentDiff < closestDiff ? index : closestIndex;
  }, 0);
  return index;
};

const addItem = (
  canvas: Timeline,
  draggedData: any,
  index: number,
  position: number,
  isNewTrack?: boolean
) => {
  const type = draggedData.type.toLowerCase();
  canvas.emitter.emit(`add:${type}`, {
    payload: {
      ...draggedData,
      id: generateId(),
      display: { from: position }
    },
    options: { trackIndex: index, isNewTrack }
  });
};

export function addDragEvents(timeline: Timeline) {
  timeline.on("dragover", onDragOver);
  timeline.on("dragenter", onDragEnter);
  timeline.on("dragleave", onDragLeave);
  timeline.on("drop", onDrop);
}

export function removeDragEvents(timeline: Timeline) {
  timeline.off("dragover", onDragOver);
  timeline.off("dragenter", onDragEnter);
  timeline.off("dragleave", onDragLeave);
  timeline.off("drop", onDrop);
}
