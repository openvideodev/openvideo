import { TransformActionHandler, controlsUtils } from "fabric";
import { CENTER, LEFT, RIGHT } from "../constants/fabric";
import { isTransformCentered, wrapWithFixedAnchor } from "../utils/fabric";
import { resolveOrigin, unitsToTimeUs } from "../utils";

const { wrapWithFireEvent, getLocalPoint } = controlsUtils;

export const changeTransitionWidth: TransformActionHandler = (_, transform, x, y) => {
  const localPoint = getLocalPoint(transform, transform.originX, transform.originY, x, y);
  //  make sure the control changes width ONLY from it's side of target
  if (
    resolveOrigin(transform.originX) === resolveOrigin(CENTER) ||
    (resolveOrigin(transform.originX) === resolveOrigin(RIGHT) && localPoint.x < 0) ||
    (resolveOrigin(transform.originX) === resolveOrigin(LEFT) && localPoint.x > 0)
  ) {
    const { target } = transform,
      strokePadding = target.strokeWidth / (target.strokeUniform ? target.scaleX : 1),
      multiplier = isTransformCentered(transform) ? 2 : 1,
      oldWidth = target.width,
      newWidth = Math.ceil(Math.abs((localPoint.x * multiplier) / target.scaleX) - strokePadding);
    const nextDuration = unitsToTimeUs(newWidth, target.tScale, target.playbackRate);
    if (nextDuration >= 1_500_000) {
      return false;
    } else if (nextDuration < 500_000) {
      return false;
    }
    target.set("width", Math.max(newWidth, 0));
    target.set("duration", nextDuration);
    //  check against actual target width in case `newWidth` was rejected
    return oldWidth !== target.width;
  }
  return false;
};

export const resizeTransitionWidth = wrapWithFireEvent(
  "resizing",
  wrapWithFixedAnchor(changeTransitionWidth),
);
