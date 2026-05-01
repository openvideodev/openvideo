import { nanoid } from "nanoid";
import Timeline from "../../timeline";
import { ITransitionClip, TrackType } from "../../types";
import { removeItemsFromTrack } from "../../utils/item";
import { IDropInfo } from "../../interfaces/canvas";
import { generateId, unitsToTimeUs } from "../../utils";
import { createCombinedTracksArray } from "../../utils/array";
import { TPointerEvent, TPointerEventInfo } from "fabric";
import { TIMELINE_SEEK } from "../../global";
import { flatten } from "lodash-es";

import { Transition } from "../../objects";
import { ITimelineTrack } from "../../timeline";

function addNewTrack(this: Timeline, payload: IDropInfo) {
  const { secondaryTracks, primaryTracks, primaryPositions } = payload;
  const { positions, trackIndex } = primaryPositions;
  const nextTrackIndex = (
    trackIndex === -1 ? this.tracks.length : trackIndex
  ) as number;

  const [primaryTrackId] = Object.keys(primaryTracks);
  const currentTrack = this.tracks.find(
    (track) => track.id === primaryTrackId
  )!;
  const primaryTrack = primaryTracks[primaryTrackId];

  const refTrack: ITimelineTrack = {
    id: generateId(),
    clipIds: primaryTrack.objects.map((obj) => obj.id),
    name: "",
    type: currentTrack.type,
    accepts: currentTrack.accepts,
    muted: currentTrack.muted || false
  };

  const secondaryIds = flatten(
    Object.keys(secondaryTracks).map((trackId) => {
      return secondaryTracks[trackId].objects.map((obj) => obj.id);
    })
  );

  let updatedTracks = removeItemsFromTrack(this.tracks, [
    ...Object.keys(positions),
    ...secondaryIds
  ]);

  const newTracks: (ITimelineTrack & { tempIndex: number })[] = [];

  // handle secondary tracks
  Object.keys(secondaryTracks).forEach((trackId) => {
    const { objects, index } = secondaryTracks[trackId];
    const currentSecondaryTrack = this.tracks.find(
      (track) => track.id === trackId
    );

    if (!currentSecondaryTrack) return;

    const ids = objects
      .filter((obj) => obj.type !== "transition")
      .map((obj) => obj.id);

    if (ids.length === 0) return;

    const newTrack: ITimelineTrack & { tempIndex: number } = {
      id: nanoid(),
      clipIds: ids,
      name: "",
      type: currentSecondaryTrack.type,
      accepts: currentSecondaryTrack.accepts,
      tempIndex: index,
      muted: currentSecondaryTrack.muted || false
    };
    newTracks.push(newTrack);
  });
  const updatedNewTracks = createCombinedTracksArray(refTrack, newTracks);
  if (updatedNewTracks.length) {
    updatedTracks.splice(nextTrackIndex, 0, ...updatedNewTracks);
  }
  this.tracks = updatedTracks;
  this.tracksManager.renderTracks();
  this.tracksManager.refreshTrackLayout();
  this.itemsManager.alignItemsToTrack();
  this.itemsManager.updateTrackItemIdsOrdering();
  this.tracksManager.adjustMagneticTrack();
  this.transitionManager.updateTransitions(true);
  this.updateState({ updateHistory: true, kind: "update" });
}

// handle when track items are moved
function onTrackItemsMoved(this: Timeline, payload: IDropInfo) {
  const {
    isSecondaryOverlapped,
    secondaryTracks,
    primaryTracks,
    primaryPositions
  } = payload;
  const { trackId, positions } = primaryPositions;
  const overTrack = this.tracks.find((track) => track.id === trackId);

  const state = this.dragStateManager.getState();
  const diffBetweenObjs: number[] = [];
  const primaryObjs = state.primaryMovingObjects;
  const sortedPrimaryObjs = primaryObjs.sort((a, b) => a.left - b.left);
  sortedPrimaryObjs.forEach((obj, index) => {
    if (!sortedPrimaryObjs[index - 1]) return;
    const diffObj = obj.left - sortedPrimaryObjs[index - 1].left;
    diffBetweenObjs.push(diffObj);
  });

  const nextTrackIndex = this.tracks.findIndex((track) => track.id === trackId);

  const secondaryIds = flatten(
    Object.keys(secondaryTracks).map((trackId) => {
      return secondaryTracks[trackId].objects.map((obj) => obj.id);
    })
  );

  let updatedTracks = removeItemsFromTrack(this.tracks, [
    ...Object.keys(positions),
    ...secondaryIds
  ]);

  Object.keys(primaryTracks).forEach((trackId) => {
    this.pauseEventListeners();

    const { objects } = primaryTracks[trackId];
    objects.forEach((obj) => {
      if (obj.isMain && overTrack?.magnetic) return;
      const position = positions[obj.id];
      obj.left = position?.left;
    });

    this.resumeEventListeners();

    const nextTrackId = primaryPositions.trackId;
    const nextTrack = updatedTracks.find((track) => track.id === nextTrackId);

    nextTrack?.clipIds.push(...Object.keys(positions));

    this.tracks = updatedTracks;
  });

  const refTrack = this.tracks[nextTrackIndex];
  const newTracks: (ITimelineTrack & { tempIndex: number })[] = [];
  // handle secondary tracks
  Object.keys(secondaryTracks).forEach((trackId) => {
    const { objects, index } = secondaryTracks[trackId];
    const ids = objects
      .filter((obj) => obj.type !== "transition")
      .map((obj) => obj.id);
    const [refId] = ids;
    const target = this.trackItemsMap[refId];

    if (isSecondaryOverlapped && target) {
      const accepts = this.getItemAccepts(target.type);
      const newTrack: ITimelineTrack & { tempIndex: number } = {
        id: nanoid(),
        clipIds: ids,
        name: "",
        type: target.type as TrackType,
        accepts: accepts,
        tempIndex: index,
        muted: false
      };
      newTracks.push(newTrack);
    } else {
      const nextTrack = updatedTracks[nextTrackIndex + index];

      nextTrack?.clipIds.push(...ids);
      this.tracks = updatedTracks;
    }
  });

  const updatedNewTracks = createCombinedTracksArray(refTrack, newTracks);

  if (updatedNewTracks.length) {
    // insert new tracks at nextTrackIndex
    updatedTracks.splice(nextTrackIndex, 1, ...updatedNewTracks);
  }
  this.tracks = updatedTracks;
  this.tracksManager.renderTracks();
  this.itemsManager.alignItemsToTrack();
  this.itemsManager.updateTrackItemIdsOrdering();
  this.tracksManager.adjustMagneticTrack();
  this.transitionManager.updateTransitions(true);
  this.updateState({ updateHistory: true, kind: "update" });
}

function onTrackItemsResized(
  this: Timeline,
  {
    trackItemIds,
    isOverlapped
  }: { trackId: string; trackItemIds: string[]; isOverlapped: boolean }
) {
  const [trackItemId] = trackItemIds;
  if (!trackItemId) return;
  const transitions = this.getObjects("Transition") as Transition[];
  const transition = transitions.find((obj) => obj.id === trackItemId);
  if (!transition) {
    const currentTrack = this.tracks.find((track) =>
      track.clipIds.includes(trackItemId)
    )!;

    if (isOverlapped) {
      const updatedTracks = removeItemsFromTrack(this.tracks, trackItemIds);

      const newTrack: ITimelineTrack = {
        id: nanoid(),
        clipIds: [trackItemId],
        name: "",
        type: currentTrack.type,
        accepts: currentTrack.accepts,
        muted: currentTrack.muted || false
      };
      const currentTrackIndex = this.tracks.findIndex(
        (track) => track.id === currentTrack.id
      );

      updatedTracks.splice(currentTrackIndex, 0, newTrack);
      this.tracks = updatedTracks;
    }
  }

  const relationItemTransition = transitions.filter(
    (obj) => obj.fromClipId === trackItemId || obj.toClipId === trackItemId
  );

  if (relationItemTransition) {
    const item = this.itemsManager
      .getTrackItems()
      .find((obj) => obj.id === trackItemId)!;
    const itemWidth = item?.width;
    relationItemTransition.forEach((obj) => {
      if (obj.width / 2 > itemWidth) {
        this.transitionIds = this.transitionIds.filter((id) => id !== obj.id);
        const newTransitionMap: Record<string, ITransitionClip> = {};
        Object.keys(this.transitionsMap).forEach((id) => {
          if (id !== obj.id) {
            newTransitionMap[id] = this.transitionsMap[id];
          }
        });
        this.transitionsMap = newTransitionMap;
      }
    });
    const firstTransitionWidth = relationItemTransition[0]?.width || 0;
    const secondTransitionWidth = relationItemTransition[1]?.width || 0;
    const secondTransition = relationItemTransition[1];
    if (itemWidth <= firstTransitionWidth / 2 + secondTransitionWidth / 2) {
      this.transitionIds = this.transitionIds.filter(
        (id) => id !== secondTransition?.id
      );
      const newTransitionMap: Record<string, ITransitionClip> = {};
      Object.keys(this.transitionsMap).forEach((id) => {
        if (id !== secondTransition?.id) {
          newTransitionMap[id] = this.transitionsMap[id];
        }
      });
      this.transitionsMap = newTransitionMap;
    }
  }

  this.tracksManager.renderTracks();
  this.itemsManager.alignItemsToTrack();
  // this.transitionManager.alignTransitionsToTrack();

  this.tracksManager.adjustMagneticTrack();
  this.transitionManager.updateTransitions(true);
  this.itemsManager.updateTrackItemIdsOrdering();
  this.updateState({ updateHistory: true, kind: "update" });
}

let scenePoint = { x: 0, y: 0 };
function onMouseDownClick(this: Timeline, e: TPointerEventInfo<TPointerEvent>) {
  scenePoint = e.scenePoint;
}

// handle player seek on click
function onMouseUpClick(this: Timeline, e: TPointerEventInfo<TPointerEvent>) {
  const point = e.scenePoint;
  if ((scenePoint.x === point.x || scenePoint.y === point.y) && !e.target) {
    const canvasEl = this.getElement();
    const canvasBounds = canvasEl.getBoundingClientRect();
    const vt = this.viewportTransform;
    const clientX = (e.e as MouseEvent).clientX || ((e.e as unknown as TouchEvent).touches?.[0]?.clientX);
    const position = clientX - canvasBounds.left - vt[4];
    const time = unitsToTimeUs(position, this.scale.zoom);
    this.emitter.emit(TIMELINE_SEEK, { payload: { time } });
  }
}
export const addTimelineEvents = (timeline: Timeline) => {
  timeline.on("track:create", addNewTrack.bind(timeline));
  timeline.on("track-items:resized", onTrackItemsResized.bind(timeline));
  timeline.on("track-items:moved", onTrackItemsMoved.bind(timeline));
  timeline.on("mouse:up", onMouseUpClick.bind(timeline));
  timeline.on("mouse:down", onMouseDownClick.bind(timeline));
};

export function removeTimelineEvents(timeline: Timeline) {
  timeline.off("track:create", addNewTrack.bind(timeline));
  timeline.off("track-items:resized", onTrackItemsResized.bind(timeline));
  timeline.off("track-items:moved", onTrackItemsMoved.bind(timeline));
  timeline.off("mouse:up", onMouseUpClick.bind(timeline));
}
