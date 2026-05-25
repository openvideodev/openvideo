import { Track } from "../../objects";
import Timeline from "../../timeline";
import { timeUsToUnits } from "../../utils";

function handleMovingEvent(this: Timeline) {
  const state = this.dragStateManager.getState();
  const canvas = this;
  const targetTrack = state.draggingOverTrack as Track;
  canvas.itemsManager.updateTrackItemCoords(true);

  const isMagnetic = targetTrack?.magnetic;

  const activeObjectIds = new Set(state.activeObjects.map((obj) => obj.id));
  const placeholders = state.placeholderMovingObjects;
  const totalPlaceholderWidth = placeholders.reduce((total, obj) => total + obj.width, 0);
  const minPlaceholderLeft =
    placeholders.length > 0 ? Math.min(...placeholders.map((obj) => obj.left)) : 0;

  // Adjust all magnetic tracks to ensure no gaps
  const tracks = canvas.getObjects("Track") as Track[];
  tracks.forEach((track) => {
    if (!track.magnetic) return;

    const trackItems = state.trackToItemsMap[track.id] || [];
    const sortedTrackObjects = [...trackItems].sort((a, b) => a.left - b.left);

    let currentLeftPosition = 0;
    // Check if the current drag target is this specific track
    const isOverThisTrack = targetTrack?.id === track.id;

    sortedTrackObjects.forEach((object) => {
      if (activeObjectIds.has(object.id)) return;

      if (isOverThisTrack) {
        if (Math.abs(minPlaceholderLeft - currentLeftPosition) < 1) {
          currentLeftPosition += totalPlaceholderWidth;
        }
      }
      object.left = currentLeftPosition;
      currentLeftPosition += object.width;
      object.setCoords();
    });
  });

  // 3. Handle normal track ordering (if target is not magnetic)
  if (targetTrack instanceof Track && !isMagnetic && state.orderNormalTrack) {
    const itemsIdsInTrack = targetTrack.clipIds;
    const objectsInTrack = canvas.itemsManager
      .getTrackItems()
      .filter((o) => !activeObjectIds.has(o.id) && itemsIdsInTrack.includes(o.id));
    const sortObjectInTrack = objectsInTrack.sort((a, b) => a.left - b.left);
    const firstPlaceholderObj = state.placeholderMovingObjects[0];
    const lastPlaceholderObj =
      state.placeholderMovingObjects[state.placeholderMovingObjects.length - 1];
    if (firstPlaceholderObj && lastPlaceholderObj) {
      const placeholderLeft = firstPlaceholderObj.left;
      const placeholderWidth =
        lastPlaceholderObj.left - firstPlaceholderObj.left + lastPlaceholderObj.width;
      const nextObj = sortObjectInTrack.find((obj, index) => {
        if (obj.left >= placeholderLeft - 1) return sortObjectInTrack[index];
      });
      const filterRightObj = objectsInTrack.filter((o) => o.left >= placeholderLeft - 1);

      if (nextObj && firstPlaceholderObj.left + placeholderWidth > nextObj.left) {
        const diffBetweenObjs = placeholderWidth - (nextObj.left - firstPlaceholderObj.left);
        filterRightObj.forEach((o) => {
          const currentLeft = timeUsToUnits(o.display.from, canvas.tScale);
          o.left = currentLeft + diffBetweenObjs;
        });
      }
    }
  }
  // canvas.transitionManager.alignTransitionsToTrack();
}

export function addMovingEvents(timeline: Timeline) {
  timeline.on("object:moving", handleMovingEvent.bind(timeline));
}

export function removeMovingEvents(timeline: Timeline) {
  timeline.off("object:moving", handleMovingEvent.bind(timeline));
}
