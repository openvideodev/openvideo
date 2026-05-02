import { TransformActionHandler, controlsUtils } from 'fabric';
import { resolveOrigin } from '../utils/resolve-origin';
import { isTransformCentered, wrapWithFixedAnchor } from '../utils/fabric';
import { CENTER, LEFT, RIGHT } from '../constants/fabric';
import { timeUsToUnits, unitsToTimeUs } from '../utils';

const { wrapWithFireEvent, getLocalPoint } = controlsUtils;

/**
 * Action handler to change object's width
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export const changeTrimmableWidth: TransformActionHandler = (
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
    let { target }: { target: any } = transform,
      strokePadding =
        target.strokeWidth / (target.strokeUniform ? target.scaleX : 1),
      multiplier = isTransformCentered(transform) ? 2 : 1,
      oldWidth = target.width,
      newWidth = Math.ceil(
        Math.abs((localPoint.x * multiplier) / target.scaleX) - strokePadding
      );

    const minTimeToUnits = unitsToTimeUs(1, target.tScale);

    const fromRight = transform.corner === 'mr';

    if (fromRight) {
      const to = target.trim.to;

      const diffSize = newWidth - oldWidth;

      const diffTime = unitsToTimeUs(
        diffSize,
        target.tScale,
        target.playbackRate
      );

      const newTo = to + diffTime;

      if (newTo > target.duration) return false;
      const widthToTime = unitsToTimeUs(
        newWidth,
        target.tScale,
        target.playbackRate
      );
      if (widthToTime < minTimeToUnits) return false;

      target.set('width', Math.max(newWidth, 0));
      target.trim.to = newTo;
    } else {
      // Check if the object is out of the canvas
      if (target.left < 0) return false;

      const diffPos = oldWidth - newWidth;
      const nextLeft = target.left + diffPos;

      // target.left is not set right away, so we need to check if the object is out of the canvas
      if (nextLeft < 0) {
        const durationInUnits = timeUsToUnits(
          target.duration,
          target.tScale,
          target.playbackRate
        );

        const totalWidthToLeft = target.width + target.left;

        if (totalWidthToLeft <= durationInUnits) {
          target.set('width', totalWidthToLeft);

          const newTrimFrom = unitsToTimeUs(
            durationInUnits - totalWidthToLeft,
            target.tScale,
            target.playbackRate
          );

          target.trim.from = newTrimFrom;
          return true;
        }

        return false;
      }

      const widthToTime = unitsToTimeUs(
        newWidth,
        target.tScale,
        target.playbackRate
      );
      if (widthToTime < minTimeToUnits) return false;

      const diffSize = newWidth - oldWidth;
      const from = target.trim.from;

      const diffTime = unitsToTimeUs(
        diffSize,
        target.tScale,
        target.playbackRate
      );

      const newTrimFrom = from - diffTime;
      if (newTrimFrom < 0) return false;

      target.set('width', Math.max(newWidth, 0));
      target.trim.from = newTrimFrom;
      if (target.onResize) {
        target.onResize();
      }
    }
    //  check against actual target width in case `newWidth` was rejected
    return oldWidth !== target.width;
  }
  return false;
};

export const resizeTrimmable = wrapWithFireEvent(
  'resizing',
  wrapWithFixedAnchor(changeTrimmableWidth)
);
