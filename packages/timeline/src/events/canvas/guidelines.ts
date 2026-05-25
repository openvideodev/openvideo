import {
  BasicTransformEvent,
  FabricObject,
  FabricObjectProps,
  ModifiedEvent,
  ObjectEvents,
  SerializedObjectProps,
  TPointerEvent,
} from "fabric";

import {
  clearAuxiliaryObjects,
  drawGuides,
  getGuides,
  getLineGuideStops,
  getObjectSnappingEdges,
} from "../../utils/guideline";
import { clearTrackHelperGuides, isHelperTrack } from "../../utils/canvas";
import Timeline from "../../timeline";
import { Track, Helper } from "../../objects";

export function onObjectMoving(this: Timeline, e: ModifiedEvent<TPointerEvent>) {
  const canvas = this;
  if (!canvas) return;
  const state = this.dragStateManager.getState();
  const enableGuideRedraw = state.enableGuideRedraw;
  const pointer = canvas.getScenePoint(e.e!);

  const overTracks = canvas.getObjects("Helper", "Track");

  const draggingOverTrack = overTracks.find((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      pointer.x >= objRect.left &&
      pointer.x <= objRect.left + objRect.width &&
      pointer.y >= objRect.top &&
      pointer.y <= objRect.top + objRect.height
    );
  }) as Track | Helper | undefined;

  this.dragStateManager.setState({ draggingOverTrack });

  // set selected state of helper tracks
  overTracks.forEach((obj) => {
    if (isHelperTrack(obj)) {
      if (obj === draggingOverTrack) {
        obj.setSelected(true);
      } else {
        obj.setSelected(false);
      }
    }
  });

  if (isHelperTrack(draggingOverTrack)) {
    this.dragStateManager.setState({ isPointerOverHelperTrack: true });
  } else {
    this.dragStateManager.setState({ isPointerOverHelperTrack: false });
  }

  const allObjects = canvas.getObjects();
  const target = e.target;
  const targetRect = target.getBoundingRect();

  target.setCoords();

  // Skip active objects and selection
  const skipObjects = [
    target,
    ...canvas.getActiveObjects(),
    ...canvas.getObjects("Track", "Helper", "Transition", "Placeholder"),
  ];

  // find possible snapping lines
  const lineGuideStops = getLineGuideStops(skipObjects, canvas);

  // find snapping points of current object
  const itemBounds = getObjectSnappingEdges(target);
  // now find where can we snap current object
  const guides = getGuides(lineGuideStops, itemBounds);
  // throttled drawing of lines
  if (enableGuideRedraw) {
    // clear all previous lines on the screen
    clearAuxiliaryObjects(canvas, allObjects);
    if (guides.length) {
      drawGuides(guides, targetRect, canvas);
    }
    // enableGuideRedraw = false;
    this.dragStateManager.setState({ enableGuideRedraw: false });
    setTimeout(() => this.dragStateManager.setState({ enableGuideRedraw: true }), 50);
  }
  // now force object position
  guides.forEach((lineGuide) => {
    if (lineGuide.orientation === "V") {
      target.left = lineGuide.lineGuide + lineGuide.offset;
    } else {
      target.top = lineGuide.lineGuide + lineGuide.offset;
    }
  });
}

function onObjectModified(this: Timeline, e: ModifiedEvent<TPointerEvent>) {
  const canvas = e.target.canvas;
  if (!canvas) return;
  clearAuxiliaryObjects(canvas, canvas.getObjects());
  clearTrackHelperGuides(canvas.getObjects("Helper"));

  this.dragStateManager.setState({
    draggingOverTrack: null,
    isPointerOverHelperTrack: false,
  });
}

function onObjectResizing(
  this: Timeline,
  e: BasicTransformEvent<TPointerEvent> & {
    target: FabricObject<Partial<FabricObjectProps>, SerializedObjectProps, ObjectEvents>;
  },
) {
  const canvas = this;
  const allObjects = canvas.getObjects();
  const target = e.target;
  const transform = e.transform;
  const corner = canvas._currentTransform?.corner;
  const targetRect = target.getBoundingRect();

  if (transform.action === "resizing") {
    // Skip active objects and selection
    const skipObjects = [
      target,
      ...canvas.getActiveObjects(),
      ...canvas.getObjects("Track", "Helper", "Transition", "Placeholder"),
    ];

    // find possible snapping lines
    const lineGuideStops = getLineGuideStops(skipObjects, canvas);
    const validatelineGuideStopsVertical = lineGuideStops.vertical.filter((dataV) => {
      const val = dataV.val;
      if (corner === "ml") {
        return val <= targetRect.left;
      } else if (corner === "mr") {
        return val >= targetRect.left + targetRect.width;
      }
    });
    lineGuideStops.vertical = validatelineGuideStopsVertical;
    const itemBounds = getObjectSnappingEdges(target);
    const guides = getGuides(lineGuideStops, itemBounds);
    clearAuxiliaryObjects(canvas, allObjects);
    if (guides.length) {
      drawGuides(guides, targetRect, canvas);
    }
  }
}

export function addGuidelineEvents(timeline: Timeline) {
  timeline.on("object:moving", onObjectMoving.bind(timeline));
  timeline.on("object:modified", onObjectModified.bind(timeline));
  timeline.on("object:resizing", onObjectResizing.bind(timeline));
}

export function removeGuidelineEvents(timeline: Timeline) {
  timeline.off("object:moving", onObjectMoving.bind(timeline));
  timeline.off("object:modified", onObjectModified.bind(timeline));
  timeline.off("object:resizing", onObjectResizing.bind(timeline));
}
