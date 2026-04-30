import Timeline from "../../timeline";
import { addResizingEvents, removeResizingEvents } from "./resizing";
import { addScrollEvents, removeScrollEvents } from "./scrolling";
import { addResizedEvents, removeResizedEvents } from "./resized";
import { addGuidelineEvents, removeGuidelineEvents } from "./guidelines";
import {
  addBeforeTransformEvents,
  removeBeforeTransformEvents
} from "./before-transform";
import { addPlaceholderEvents, removePlaceholderEvents } from "./placeholder";
import { addModifiedEvents, removeModifiedEvents } from "./modified";

import { addDragEvents, removeDragEvents } from "./drag";
import { addSelectionEvents, removeSelectionEvents } from "./selection";
import { addMovingEvents, removeMovingEvents } from "./moving";
import {
  addHoverControlEvents,
  removeHoverControlsEvents
} from "./hover-control";

export const addCanvasEvents = (timeline: Timeline) => {
  timeline.dragStateManager.setState({ canvas: timeline });
  addScrollEvents(timeline);
  addResizingEvents(timeline);
  addResizedEvents(timeline);
  addGuidelineEvents(timeline);
  addBeforeTransformEvents(timeline);
  addPlaceholderEvents(timeline);
  addModifiedEvents(timeline);
  addDragEvents(timeline);
  addSelectionEvents(timeline);
  addMovingEvents(timeline);
  addHoverControlEvents(timeline);
};

export const removeCanvasEvents = (timeline: Timeline) => {
  timeline.dragStateManager.setState({ canvas: null });
  removeScrollEvents(timeline);
  removeResizingEvents(timeline);
  removeResizedEvents(timeline);
  removeGuidelineEvents(timeline);
  removeBeforeTransformEvents(timeline);
  removePlaceholderEvents(timeline);
  removeModifiedEvents(timeline);
  removeDragEvents(timeline);
  removeSelectionEvents(timeline);
  removeMovingEvents(timeline);
  removeHoverControlsEvents(timeline);
};
