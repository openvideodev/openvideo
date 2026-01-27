import { ActiveSelection, FabricObject } from 'fabric';
import type { Track } from '../track';
import type Timeline from '../canvas';

/**
 * Utility to get the cursor Y position and check for separator intersection
 * during pointer events (moving, modification, dragging).
 */
export function getSeparatorAtEvent(timeline: Timeline, e: any) {
  const pointer = timeline.canvas.getPointer(e);
  const cursorY = pointer.y;
  const potentialSeparator = timeline.checkSeparatorIntersection(cursorY);

  return {
    cursorY,
    potentialSeparator,
  };
}

export function getHoveredObjects(
  items: FabricObject[],
  activeObject: ActiveSelection | FabricObject
) {
  if (activeObject instanceof ActiveSelection) {
    const activeItems = activeObject.getObjects();
    return items.filter((item) =>
      activeItems.some((activeItem) => activeItem.intersectsWithObject(item))
    );
  } else {
    return items.filter((item) => activeObject.intersectsWithObject(item));
  }
}

export function getTrackAtEvent(
  tracks: Track[],
  e: MouseEvent | TouchEvent | PointerEvent,
  timeline: Timeline
) {
  const pointer = timeline.canvas.getPointer(e);
  return tracks.find((track) => track.containsPoint(pointer));
}
