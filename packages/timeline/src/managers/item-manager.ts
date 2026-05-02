import { ActiveSelection, FabricObject } from 'fabric';
import Timeline from '../timeline';
import { Transition, Track } from '../objects';
import { unitsToTimeUs } from '../utils/timeline';
import { IClip } from '../types';
import { removeItemsFromTrack } from '../utils/item';
import { timeUsToUnits } from '../utils';
import { loadObject } from '../utils/load-object';
import { isEqual } from 'lodash-es';

class ItemManager {
  private timeline: Timeline;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  public addTrackItem(trackItem: IClip) {
    const object = loadObject(trackItem, {
      tScale: this.timeline.tScale,
      sizesMap: this.timeline.sizesMap,
    });

    this.timeline.add(object as FabricObject);
  }

  public alignItemsToTrack() {
    this.timeline.pauseEventListeners();

    // Create a map of track IDs to track objects
    const trackMap = new Map(
      this.timeline.getObjects('Track').map((track) => [track.id, track])
    );

    // Cache track items for later use
    const trackItems = this.getTrackItems();
    const transitions = this.timeline.getObjects('Transition') as Transition[];

    // Align track items to their respective tracks
    this.timeline.trackItemIds.forEach((id) => {
      const currentTrackData = this.timeline.tracks.find((track) =>
        (track.clipIds ?? []).includes(id)
      );
      if (!currentTrackData) return; // Handle case where track data is not found

      const track = trackMap.get(currentTrackData.id);
      const trackItem = this.getTrackItems().find((o) => o.id === id);
      if (trackItem && track) {
        trackItem.isMain = (track as Track).magnetic;

        trackItem.set({ top: track.top });
        trackItem.setCoords();
      }
    });

    // Update track items IDs
    trackMap.forEach((track) => {
      (track as Track).clipIds = trackItems
        .filter((trackItem) => trackItem.top === track.top)
        .map((trackItem) => {
          return trackItem.id;
        });
    });

    transitions.forEach((transition) => {
      const fromId = transition.fromClipId;
      const fromObject = trackItems.find((o) => o.id === fromId);
      if (fromObject) {
        transition.set({ top: fromObject.top });
        transition.setCoords();
      }
    });

    this.timeline.resumeEventListeners();
  }

  public updateTrackItemIdsOrdering() {
    const trackItems = this.getTrackItems();

    trackItems.sort((a, b) => a.top - b.top);
    this.timeline.trackItemIds = trackItems.map((t) => t.id).reverse();
  }

  public selectTrackItemByIds(trackItemIds: string[] = []) {
    const ids = trackItemIds || [];
    const currentActiveIds = this.timeline.getActiveObjects().map((o) => o.id);
    if (isEqual(currentActiveIds, ids)) return;
    const objects = this.timeline.getObjects(
      ...Timeline.objectTypes,
      'Transition'
    );

    const activeObjects = objects.filter((o) => ids.includes(o.id));

    if (!activeObjects.length) {
      this.timeline.discardActiveObject();
    } else if (activeObjects.length === 1) {
      this.timeline.setActiveObject(activeObjects[0]);
    } else {
      const activeSelection = new ActiveSelection(activeObjects);
      this.timeline.setActiveObject(activeSelection);
    }
    this.timeline.requestRenderAll();
  }

  public synchronizeTrackItemsState() {
    this.timeline.pauseEventListeners();

    const trackItems = this.getTrackItems();
    const nextTrackItemsMap: Record<string, any> = {};

    trackItems.forEach((o) => {
      const { id, left, width } = o;
      const currentTrackItem = this.timeline.trackItemsMap[id];

      const from = unitsToTimeUs(left, this.timeline.tScale);

      const nextDuration = unitsToTimeUs(width, this.timeline.tScale);
      const nextDisplay = {
        from: from,
        to: from + nextDuration,
      };

      const nextTrackItem: Partial<IClip> = {
        display: nextDisplay,
      };

      if (o.isTrimmable) {
        nextTrackItem.trim = o.trim;
      }

      // Assign display back onto the canvas object so visual state stays in sync
      o.display = nextDisplay;

      nextTrackItemsMap[id] = {
        ...currentTrackItem,
        ...nextTrackItem,
      };
    });

    this.timeline.trackItemsMap = {
      ...this.timeline.trackItemsMap,
      ...nextTrackItemsMap,
    };

    this.timeline.resumeEventListeners();
  }

  public deleteTrackItemById(ids: string[]) {
    const activeIds = ids;
    const object = this.timeline
      .getObjects()
      .filter((o) => ids.includes(o.id)) as FabricObject[];
    const updatedTracks = removeItemsFromTrack(this.timeline.tracks, activeIds);
    const updatedtrackItems: Record<string, any> = {};
    Object.keys(this.timeline.trackItemsMap).forEach((id) => {
      if (activeIds.includes(id)) {
        return;
      }
      updatedtrackItems[id] = this.timeline.trackItemsMap[id];
    });

    const updatedTrackItemIds = this.timeline.trackItemIds.filter(
      (id) => !activeIds.includes(id)
    );

    this.timeline.tracks = updatedTracks;
    this.timeline.trackItemsMap = updatedtrackItems;
    this.timeline.trackItemIds = updatedTrackItemIds;
    this.timeline.discardActiveObject();
    this.timeline.remove(...object);

    this.timeline.tracksManager?.renderTracks();
    this.alignItemsToTrack();
  }

  public deleteActiveTrackItem() {
    const activeObjects = this.timeline.getActiveObjects();
    if (!activeObjects.length) return false;
    const activeIds = activeObjects.map((obj) => obj.id);
    const updatedTracks = removeItemsFromTrack(this.timeline.tracks, activeIds);
    const updatedtrackItems: Record<string, any> = {};
    Object.keys(this.timeline.trackItemsMap).forEach((id) => {
      if (activeIds.includes(id)) {
        return;
      }
      updatedtrackItems[id] = this.timeline.trackItemsMap[id];
    });

    const updatedTrackItemIds = this.timeline.trackItemIds.filter(
      (id) => !activeIds.includes(id)
    );

    this.timeline.tracks = updatedTracks;
    this.timeline.trackItemsMap = updatedtrackItems;
    this.timeline.trackItemIds = updatedTrackItemIds;
    this.timeline.discardActiveObject();
    this.timeline.remove(...activeObjects);
    this.timeline.setActiveIds([]);

    this.timeline.tracksManager?.renderTracks();
    this.alignItemsToTrack();
    this.timeline.updateState({ updateHistory: true, kind: 'remove' });
  }

  public updateTrackItemCoords(updateActiveObject?: boolean) {
    const activeObjectIds = updateActiveObject
      ? this.timeline.getActiveObjects().map((o) => o.id)
      : [];
    !updateActiveObject && this.timeline.pauseEventListeners();
    this.timeline.trackItemIds.forEach((id) => {
      if (activeObjectIds.includes(id)) return;

      const trackItemObject = this.timeline
        .getObjects()
        .find((o) => o.id === id);
      const item = this.timeline.trackItemsMap[id];

      // Guard: item may have been deleted from state before canvas is fully synced
      if (!item || !item.display || !trackItemObject) return;

      const left = timeUsToUnits(item.display.from, this.timeline.tScale);

      const width = timeUsToUnits(
        item.display.to - item.display.from,
        this.timeline.tScale
      );
      trackItemObject.set({
        left: left,
        width: width,
      });
      trackItemObject.setCoords();
      return;
    });
    !updateActiveObject && this.timeline.resumeEventListeners();
  }

  public getTrackItems() {
    return this.timeline.getObjects(...Timeline.objectTypes);
  }

  public setTrackItemCoords() {
    this.getTrackItems().forEach((trackItem) => {
      trackItem.setCoords();
    });
  }

  public setActiveTrackItemCoords() {
    const activeObjects = this.timeline.getActiveObjects();
    activeObjects.forEach((o) => o.setCoords());
  }
}

export default ItemManager;
