import { ActiveSelection, FabricObject, TEvent, TPointerEvent, Transform } from "fabric";
import { Track, Placeholder, Transition } from "../../objects";
import Timeline from "../../timeline";
import { findRelativePosition } from "../../utils/array";

function onBeforeTransform(
  this: Timeline,
  e: TEvent<TPointerEvent> & {
    transform: Transform;
  },
) {
  const state = this.dragStateManager.getState();
  const canvas = state.canvas!;

  this.dragStateManager.setState({
    activeTrackToItemsMap: {},
    primaryTracks: {},
    secondaryTracks: {},
    trackTops: [],
    trackToItemsMap: {},
    activeObjects: [],
    trackTopToIdMap: {},
    isDragOver: false,
    initialTrackPoints: [],
    updateItemsInTrack: null,
  });

  canvas.trackIdAfterTransform = "";
  canvas.positionAfterTransform = {};

  const activeSelection = canvas.getActiveObject();

  const activeObjects = (
    activeSelection instanceof ActiveSelection ? activeSelection.getObjects() : [activeSelection]
  ) as FabricObject[];

  this.dragStateManager.setState({ activeObjects });

  const pointer = canvas.getScenePoint(e.e!);

  const tracks = canvas.getObjects("Track") as Track[];

  const activeObjectsIds = canvas.getActiveObjects().map((obj) => obj.id);
  const activeTracks = tracks.filter((track) => {
    const items = track.clipIds;
    return activeObjectsIds.some((id) => items.includes(id));
  });
  // drag start pointer position in track
  let originTrack = activeTracks.find((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      pointer.x >= objRect.left &&
      pointer.x <= objRect.left + objRect.width &&
      pointer.y >= objRect.top &&
      pointer.y <= objRect.top + objRect.height
    );
  }) as Track;

  this.dragStateManager.setState({ originTrack });
  if (originTrack?.magnetic) {
    this.dragStateManager.setState({ updateItemsInTrack: originTrack.id });
  }

  const allTrackItems = canvas.getObjects(...this.itemTypes);

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

  // populate activeTrackToItemsMap
  activeObjects.forEach((obj) => {
    // find track by objrct id
    const track = tracks.find((track) => track.clipIds.includes(obj.id)) as Track;
    if (!track) return;
    const trackId = track.id;
    if (state.activeTrackToItemsMap[trackId]) {
      state.activeTrackToItemsMap[trackId].push(obj);
    } else {
      state.activeTrackToItemsMap[trackId] = [obj];
    }
  });

  // drag start pointer position in targets
  state.primaryMovingObjects = activeObjects.filter((obj) => {
    const objRect = obj.getBoundingRect();
    return (
      pointer.y >= objRect.top &&
      pointer.y <= objRect.top + objRect.height &&
      !(obj instanceof Transition)
    );
  });

  if (state.primaryMovingObjects.length === 0) return;

  state.primaryMovingObjects.forEach((obj) => {
    const objectTop = obj.getBoundingRect().top;
    const trackId = state.trackTopToIdMap[objectTop];
    if (state.primaryTracks[trackId]) {
      state.primaryTracks[trackId].objects.push(obj);
    } else {
      const index = findRelativePosition(state.trackTops, originTrack?.top, objectTop)!;
      state.primaryTracks[trackId] = {
        objects: [obj],
        index,
      };
    }
  });

  // order primaryMovingObjects by left position
  state.primaryMovingObjects = state.primaryMovingObjects.sort((a, b) => a.left - b.left);

  state.secondaryMovingObjects = activeObjects.filter(
    (obj) => !state.primaryMovingObjects.includes(obj),
  );

  state.secondaryMovingObjects.forEach((obj) => {
    const objectTop = obj.getBoundingRect().top;
    const trackId = state.trackTopToIdMap[obj.getBoundingRect().top];
    if (state.secondaryTracks[trackId]) {
      state.secondaryTracks[trackId].objects.push(obj);
    } else {
      const index = findRelativePosition(state.trackTops, originTrack.top, objectTop)!;
      state.secondaryTracks[trackId] = {
        objects: [obj],
        index,
      };
    }
  });

  if (originTrack) {
    canvas.trackOriginBeforeTransform = originTrack.id;
  }
  if (activeSelection) {
    canvas.positionBeforeTransform = {
      top: activeSelection.top,
      left: activeSelection.left,
    };
  }

  if (e.transform.action !== "drag") return;

  state.placeholderMovingObjects = state.primaryMovingObjects.map((target) => {
    const targetBounds = target.getBoundingRect();

    state.objectInitialPositions[target.id] = {
      top: targetBounds.top,
      left: targetBounds.left,
    };
    const targetPlaceholder = new Placeholder({
      id: `${target.id}-placeholder`,
      left: targetBounds.left,
      top: targetBounds.top,
      width: targetBounds.width,
      height: targetBounds.height,
    });
    targetPlaceholder.draggedObject = target;
    return targetPlaceholder;
  });

  canvas.add(...state.placeholderMovingObjects);
}

export function addBeforeTransformEvents(timeline: Timeline) {
  timeline.on("before:transform", onBeforeTransform.bind(timeline));
}

export function removeBeforeTransformEvents(timeline: Timeline) {
  timeline.off("before:transform", onBeforeTransform.bind(timeline));
}
