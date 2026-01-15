import { Canvas, Rect, type FabricObject, ActiveSelection } from 'fabric';
import { Track } from './track';
import {
  Text,
  Video,
  Audio,
  Image,
  Effect,
  type BaseTimelineClip,
  Transition,
} from './clips';
import { TransitionButton } from './objects/transition-button';
import { TIMELINE_CONSTANTS, getTrackHeight } from './utils';
import {
  type ITimelineTrack,
  type IClip,
  MICROSECONDS_PER_SECOND,
  type TrackType,
} from '@/types/timeline';
import { useTimelineStore } from '@/stores/timeline-store';
import EventEmitter from './event-emitter';
import { generateUUID } from '@/utils/id';
import { clearAuxiliaryObjects } from './guidelines/utils';
import * as SelectionHandlers from './handlers/selection';
import * as DragHandlers from './handlers/drag-handler';
import * as ModifyHandlers from './handlers/modify-handler';
import { Scrollbars } from './scrollbar';

export interface TimelineCanvasEvents {
  scroll: { deltaX: number; deltaY: number };
  zoom: { delta: number };
  'clip:modified': {
    clipId: string;
    displayFrom: number;
    duration: number;
    trim?: { from: number; to: number };
  };
  'clips:modified': {
    clips: Array<{
      clipId: string;
      displayFrom: number;
      duration?: number;
      trim?: { from: number; to: number };
    }>;
  };
  'clip:movedToTrack': { clipId: string; trackId: string };
  'clip:movedToNewTrack': { clipId: string; targetIndex: number };
  'timeline:updated': { tracks: ITimelineTrack[] };
  'clips:removed': { clipIds: string[] };
  'selection:changed': { selectedIds: string[] };
  'selection:duplicated': { clipIds: string[] };
  'selection:split': { clipId: string; splitTime: number };
  'transition:add': { fromClipId: string; toClipId: string; trackId: string };
  'viewport:changed': { scrollX: number; scrollY: number };
  [key: string]: any;
  [key: symbol]: any;
}

class Timeline extends EventEmitter<TimelineCanvasEvents> {
  containerEl: HTMLDivElement;
  canvas: Canvas;
  #resizeObserver: ResizeObserver | null = null;
  #timeScale: number = 1;
  #tracks: ITimelineTrack[] = [];
  #clipsMap: Record<string, IClip> = {};
  scrollbars: Scrollbars;

  // Cache for Fabric objects
  #trackObjects: Map<string, Track> = new Map();
  #clipObjects: Map<string, BaseTimelineClip> = new Map();
  #separatorLines: {
    container: Rect;
    highlight: Rect;
    index: number;
  }[] = [];

  #trackRegions: { top: number; bottom: number; id: string }[] = [];
  #activeSeparatorIndex: number | null = null;
  #transitionButton: TransitionButton | null = null;

  // Bound event handlers
  #onDragging: (opt: any) => void;
  #onTrackRelocation: (opt: any) => void;
  #onClipModification: (opt: any) => void;
  #onSelectionCreate: (opt: any) => void;
  #onSelectionUpdate: (opt: any) => void;
  #onSelectionClear: (opt: any) => void;
  #onMouseMove: (opt: any) => void;
  #enableGuideRedraw: boolean = true;

  constructor(id: string) {
    super();
    this.containerEl = document.getElementById(id) as HTMLDivElement;

    if (!this.containerEl) {
      console.error(`Timeline container element with id '${id}' not found.`);
      return;
    }

    // Bind handlers
    this.#onDragging = (options) => DragHandlers.handleDragging(this, options);
    this.#onTrackRelocation = (options) =>
      ModifyHandlers.handleTrackRelocation(this, options);
    this.#onClipModification = (options) =>
      ModifyHandlers.handleClipModification(this, options);
    this.#onSelectionCreate = (e) =>
      SelectionHandlers.handleSelectionCreate(this, e);
    this.#onSelectionUpdate = (e) =>
      SelectionHandlers.handleSelectionUpdate(this, e);
    this.#onSelectionClear = (e) =>
      SelectionHandlers.handleSelectionClear(this, e);
    this.#onMouseMove = (e) => this.handleMouseMove(e);

    this.init();
  }

  public init() {
    const canvasElement = document.createElement('canvas');
    canvasElement.style.width = '100%';
    canvasElement.style.height = '100%';
    this.containerEl.appendChild(canvasElement);

    const { clientWidth, clientHeight } = this.containerEl;

    this.canvas = new Canvas(canvasElement, {
      width: clientWidth,
      height: clientHeight,
      backgroundColor: '#0E0E0E',
      selection: true,
      renderOnAddRemove: false, // Performance optimization
    });

    this.scrollbars = new Scrollbars(this, {
      onViewportChange: ({ scrollX, scrollY }) => {
        this.emit('viewport:changed', { scrollX, scrollY });
      },
    });

    this.canvas.on('mouse:wheel', (opt) => {
      const e = opt.e;
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        this.emit('zoom', { delta: e.deltaY });
      } else {
        const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
        const deltaY = e.shiftKey ? 0 : e.deltaY;
        this.emit('scroll', { deltaX, deltaY });
      }
    });

    this.render();

    this.#resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.canvas.setDimensions({ width, height });
        this.render(); // Re-render to update track widths
      }
    });

    this.#resizeObserver.observe(this.containerEl);
    this.setupEvents();
  }

  private setupEvents() {
    this.canvas.on('object:moving', this.#onDragging);
    // Note: handleTrackRelocation should run before handleClipModification or be prioritized
    this.canvas.on('object:modified', this.#onTrackRelocation);
    this.canvas.on('object:modified', this.#onClipModification);
    this.canvas.on('selection:created', this.#onSelectionCreate);
    this.canvas.on('selection:updated', this.#onSelectionUpdate);
    this.canvas.on('selection:cleared', this.#onSelectionClear);
    this.canvas.on('mouse:move', this.#onMouseMove);
  }

  private handleMouseMove(opt: any) {
    const pointer = this.canvas.getPointer(opt.e);
    const x = pointer.x;
    const y = pointer.y;

    const track = this.getTrackAt(y);
    if (!track) {
      this.clearTransitionButton();
      return;
    }

    const trackData = this.#tracks.find((t) => t.id === track.id);
    if (!trackData) {
      this.clearTransitionButton();
      return;
    }

    // Only show button for Video/Image tracks (or tracks with media clips)
    // For now, let's just check the clips at that junction
    const clipsAtTrack = trackData.clipIds
      .map((id) => this.#clipsMap[id])
      .filter((c) => !!c)
      .sort((a, b) => a.display.from - b.display.from);

    const TRANSITION_POINT_THRESHOLD = 10; // Pixels
    let foundTransitionPoint = null;

    for (let i = 0; i < clipsAtTrack.length - 1; i++) {
      const clipA = clipsAtTrack[i];
      const clipB = clipsAtTrack[i + 1];

      // Check if they are adjacent in time (within 0.1s or something small)
      // Actually, they should be exactly together for a transition usually,
      // but let's allow a small gap in pixels detection.
      const endXA =
        (clipA.display.to / MICROSECONDS_PER_SECOND) *
        TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
        this.#timeScale;

      const startXB =
        (clipB.display.from / MICROSECONDS_PER_SECOND) *
        TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
        this.#timeScale;

      // Transition point is average or just endXAs if they are snapped
      const transitionPointX = (endXA + startXB) / 2;

      if (Math.abs(x - transitionPointX) < TRANSITION_POINT_THRESHOLD) {
        // Higher priority check: types must be media (Video/Image)
        if (
          (clipA.type === 'Video' || clipA.type === 'Image') &&
          (clipB.type === 'Video' || clipB.type === 'Image')
        ) {
          // Check if there's already a transition here
          const hasTransition = trackData.clipIds.some((id) => {
            const c = this.#clipsMap[id];
            if (!c || c.type !== 'Transition') return false;
            // Transition is roughly centered at transition point
            const tStart =
              (c.display.from / MICROSECONDS_PER_SECOND) *
              TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
              this.#timeScale;
            const tEnd =
              (c.display.to / MICROSECONDS_PER_SECOND) *
              TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
              this.#timeScale;
            return transitionPointX >= tStart && transitionPointX <= tEnd;
          });

          if (!hasTransition) {
            foundTransitionPoint = {
              x: transitionPointX,
              clipA,
              clipB,
              trackId: track.id,
            };
            break;
          }
        }
      }
    }

    if (foundTransitionPoint) {
      this.showTransitionButton(
        foundTransitionPoint.x,
        track.top + (track.bottom - track.top) / 2,
        foundTransitionPoint.clipA.id,
        foundTransitionPoint.clipB.id,
        foundTransitionPoint.trackId
      );
    } else {
      this.clearTransitionButton();
    }
  }

  private showTransitionButton(
    x: number,
    y: number,
    clipAId: string,
    clipBId: string,
    trackId: string
  ) {
    if (this.#transitionButton) {
      // If already showing for these clips, just move it if needed (though it shouldn't move much)
      if (
        (this.#transitionButton as any).clipAId === clipAId &&
        (this.#transitionButton as any).clipBId === clipBId
      ) {
        this.#transitionButton.set({ left: x, top: y });
        this.#transitionButton.setCoords();
        this.canvas.requestRenderAll();
        return;
      }
      this.clearTransitionButton();
    }

    this.#transitionButton = new TransitionButton({
      left: x,
      top: y,
      onClick: () => {
        this.emit('transition:add', {
          fromClipId: clipAId,
          toClipId: clipBId,
          trackId: trackId,
        });
      },
    });

    (this.#transitionButton as any).clipAId = clipAId;
    (this.#transitionButton as any).clipBId = clipBId;

    this.canvas.add(this.#transitionButton);
    this.canvas.bringObjectToFront(this.#transitionButton);
    this.canvas.requestRenderAll();
  }

  private clearTransitionButton() {
    if (this.#transitionButton) {
      this.canvas.remove(this.#transitionButton);
      this.#transitionButton = null;
      this.canvas.requestRenderAll();
    }
  }

  // --- PUBLIC GETTERS / SETTERS FOR HANDLERS ---

  public get tracks() {
    return this.#tracks;
  }

  public setTracksInternal(tracks: ITimelineTrack[]) {
    this.#tracks = tracks;
  }

  public get clipsMap() {
    return this.#clipsMap;
  }

  public get timeScale() {
    return this.#timeScale;
  }

  public get totalTracksHeight() {
    return this.#tracks.reduce((acc, track) => {
      let trackType: TrackType = 'Video';
      if (
        track.type.toLowerCase() === 'caption' ||
        track.type.toLowerCase() === 'text'
      ) {
        trackType = 'Text';
      } else if (track.type.toLowerCase() === 'audio') {
        trackType = 'Audio';
      } else if (
        track.type.toLowerCase() === 'effect' ||
        track.type.toLowerCase() === 'filter'
      ) {
        trackType = 'Effect';
      }
      return acc + getTrackHeight(trackType) + 4; // 4 is GAP
    }, 4); // 4 is PADDING_TOP
  }

  public get activeSeparatorIndex() {
    return this.#activeSeparatorIndex;
  }

  public setActiveSeparatorIndex(index: number | null) {
    this.#activeSeparatorIndex = index;
  }

  public get trackRegions() {
    return this.#trackRegions;
  }

  public get enableGuideRedraw() {
    return this.#enableGuideRedraw;
  }

  public set enableGuideRedraw(value: boolean) {
    this.#enableGuideRedraw = value;
  }

  public clearSeparatorHighlights() {
    this.#separatorLines.forEach((sep) => {
      sep.highlight.set('fill', 'transparent');
    });
  }

  public isOverTrack(y: number): boolean {
    return !!this.getTrackAt(y);
  }

  public getTrackAt(
    y: number
  ): { top: number; bottom: number; id: string } | undefined {
    return this.#trackRegions.find(
      (region) => y >= region.top && y <= region.bottom
    );
  }

  public checkSeparatorIntersection(
    cursorY: number
  ): { container: Rect; highlight: Rect; index: number } | null {
    // Separator height is 4px, so threshold should be small (half height + small margin)
    const THRESHOLD = 6;

    for (const sep of this.#separatorLines) {
      const sepCenter = sep.container.getCenterPoint();
      const distY = Math.abs(cursorY - sepCenter.y);
      if (distY < THRESHOLD) return sep;
    }
    return null;
  }

  public setTracks(tracks: ITimelineTrack[]) {
    this.#tracks = tracks;
    const storeState = useTimelineStore.getState();
    this.#clipsMap = storeState.clips;
    this.render();
  }

  public clear() {
    this.#tracks = []; // Reset tracks
    this.#clipsMap = {}; // Reset clips
    // Also clear internal object caches
    this.#trackObjects.forEach((obj) => this.canvas.remove(obj));
    this.#trackObjects.clear();
    this.#clipObjects.forEach((obj) => this.canvas.remove(obj));
    this.#clipObjects.clear();
    this.#separatorLines.forEach((sep) => {
      this.canvas.remove(sep.container);
      this.canvas.remove(sep.highlight);
    });
    this.#separatorLines = [];
    this.#trackRegions = [];
    this.clearTransitionButton();

    this.canvas.requestRenderAll();
    this.emit('timeline:cleared', {});
  }

  public render() {
    // We do NOT clear everything. We update existing objects.
    // However, separators and regions are cheap to rebuild for now,
    // or we can optimize them too. Let's start with Tracks and Clips which are heavy.

    this.#trackRegions = [];
    const usedTrackIds = new Set<string>();
    const usedClipIds = new Set<string>();

    const GAP = 4;
    const PADDING_TOP = 4;
    let currentY = PADDING_TOP;

    // Ensure separators are rebuilt (simple rects) - optimizing this later if needed
    // Actually, let's clear separators from canvas first
    this.#separatorLines.forEach((sep) => {
      this.canvas.remove(sep.container);
      this.canvas.remove(sep.highlight);
    });
    this.#separatorLines = [];

    // Render Top Separator
    this.renderSeparatorLine(0, currentY - GAP / 2, this.canvas.width || 2000);

    const trackWidth = Math.max(2000, this.canvas.width || 1000);

    // --- PASS 1: TRACKS ---
    this.#tracks.forEach((trackData) => {
      usedTrackIds.add(trackData.id);

      let trackType: TrackType = 'Video';
      if (
        trackData.type.toLowerCase() === 'caption' ||
        trackData.type.toLowerCase() === 'text'
      ) {
        trackType = 'Text';
      } else if (trackData.type.toLowerCase() === 'audio') {
        trackType = 'Audio';
      } else if (trackData.type.toLowerCase() === 'effect') {
        trackType = 'Effect';
      }

      const trackHeight = getTrackHeight(trackType);

      this.#trackRegions.push({
        top: currentY,
        bottom: currentY + trackHeight,
        id: trackData.id,
      });

      let trackObj = this.#trackObjects.get(trackData.id);
      if (!trackObj) {
        trackObj = new Track({
          left: 0,
          top: currentY,
          width: trackWidth,
          height: trackHeight,
          trackType: trackType as TrackType,
          trackId: trackData.id,
          selectable: false,
          evented: false,
        });
        this.#trackObjects.set(trackData.id, trackObj);
        this.canvas.add(trackObj);
      } else {
        trackObj.set({
          top: currentY,
          width: trackWidth,
          height: trackHeight,
        });
        trackObj.setCoords();
      }
      // (trackObj as any).sendToBack();

      currentY += trackHeight + GAP;
    });

    // --- PASS 2: SEPARATORS ---
    // Reset currentY for separators or use trackRegions
    let sepY = PADDING_TOP;
    this.renderSeparatorLine(0, sepY - GAP / 2, this.canvas.width || 2000);
    this.#trackRegions.forEach((region, index) => {
      this.renderSeparatorLine(
        index + 1,
        region.bottom + GAP / 2,
        this.canvas.width || 2000
      );
    });

    // --- PASS 3: CLIPS ---
    this.#tracks.forEach((trackData, trackIndex) => {
      const region = this.#trackRegions[trackIndex];
      const trackHeight = region.bottom - region.top;

      trackData.clipIds.forEach((clipId) => {
        usedClipIds.add(clipId);
        const clip = this.#clipsMap[clipId];
        if (!clip) return;

        const startTimeSeconds = clip.display.from / MICROSECONDS_PER_SECOND;
        const durationSeconds = clip.duration / MICROSECONDS_PER_SECOND;
        const startX =
          startTimeSeconds *
          TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
          this.#timeScale;

        const width =
          durationSeconds *
          TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
          this.#timeScale;

        if (
          clip.type === 'Caption' ||
          clip.type === 'Text' ||
          clip.type === 'Video' ||
          clip.type === 'Image' ||
          clip.type === 'Audio' ||
          clip.type === 'Effect' ||
          clip.type === 'Transition' ||
          clip.type === 'Placeholder'
        ) {
          let timelineClip = this.#clipObjects.get(clip.id);
          const clipName = clip.text || clip.name || clip.type;

          if (!timelineClip) {
            const commonProps = {
              left: startX,
              top: region.top,
              width: width,
              height: trackHeight,
              elementId: clip.id,
              content: clipName,
            };

            if (clip.type === 'Audio') {
              timelineClip = new Audio(commonProps);
            } else if (clip.type === 'Video' || clip.type === 'Placeholder') {
              timelineClip = new Video(commonProps);
            } else if (clip.type === 'Image') {
              timelineClip = new Image(commonProps);
            } else if (clip.type === 'Effect') {
              timelineClip = new Effect(commonProps);
            } else if (clip.type === 'Transition') {
              timelineClip = new Transition(commonProps);
            } else {
              timelineClip = new Text(commonProps);
            }

            this.#clipObjects.set(clip.id, timelineClip);
            this.canvas.add(timelineClip);
            timelineClip.set({
              sourceDuration: clip.sourceDuration,
              duration: clip.duration * (clip.playbackRate || 1),
              trim: clip.trim
                ? { ...clip.trim }
                : {
                    from: 0,
                    to: clip.duration * (clip.playbackRate || 1),
                  },
              playbackRate: clip.playbackRate || 1,
              timeScale: this.#timeScale,
              studioClipId: clip.id,
            });
          } else {
            timelineClip.set({
              left: startX,
              top: region.top,
              width: width,
              height: trackHeight,
              content: clipName,
              trim: clip.trim
                ? { ...clip.trim }
                : {
                    from: 0,
                    to:
                      clip.sourceDuration ||
                      clip.duration * (clip.playbackRate || 1),
                  },
              playbackRate: clip.playbackRate || 1,
              timeScale: this.#timeScale,
              duration: clip.duration * (clip.playbackRate || 1),
              sourceDuration: clip.sourceDuration,
              studioClipId: clip.id,
            });
            timelineClip.setCoords();
          }
          // (timelineClip as FabricObject).
          this.canvas.bringObjectToFront(timelineClip);
        }
      });
    });

    // Cleanup Unused Objects
    // Tracks
    for (const [id, obj] of this.#trackObjects) {
      if (!usedTrackIds.has(id)) {
        this.canvas.remove(obj);
        this.#trackObjects.delete(id);
      }
    }
    // Clips
    for (const [id, obj] of this.#clipObjects) {
      if (!usedClipIds.has(id)) {
        this.canvas.remove(obj);
        this.#clipObjects.delete(id);
      }
    }

    this.canvas.requestRenderAll();
  }

  public selectClips(clipIds: string[]) {
    // Avoid infinite loops: check if selection is already correct
    const currentSelection = this.canvas.getActiveObjects();
    const currentIds = currentSelection
      .map((obj: any) => obj.elementId)
      .filter(Boolean);

    const isSame =
      clipIds.length === currentIds.length &&
      clipIds.every((id) => currentIds.includes(id));

    if (isSame) return;

    this.canvas.discardActiveObject();

    if (clipIds.length === 0) {
      this.canvas.requestRenderAll();
      // event will be fired by discardActiveObject -> selection:cleared -> handleSelectionCleared
      return;
    }

    const objectsToSelect: FabricObject[] = [];

    // Find objects
    for (const id of clipIds) {
      const clipObj = this.#clipObjects.get(id);
      if (clipObj) {
        objectsToSelect.push(clipObj);
      }
    }

    if (objectsToSelect.length === 1) {
      this.canvas.setActiveObject(objectsToSelect[0]);
    } else if (objectsToSelect.length > 1) {
      const activeSelection = new ActiveSelection(objectsToSelect, {
        canvas: this.canvas,
      });
      this.canvas.setActiveObject(activeSelection);
    }

    this.canvas.requestRenderAll();
  }

  public deleteSelectedClips() {
    const activeObjects = this.canvas.getActiveObjects();
    if (!activeObjects || activeObjects.length === 0) return;

    const clipIdsToDelete: string[] = [];

    // Filter out everything that is not a clip (e.g. tracks, separators)
    // Though usually only clips are selectable.
    activeObjects.forEach((obj: any) => {
      if (obj.elementId) {
        clipIdsToDelete.push(obj.elementId);
        // Remove from canvas immediately
        this.canvas.remove(obj);
        // Remove from internal clip map
        this.#clipObjects.delete(obj.elementId);
      }
    });

    if (clipIdsToDelete.length > 0) {
      this.canvas.discardActiveObject();
      this.emit('clips:removed', { clipIds: clipIdsToDelete });
      this.emitSelectionChange(); // Will emit empty selection
      this.canvas.requestRenderAll();
    }
  }

  public duplicateSelectedClips() {
    const activeObjects = this.canvas.getActiveObjects();
    if (!activeObjects || activeObjects.length === 0) return;

    const clipIdsToDuplicate: string[] = [];

    activeObjects.forEach((obj: any) => {
      if (obj.elementId) {
        clipIdsToDuplicate.push(obj.elementId);
      }
    });

    if (clipIdsToDuplicate.length > 0) {
      this.emit('selection:duplicated', { clipIds: clipIdsToDuplicate });
    }
  }

  public splitSelectedClip(splitTime: number) {
    const activeObjects = this.canvas.getActiveObjects();

    // 1. Check strict single selection
    if (!activeObjects || activeObjects.length !== 1) {
      console.warn('Split requires exactly one selected clip.');
      return;
    }

    const obj = activeObjects[0] as any;
    const clipId = obj.elementId;

    if (!clipId) return;

    // 2. Validate split time against clip bounds
    const clip = this.#clipsMap[clipId];
    if (!clip) {
      console.error('Clip not found for split:', clipId);
      return;
    }

    // "split can be done only if 1 clip is selected" - Checked.
    // "Either the current time can be provided" - Provided as arg.

    // Check if time is within clip display range (exclusive of edges)
    // We don't split if exactly at start or end.
    if (splitTime <= clip.display.from || splitTime >= clip.display.to) {
      console.warn(
        'Split time is outside the clip range or at the edges.',
        splitTime,
        clip.display
      );
      return;
    }

    // 3. Emit event
    this.emit('selection:split', { clipId, splitTime });
  }

  public emitSelectionChange() {
    const activeObjects = this.canvas.getActiveObjects();
    const activeIds = activeObjects
      .map((obj: any) => obj.elementId)
      .filter(Boolean);

    this.emit('selection:changed', { selectedIds: activeIds });
  }

  private renderSeparatorLine(index: number, top: number, width: number) {
    // Container rect - 4px total height, transparent
    const container = new Rect({
      left: 0,
      top: top,
      width: width,
      height: 4,
      fill: 'transparent',
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      originY: 'center',
      opacity: 0.5,
    });

    // Highlight rect - 2px in the center, initially transparent
    const highlight = new Rect({
      left: 0,
      top: top,
      width: width,
      height: 2,
      fill: 'transparent',
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      originY: 'center',
      opacity: 0.8,
    });

    this.canvas.add(container);
    this.canvas.add(highlight);
    this.#separatorLines.push({ container, highlight, index });
  }

  public setTimeScale(zoom: number) {
    this.#timeScale = zoom;
    this.render();
  }

  public setScroll(scrollX: number, scrollY: number) {
    const vpt = this.canvas.viewportTransform;
    vpt[4] = -scrollX;
    vpt[5] = -scrollY;
    this.canvas.requestRenderAll();
  }

  public dispose() {
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
    if (this.canvas) {
      this.canvas.off('object:moving', this.#onDragging);
      this.canvas.off('object:modified', this.#onTrackRelocation);
      this.canvas.off('object:modified', this.#onClipModification);
      this.canvas.off('selection:created', this.#onSelectionCreate);
      this.canvas.off('selection:updated', this.#onSelectionUpdate);
      this.canvas.off('selection:cleared', this.#onSelectionClear);
      this.canvas.off('mouse:move', this.#onMouseMove);

      this.clearTransitionButton();
      this.scrollbars.dispose();
      this.canvas.dispose();
    }
  }
}

export default Timeline;
