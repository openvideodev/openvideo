import { FabricObject, ModifiedEvent, TBBox, TPointerEvent } from 'fabric';
import { Helper, Track } from '../../objects';
import Timeline from '../../timeline';
import { IDropInfo } from '../../interfaces/canvas';
import { findRelativePosition } from '../../utils/array';

const handleHelperDrop = (canvas: Timeline, dropInfo: IDropInfo) => {
  canvas.fire('track:create', dropInfo);
};

const handleTrackDrop = (canvas: Timeline, dropInfo: IDropInfo) => {
  canvas.fire('track-items:moved', dropInfo);
};

function onObjectDropped(this: Timeline, e: ModifiedEvent<TPointerEvent>) {
  const canvas = this;
  if (!canvas) return;
  const state = this.dragStateManager.getState();

  const activeSelection = canvas.getActiveObject();

  if (!activeSelection || !canvas.positionBeforeTransform) return;

  const pointer = canvas.getScenePoint(e.e!);

  const droppables = canvas.getObjects('Track', 'Helper');

  const droppedTarget = droppables.find((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      pointer.x >= objRect.left &&
      pointer.x <= objRect.left + objRect.width &&
      pointer.y >= objRect.top &&
      pointer.y <= objRect.top + objRect.height
    );
  });

  if (e.action === 'resizing') {
    const currentTrackObjects = (
      state.trackToItemsMap[state.originTrack?.id as string] || []
    ).filter((o) => o !== activeSelection);

    activeSelection.setCoords();

    const isOverlapped = findOverlapObject(
      currentTrackObjects,
      activeSelection.getBoundingRect()
    );
    canvas.fire('track-items:resized', {
      trackId: state.originTrack?.id,
      trackItemIds: [activeSelection.id],
      isOverlapped: !!isOverlapped,
    });
    return false;
  }

  if (!droppedTarget) {
    activeSelection?.set(canvas.positionBeforeTransform);
    activeSelection?.setCoords();
    return false;
  }

  if (droppedTarget instanceof Helper) {
    let index;
    switch (droppedTarget.kind) {
      case 'top':
        index = 0;
        break;
      case 'center':
        index = droppedTarget.metadata.order || 0;
        break;
      case 'bottom':
        index = -1;
        break;
      default:
        return; // Exit if kind is not recognized
    }

    const dropInfo: IDropInfo = {
      isSecondaryOverlapped: false,
      secondaryTracks: state.secondaryTracks,
      primaryTracks: state.primaryTracks,
      primaryPositions: {
        trackIndex: index,
        trackId: canvas.trackIdAfterTransform,
        positions: canvas.positionAfterTransform,
      },
    };

    handleHelperDrop(canvas, dropInfo);
  } else if (droppedTarget instanceof Track) {
    const secondaryMovingOverlap = findSecondaryMovingOverlap(canvas);

    const dropInfo: IDropInfo = {
      isSecondaryOverlapped: secondaryMovingOverlap,
      secondaryTracks: state.secondaryTracks,
      primaryTracks: state.primaryTracks,
      primaryPositions: {
        trackId: canvas.trackIdAfterTransform,
        positions: canvas.positionAfterTransform,
      },
    };

    handleTrackDrop(canvas, dropInfo);
  }
}

// destination track id for secondary moving objects
function findSecondaryTracks(canvas: Timeline) {
  const state = canvas.dragStateManager.getState();
  const [primaryMovingObject] = state.primaryMovingObjects;
  const primaryMovingObjectId = primaryMovingObject.id;
  const primaryAferTransform =
    canvas.positionAfterTransform[primaryMovingObjectId];
  const primaryCurrentTop = primaryMovingObject.getBoundingRect().top;
  const offset = primaryAferTransform.top - primaryCurrentTop;

  const secondaryTracks: Record<
    string,
    {
      objects: FabricObject[];
      index: number;
    }
  > = {};
  state.secondaryMovingObjects.forEach((obj: any) => {
    const objectTop = obj.getBoundingRect().top + offset;
    const trackId = state.trackTopToIdMap[objectTop];
    const index = findRelativePosition(
      state.trackTops,
      (state.originTrack as any).top,
      objectTop
    )!;
    if (secondaryTracks[trackId]) {
      secondaryTracks[trackId].objects.push(obj);
    } else {
      secondaryTracks[trackId] = {
        objects: [obj],
        index,
      };
    }
  });

  return secondaryTracks;
}

function findSecondaryMovingOverlap(canvas: Timeline) {
  const secondartTrackItemsMap = findSecondaryTracks(canvas);
  const state = canvas.dragStateManager.getState();
  return Object.keys(secondartTrackItemsMap).some((trackId) => {
    const currentItemsInTrack = state.trackToItemsMap[trackId];
    const movingItemsInTrack = secondartTrackItemsMap[trackId].objects;

    // it should create a new track if there is no current track
    if (!currentItemsInTrack || !currentItemsInTrack.length) return true;

    return currentItemsInTrack
      .filter((o: any) => !movingItemsInTrack.includes(o))
      .some((o: any) => {
        const overlaped = findOverlapObject(
          movingItemsInTrack,
          o.getBoundingRect()
        );
        return overlaped;
      });
  });
}

function findOverlapObject(objects: FabricObject[], boundingBox: TBBox) {
  const overlapObject = objects.find((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      boundingBox.left < objRect.left + objRect.width &&
      boundingBox.left + boundingBox.width > objRect.left &&
      boundingBox.top < objRect.top + objRect.height &&
      boundingBox.top + boundingBox.height > objRect.top
    );
  });
  return overlapObject;
}

export const addModifiedEvents = (timeline: Timeline) => {
  timeline.on('object:modified', onObjectDropped.bind(timeline));
};

export const removeModifiedEvents = (timeline: Timeline) => {
  timeline.off('object:modified', onObjectDropped.bind(timeline));
};
