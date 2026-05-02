import { TransformActionHandler, controlsUtils } from 'fabric';
import { resolveOrigin } from '../utils/resolve-origin';
import { isTransformCentered } from '../utils/fabric';
import { CENTER, LEFT, RIGHT } from '../constants/fabric';
import { unitsToTimeUs } from '../utils';

const { wrapWithFireEvent, getLocalPoint, wrapWithFixedAnchor } = controlsUtils;

/**
 * Action handler to change object's width
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export const changeObjectWidth: TransformActionHandler = (
  _,
  transform,
  x,
  y
) => {
  const localPoint = getLocalPoint(
    transform,
    transform.originX,
    transform.originY,
    x,
    y
  );
  //  make sure the control changes width ONLY from it's side of target
  if (
    resolveOrigin(transform.originX) === resolveOrigin(CENTER) ||
    (resolveOrigin(transform.originX) === resolveOrigin(RIGHT) &&
      localPoint.x < 0) ||
    (resolveOrigin(transform.originX) === resolveOrigin(LEFT) &&
      localPoint.x > 0)
  ) {
    const { target } = transform,
      strokePadding =
        target.strokeWidth / (target.strokeUniform ? target.scaleX : 1),
      multiplier = isTransformCentered(transform) ? 2 : 1,
      oldWidth = target.width,
      newWidth = Math.ceil(
        Math.abs((localPoint.x * multiplier) / target.scaleX) - strokePadding
      );

    const fromLeft = transform.corner === 'ml';
    if (target.left < 0) return false;
    if (fromLeft) {
      // check if the object is out of the canvas
      const diffPos = oldWidth - newWidth;
      const nextLeft = target.left + diffPos;
      if (nextLeft < 0) {
        target.set('width', target.width + target.left);
        return true;
      }
    }
    const minTimeToUnits = unitsToTimeUs(1, target.tScale);
    const widthToTime = unitsToTimeUs(
      newWidth,
      target.tScale,
      target.playbackRate
    );
    if (widthToTime < minTimeToUnits) return false;
    target.set('width', Math.max(newWidth, 0));
    //  check against actual target width in case `newWidth` was rejected
    return oldWidth !== target.width;
  }
  return false;
};

export const changeWidth = wrapWithFireEvent(
  'resizing',
  wrapWithFixedAnchor(changeObjectWidth)
);
