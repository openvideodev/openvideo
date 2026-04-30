import Timeline from "../../timeline";

import {
  BasicTransformEvent,
  FabricObject,
  FabricObjectProps,
  ObjectEvents,
  SerializedObjectProps,
  TPointerEvent
} from "fabric";
import { unitsToTimeUs } from "../../utils";
import { Trimmable } from "../../objects";

export default function onObjectResizing(
  this: Timeline,
  e: BasicTransformEvent<TPointerEvent> & {
    target: FabricObject<
      Partial<FabricObjectProps>,
      SerializedObjectProps,
      ObjectEvents
    >;
  }
) {
  const canvas = this;
  const target = e.target;
  const transform = e.transform;

  if (transform.action === "resizing") {
    const otherObjects = canvas.getObjects().filter((obj) => {
      return (
        obj !== target &&
        !["Track", "Helper", "Transition", "Placeholder"].includes(obj.type)
      );
    });

    const SNAP_THRESHOLD = 10;

    // Store original dimensions
    const originalLeft = target.left;
    const originalWidth = target.width * target.scaleX;
    const originalRight = originalLeft + originalWidth;

    let snapped = false;

    otherObjects.forEach((obj) => {
      if (snapped) return;

      const objBounds = obj.getBoundingRect();
      const objLeft = objBounds.left;
      const objRight = objBounds.left + objBounds.width;

      if (transform.corner === "mr") {
        // When resizing from right, check both left and right edges
        const rightDiff = Math.abs(originalRight - objRight);
        const rightToLeftDiff = Math.abs(originalRight - objLeft);
        const minTimeToUnits = unitsToTimeUs(1, target.tScale);
        if (rightDiff < SNAP_THRESHOLD) {
          if (target instanceof Trimmable) {
            const newWidth = objRight - target.left;
            const diffSize = newWidth - originalWidth;
            const diffTime = unitsToTimeUs(
              diffSize,
              target.tScale,
              target.playbackRate
            );
            const newTo = target.trim.to + diffTime;
            if (newWidth < minTimeToUnits) return;

            if (newTo <= target.duration) {
              target.set({
                width: newWidth,
                scaleX: 1
              });
              target.trim.to = newTo;
              if (target.onResizeSnap) {
                target.onResizeSnap();
              }
              snapped = true;
            }
          } else {
            target.set({
              width: objRight - target.left,
              scaleX: 1
            });
            if (target.onResizeSnap) {
              target.onResizeSnap();
            }
            snapped = true;
          }
        } else if (rightToLeftDiff < SNAP_THRESHOLD) {
          if (target instanceof Trimmable) {
            const newWidth = objLeft - target.left;
            const diffSize = newWidth - originalWidth;
            const diffTime = unitsToTimeUs(
              diffSize,
              target.tScale,
              target.playbackRate
            );
            const newTo = target.trim.to + diffTime;
            if (newWidth < minTimeToUnits) return;

            if (newTo <= target.duration) {
              target.set({
                width: newWidth,
                scaleX: 1
              });
              target.trim.to = newTo;
              if (target.onResizeSnap) {
                target.onResizeSnap();
              }
              snapped = true;
            }
          } else {
            target.set({
              width: objLeft - target.left,
              scaleX: 1
            });
            if (target.onResizeSnap) {
              target.onResizeSnap();
            }
            snapped = true;
          }
        }
      } else if (transform.corner === "ml") {
        // When resizing from left, check both left and right edges
        const leftDiff = Math.abs(originalLeft - objLeft);
        const leftToRightDiff = Math.abs(originalLeft - objRight);

        if (leftDiff < SNAP_THRESHOLD) {
          if (target instanceof Trimmable) {
            const newWidth = originalRight - objLeft;
            const diffSize = newWidth - originalWidth;
            const diffTime = unitsToTimeUs(
              diffSize,
              target.tScale,
              target.playbackRate
            );
            const newFrom = target.trim.from - diffTime;

            if (newFrom >= 0) {
              target.set({
                left: objLeft,
                width: newWidth,
                scaleX: 1
              });
              target.trim.from = newFrom;
              if (target.onResizeSnap) target.onResizeSnap();
              snapped = true;
            }
          } else {
            target.set({
              left: objLeft,
              width: originalRight - objLeft,
              scaleX: 1
            });
            if (target.onResizeSnap) target.onResizeSnap();
            snapped = true;
          }
        } else if (leftToRightDiff < SNAP_THRESHOLD) {
          if (target instanceof Trimmable) {
            const newWidth = originalRight - objRight;
            const diffSize = newWidth - originalWidth;
            const diffTime = unitsToTimeUs(
              diffSize,
              target.tScale,
              target.playbackRate
            );
            const newFrom = target.trim.from - diffTime;

            if (newFrom >= 0) {
              target.set({
                left: objRight,
                width: newWidth,
                scaleX: 1
              });
              target.trim.from = newFrom;
              if (target.onResizeSnap) target.onResizeSnap();
              snapped = true;
            }
          } else {
            target.set({
              left: objRight,
              width: originalRight - objRight,
              scaleX: 1
            });
            if (target.onResizeSnap) target.onResizeSnap();
            snapped = true;
          }
        }
      }
    });

    if (snapped) {
      target.setCoords();
      canvas.requestRenderAll();
    }
  }
}

export function addResizingEvents(timeline: Timeline) {
  timeline.on("object:resizing", onObjectResizing.bind(timeline));
}

export function removeResizingEvents(timeline: Timeline) {
  timeline.off("object:resizing", onObjectResizing.bind(timeline));
}
