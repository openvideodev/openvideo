import { ModifiedEvent, TPointerEvent } from "fabric";
import Timeline from "../../timeline";

const SHOULD_SCROLL_RANGE_X = 100;
const SHOULD_SCROLL_RANGE_Y = 0;
const SCROLL_SPEED = 5;
const MIN_SCROLL_SPEED = 3;
const MAX_SCROLL_SPEED = 25;

interface ScrollState {
  scrollInterval: NodeJS.Timeout | null;
}

const state: ScrollState = {
  scrollInterval: null
};

function calculateScrollSpeed(distance: number): number {
  const speedRange = MAX_SCROLL_SPEED - MIN_SCROLL_SPEED;
  const speedFactor =
    (SHOULD_SCROLL_RANGE_X - distance) / SHOULD_SCROLL_RANGE_X;
  return MIN_SCROLL_SPEED + speedRange * speedFactor;
}

function startAutoScroll(timeline: Timeline, e: ModifiedEvent<TPointerEvent>) {
  if (state.scrollInterval) {
    clearInterval(state.scrollInterval);
  }

  const target = e.target;
  const targetBounds = target.getBoundingRect();

  state.scrollInterval = setInterval(() => {
    const vt = timeline.viewportTransform;
    // Use viewport point to check scroll boundaries
    const pointer = timeline.getViewportPoint(e.e!);

    // handle scroll right
    if (
      pointer.x > timeline.width - SHOULD_SCROLL_RANGE_X &&
      target.left + targetBounds.width < timeline.bounding.width
    ) {
      const scrollSpeed = calculateScrollSpeed(timeline.width - pointer.x);
      target.set("left", target.left + scrollSpeed);
      timeline.setViewportPos(vt[4] - scrollSpeed, vt[5]);
    }

    // Handle scroll left
    if (
      pointer.x < SHOULD_SCROLL_RANGE_X &&
      target.left > 0 &&
      vt[4] < SHOULD_SCROLL_RANGE_X &&
      vt[4] < timeline.spacing.left
    ) {
      const scrollSpeed = calculateScrollSpeed(pointer.x);

      target.set("left", target.left - scrollSpeed);
      timeline.setViewportPos(vt[4] + scrollSpeed, vt[5]);
    }

    // Handle scroll down
    if (
      pointer.y > timeline.height - SHOULD_SCROLL_RANGE_Y &&
      target.top + targetBounds.height < timeline.bounding.height + 80
    ) {
      target.set("top", target.top + SCROLL_SPEED);
      timeline.setViewportPos(vt[4], vt[5] - SCROLL_SPEED);
    }

    // Handle scroll up
    if (
      pointer.y < SHOULD_SCROLL_RANGE_Y &&
      target.top > -80 &&
      -vt[5] > SHOULD_SCROLL_RANGE_Y
    ) {
      target.set("top", target.top - SCROLL_SPEED);
      timeline.setViewportPos(vt[4], vt[5] + SCROLL_SPEED);
    }

    target.setCoords();
    timeline.requestRenderAll();
  }, 16);
}

function stopAutoScroll() {
  if (state.scrollInterval) {
    clearInterval(state.scrollInterval);
    state.scrollInterval = null;
  }
}

export function onMouseUpForScroll() {
  stopAutoScroll();
}

export function scrollOnMovingForScroll(
  this: Timeline,
  e: ModifiedEvent<TPointerEvent>
) {
  startAutoScroll(this, e);
}

export function addScrollEvents(timeline: Timeline) {
  timeline.on("mouse:up", onMouseUpForScroll);
  timeline.on("object:moving", scrollOnMovingForScroll.bind(timeline));
}

export function removeScrollEvents(timeline: Timeline) {
  timeline.off("mouse:up", onMouseUpForScroll);
  timeline.off("object:moving", scrollOnMovingForScroll.bind(timeline));
}
