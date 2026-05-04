import {
  IClip,
  ITransitionClip,
  ITimelineScaleState,
  IUpdateStateOptions,
  State,
} from '../types';
import { splitClips, clipsToMap, getDuration } from '../utils/timeline';
import Timeline, { ITimelineTrack } from '../timeline';
import { cloneDeep } from '../utils/clone-deep';

class SyncManager {
  private timeline: Timeline;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  private _setTracks(tracks: ITimelineTrack[]) {
    this.timeline.tracks = tracks.map((track) => ({
      ...track,
      accepts: track.accepts || this.timeline.getItemAccepts(track.type),
    }));
  }

  private _syncAndRender() {
    this.timeline.itemsManager.synchronizeTrackItemsState();
    this.timeline.tracksManager.renderTracks();
    this.timeline.tracksManager.refreshTrackLayout();
    this.timeline.tracksManager.adjustMagneticTrack();
    this.timeline.transitionManager.renderTransitions();
    this.timeline.itemsManager.alignItemsToTrack();
    this.timeline.transitionManager.alignTransitionsToTrack();
    this.timeline.calcBounding();
  }

  public syncSelection(activeIds: string[]) {
    const timelineActiveIds = this.timeline.activeIds;
    if (activeIds.length === 1 && timelineActiveIds.length === 1) {
      const activeId = activeIds[0];
      const timelineActiveId = timelineActiveIds[0];
      let templateId: string = '';
      this.timeline.tracks.forEach((s: ITimelineTrack) => {
        if (s.id === timelineActiveId) {
          const items = s.clipIds;
          if (items.includes(activeId)) templateId = s.id;
        }
      });
      if (templateId !== '') return;
      this.timeline.itemsManager.selectTrackItemByIds([activeId]);
    } else {
      this.timeline.itemsManager.selectTrackItemByIds(activeIds);
    }
  }

  public syncTracksAndClips(data: {
    tracks: ITimelineTrack[];
    duration: number;
    clips: IClip[];
  }) {
    this.syncAddOrRemoveClips({
      tracks: data.tracks,
      clips: data.clips,
      duration: data.duration,
      activeIds: this.timeline.activeIds,
      scale: this.timeline.scale,
    } as any);
  }

  public syncTracks(data: {
    tracks: ITimelineTrack[];
    changedTracks: string[];
  }) {
    if (data.changedTracks.length) {
      this._setTracks(data.tracks);
      this.timeline.tracksManager.renderTracks();
      this.timeline.itemsManager.alignItemsToTrack();
      this.timeline.tracksManager.refreshTrackLayout();
      this.timeline.transitionManager.updateTransitions();
    }
  }

  public syncClipProperties(data: {
    clips: IClip[];
    state?: any;
    changedTrimIds?: string[];
    changedDisplayIds?: string[];
  }) {
    const { regular } = splitClips(data.clips);
    const updatedTrackItemsMap = clipsToMap(regular);

    const items = this.timeline.itemsManager.getTrackItems();
    if (items.length === 0) {
      this.timeline.trackItemsMap = updatedTrackItemsMap;
      return;
    }

    const previousTrackItemsMap = this.timeline.trackItemsMap;
    this.timeline.trackItemsMap = updatedTrackItemsMap;

    const isTimingUpdate = !!(data.changedTrimIds || data.changedDisplayIds);

    if (data.changedDisplayIds) {
      this.timeline.pauseEventListeners();
    }

    items.forEach((item) => {
      const itemDetail = updatedTrackItemsMap[item.id];
      if (!itemDetail) return;

      // Sync Animations
      const itemAnimations = itemDetail.animations;
      if (itemAnimations) {
        item.set({ animations: itemAnimations });
      }

      // Sync Timing
      if (data.changedTrimIds?.includes(item.id)) {
        const itemTrim = itemDetail.trim;
        if (itemTrim) {
          item.set({ trim: { from: itemTrim.from, to: itemTrim.to } });
        }
      }

      if (data.changedDisplayIds?.includes(item.id)) {
        const itemDisplay = itemDetail.display;
        if (
          itemDetail.playbackRate !==
          previousTrackItemsMap[item.id]?.playbackRate
        ) {
          item.playbackRate = itemDetail.playbackRate;
          item.onScale && item.onScale();
        }
        if (itemDisplay) {
          item.set({ display: itemDisplay });
        }
      }

      // Sync Details (Src, Text, etc.)
      if (item.hasSrc) {
        const currentSrc = (item as unknown as { src: string }).src;
        if (currentSrc !== itemDetail.src && item.setSrc) {
          item.setSrc(itemDetail.src);
        }
      }

      if (item.sync) {
        item.sync(itemDetail, this.timeline.tScale);
      }
    });

    if (data.changedDisplayIds) {
      this.timeline.resumeEventListeners();
    }

    if (isTimingUpdate) {
      this.timeline.itemsManager.updateTrackItemCoords();
      this.timeline.tracksManager.adjustMagneticTrack();
      this.timeline.itemsManager.alignItemsToTrack();
      this.timeline.transitionManager.updateTransitions();
      this.timeline.tracksManager.renderTracks();
      this.timeline.calcBounding();
      this.timeline.tracksManager.refreshTrackLayout();
      this.timeline.itemsManager.setTrackItemCoords();
    }

    this.timeline.requestRenderAll();
  }

  public syncScale(data: { scale: ITimelineScaleState }) {
    this.timeline.setScale(data.scale);
  }

  public syncHistory(data: { tracks: ITimelineTrack[]; clips: IClip[] }) {
    this._setTracks(data.tracks);
    const { regular, transitions } = splitClips(data.clips);
    this.timeline.trackItemsMap = clipsToMap(regular);
    this.timeline.trackItemIds = regular.map((c) => c.id);

    this.timeline.transitionIds = transitions.map((c) => c.id);
    this.timeline.transitionsMap = clipsToMap(transitions) as Record<
      string,
      ITransitionClip
    >;

    this.timeline.tracksManager.renderTracks();
    this.timeline.tracksManager.refreshTrackLayout();
    this.timeline.itemsManager.updateTrackItemCoords();
    this.timeline.itemsManager.alignItemsToTrack();
    this.timeline.transitionManager.alignTransitionsToTrack();
    this.timeline.tracksManager.adjustMagneticTrack();
    this.timeline.transitionManager.updateTransitions();
    this.timeline.calcBounding();
    this.timeline.duration = getDuration(this.timeline.trackItemsMap);
  }

  public syncAddOrRemoveClips(currentState: State) {
    const trackItemIdsInCanvas = this.timeline.itemsManager
      .getTrackItems()
      .map((o) => o.id);

    const { regular, transitions } = splitClips(currentState.clips);
    const desiredTrackItemIds = regular.map((c) => c.id);
    const deleteIds: string[] = [];

    trackItemIdsInCanvas.forEach((id) => {
      if (!desiredTrackItemIds.includes(id)) {
        deleteIds.push(id);
      }
    });

    this.timeline.itemsManager.deleteTrackItemById(deleteIds);
    this._setTracks(currentState.tracks);

    const currentTrackItemsMap = clipsToMap(regular);
    this.timeline.trackItemsMap = currentTrackItemsMap;

    desiredTrackItemIds.forEach((id) => {
      if (!trackItemIdsInCanvas.includes(id)) {
        const trackItemData = currentTrackItemsMap[id];
        const trackItem = { ...trackItemData } as IClip;
        this.timeline.itemsManager.addTrackItem(trackItem);
      }
    });

    this.timeline.trackItemIds = desiredTrackItemIds;
    this.timeline.transitionIds = transitions.map((c) => c.id);
    this.timeline.transitionsMap = clipsToMap(transitions) as Record<
      string,
      ITransitionClip
    >;
    this.timeline.activeIds = currentState.activeIds;

    this.timeline.tracksManager.renderTracks();
    this.timeline.itemsManager.alignItemsToTrack();
    this.timeline.itemsManager.updateTrackItemCoords();
    this.timeline.duration =
      currentState.duration || getDuration(this.timeline.trackItemsMap);
    this.timeline.calcBounding();
    this.timeline.transitionManager.updateTransitions();
    this.timeline.tracksManager.refreshTrackLayout();
    this.timeline.itemsManager.selectTrackItemByIds(currentState.activeIds);
  }

  public setActiveIds(activeIds: string[]) {
    this.timeline.activeIds = activeIds;
    this.timeline.emitter.emit('STATE_CHANGED', {
      payload: { activeIds: cloneDeep(this.timeline.activeIds) },
      options: { kind: 'layer:selection', updateHistory: false },
    });
  }

  public updateState(
    dataHistory: IUpdateStateOptions = { updateHistory: false, kind: 'update' }
  ) {
    this.timeline.tracksManager.filterEmptyTracks();
    this.timeline.itemsManager.synchronizeTrackItemsState();

    this.timeline.requestRenderAll();
    this.timeline.duration = getDuration(this.timeline.trackItemsMap);
    this.timeline.calcBounding();
    this.timeline.tracksManager.refreshTrackLayout();
    this.timeline.itemsManager.setTrackItemCoords();

    const state = this.getUpdatedState();

    this.timeline.emitter.emit('STATE_CHANGED', {
      payload: state,
      options: dataHistory,
    });
  }

  public getUpdatedState() {
    const duration = getDuration(this.timeline.trackItemsMap);
    const transitions = Object.values(this.timeline.transitionsMap);
    return {
      clips: [...Object.values(this.timeline.trackItemsMap), ...transitions],
      tracks: this.timeline.tracks,
      activeIds: this.timeline.activeIds,
      duration,
    };
  }
}

export default SyncManager;
