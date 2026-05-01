import {
  Canvas,
  CanvasOptions,
  FabricObject,
  TMat2D,
  TPointerEvent,
  TPointerEventInfo,
  Transform,
  classRegistry
} from "fabric";

import CanvasMixin from "./mixins/canvas";
import TrackManager from "./managers/track-manager";
import ItemManager from "./managers/item-manager";
import TransitionManager from "./managers/transition-manager";
import DragStateManager from "./managers/drag-state-manager";
import SyncManager from "./managers/sync-manager";
import { addCanvasEvents, removeCanvasEvents } from "./events/canvas/events";
import {
  addTimelineEvents,
  removeTimelineEvents
} from "./events/canvas/timeline";
import {
  ITimelineScaleState,
  ITrack,
  IClip,
  ITransitionClip,
  IUpdateStateOptions,
  CanvasSpacing,
  State
} from "./types";
export interface ITimelineTrack extends ITrack {
  accepts?: string[];
  magnetic?: boolean;
  static?: boolean;
  muted?: boolean;
}
import { timeUsToUnits } from "./utils/timeline";
import { applyMixins } from "./utils/apply-mixins";
import EventEmitter from "./utils/event-emitter";
import { calcCanvasSpacing, isTouchEvent } from "./utils/canvas";
import { ACTIVE_SELECTION_COLOR } from "./constants/objects";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "./constants/constants";
import { Track } from "./objects";
import { detectOverObject } from "./utils/over-element";
import { TIMELINE_BOUNDING_CHANGED, TIMELINE_SCALE_CHANGED } from "./global";
import { INTERNAL_OBJECT_TYPES } from "./constants/objects";
import { ScrollbarsProps } from "./scrollbar/types";
import { Scrollbars } from "./scrollbar";
import { makeMouseWheel } from "./scrollbar/util";
interface Bounding {
  width: number;
  height: number;
}

export interface TimelineOptions extends CanvasOptions {
  bounding?: {
    width: number;
    height: number;
  };
  onScroll?: OnScroll;
  onResizeCanvas?: OnResizeCanvas;
  tScale?: number;
  scale: ITimelineScaleState;
  itemTypes: string[];
  sizesMap: Record<string, number>;
  acceptsMap: Record<string, string[]>;
  spacing?: CanvasSpacing;
  withTransitions?: string[];
}

type ScrollConfig = {
  offsetX?: number;
  offsetY?: number;
  extraMarginX?: number;
  extraMarginY?: number;
  scrollbarWidth?: number;
  scrollbarColor?: string;
  min?: number;
  max?: number;
};

type OnScroll = (v: { scrollTop: number; scrollLeft: number }) => void;
type OnResizeCanvas = (v: { width: number; height: number }) => void;
interface Timeline extends Canvas, CanvasMixin {}

class Timeline extends Canvas {
  static objectTypes: string[] = [];

  static registerItems(classes: Record<string, any>) {
    Object.keys(classes).forEach((key) => {
      classRegistry.setClass(classes[key], key);
    });
    Timeline.objectTypes = Object.keys(classes).filter(
      (key) => !INTERNAL_OBJECT_TYPES.includes(key)
    );
  }

  public itemTypes: string[] = [];
  public acceptsMap: Record<string, string[]>;
  public sizesMap: Record<string, number> = {};
  public objectTypes: string[] = [];
  // Declare properties from state
  public tracks: ITimelineTrack[] = [];
  public hoverCornerItem: boolean = false;
  public trackItemsMap: Record<string, IClip> = {};
  public trackItemIds: string[] = [];
  public transitionIds: string[] = [];
  public transitionsMap: Record<string, ITransitionClip> = {};
  public scale: ITimelineScaleState;
  public duration: number;
  public bounding: Bounding;
  public onScroll?: OnScroll;
  public onResizeCanvas?: OnResizeCanvas;
  public tScale: number;
  public activeIds: string[] = [];
  public spacing: CanvasSpacing;
  public guideLineColor: string;
  public withTransitions: string[] = [];
  public emitter: EventEmitter<Record<string, any>>;
  public tracksManager: TrackManager;
  public itemsManager: ItemManager;
  public transitionManager: TransitionManager;
  public dragStateManager: DragStateManager;
  public syncManager: SyncManager;
  private _mouseWheelHandler?: (e: TPointerEventInfo<WheelEvent>) => void;
  private _scrollbars?: Scrollbars;
  private _viewportChangeCallback?: (left: number) => void;

  constructor(
    canvasEl: HTMLCanvasElement,
    options: Partial<TimelineOptions> & {
      scale: ITimelineScaleState;
      duration: number;
      guideLineColor?: string;
    }
  ) {
    super(canvasEl, options);
    this.emitter = new EventEmitter<Record<string, any>>();
    this.bounding = options.bounding || {
      width: options.width || 0,
      height: options.height || 0
    };
    this.tScale = options.scale?.zoom || 1;

    this.tracksManager = new TrackManager(this);
    this.itemsManager = new ItemManager(this);
    this.transitionManager = new TransitionManager(this);
    this.dragStateManager = new DragStateManager();
    this.syncManager = new SyncManager(this);

    this.onScroll = options.onScroll;
    this.onResizeCanvas = options.onResizeCanvas;

    this.acceptsMap = options.acceptsMap || {};
    this.sizesMap = options.sizesMap || {};
    this.itemTypes = options.itemTypes || [];
    this.objectTypes = Timeline.objectTypes;

    this.spacing = calcCanvasSpacing(options.spacing);

    this.positionAfterTransform = {};

    this.initializeCanvasDefaults();
    this.scale = options.scale;
    this.duration = options.duration;
    this.guideLineColor = options.guideLineColor || ACTIVE_SELECTION_COLOR;
    this.initEventListeners();
    this.withTransitions = options.withTransitions || [];
  }

  initScrollbars(config: ScrollConfig = {}): void {
    const scrollConfig: ScrollbarsProps = {
      offsetX: config.offsetX ?? 0,
      offsetY: config.offsetY ?? 0,
      extraMarginX: config.extraMarginX ?? 200,
      extraMarginY: config.extraMarginY ?? 200,
      scrollbarWidth: config.scrollbarWidth,
      scrollbarColor: config.scrollbarColor,
      onViewportChange: (left: number) => {
        if (this._viewportChangeCallback) {
          this._viewportChangeCallback(left);
        }
      }
    };

    this._mouseWheelHandler = makeMouseWheel(this, {
      ...scrollConfig,
      min: config.min ?? 0.1,
      max: config.max ?? 10,
      onZoom: (zoom: number) => {
        this.emitter.emit(TIMELINE_SCALE_CHANGED, {
          payload: {
            scale: {
              ...this.scale,
              zoom
            }
          }
        });
      }
    });
    this.on("mouse:wheel", this._mouseWheelHandler);

    this._scrollbars = new Scrollbars(this, scrollConfig);

    const offsetX = config.offsetX ?? 0;
    const offsetY = config.offsetY ?? 0;

    if (offsetX !== 0 || offsetY !== 0) {
      const vpt = this.viewportTransform.slice(0) as TMat2D;
      vpt[4] = offsetX;
      vpt[5] = offsetY;
      this.setViewportTransform(vpt);
      this.requestRenderAll();
    }
  }

  onViewportChange(callback: (left: number) => void): void {
    this._viewportChangeCallback = callback;
  }

  disposeScrollbars(): void {
    if (this._mouseWheelHandler) {
      this.off("mouse:wheel", this._mouseWheelHandler);
      this._mouseWheelHandler = undefined;
    }

    if (this._scrollbars) {
      this._scrollbars.dispose();
      this._scrollbars = undefined;
    }
  }

  public getItemAccepts(itemType: string) {
    
    return this.acceptsMap[itemType.toLowerCase()] || this.itemTypes;
  }

  public getItemSize(itemType: string) {    
    return this.sizesMap[itemType.toLowerCase()] || 42;
  }

  private initializeCanvasDefaults() {
    const vt = this.viewportTransform;
    vt[4] = this.spacing.left;

    Object.assign(FabricObject.ownDefaults, {
      borderColor: "transparent",
      cornerColor: "white",
      cornerStrokeColor: "transparent",
      strokeWidth: 0,
      borderOpacityWhenMoving: 1,
      borderScaleFactor: 1,
      cornerSize: 8,
      cornerStyle: "rect",
      centeredScaling: false,
      centeredRotation: true,
      transparentCorners: false
    });
  }

  // detect if the mouse click does not land on any item -> clean the selection and generate another selection
  public __onMouseDown(e: TPointerEvent) {
    const point = this.getScenePoint(e);
    const target = this._activeObject;
    const activeObjects = this.getActiveObjects();
    if (activeObjects.length === 0) {
      super.__onMouseDown(e);
      return;
    }
    const { isOverObject: overActiveObject } = detectOverObject(
      point,
      activeObjects
    );
    if (target) {
      const handle = target?.findControl(
        this.getViewportPoint(e),
        isTouchEvent(e)
      );
      if (handle) {
        super.__onMouseDown(e);
        return;
      }
    }
    const items = this.itemsManager.getTrackItems();
    const transitions = this.getObjects("Transition");
    const { isOverObject: overAnyObject, overObjects } = detectOverObject(
      point,
      [...transitions, ...items]
    );
    if (overAnyObject) {
      if (overActiveObject) {
        super.__onMouseDown(e);
      } else {
        this.setActiveIds([overObjects[0].id]);
        super.__onMouseDown(e);
      }
    } else {
      this.discardActiveObject();
      this.requestRenderAll();
      this.setActiveIds([]);
      this._groupSelector = {
        x: point.x,
        y: point.y,
        deltaY: 0,
        deltaX: 0
      };
      super.__onMouseDown(e);
    }
  }

  public _setupCurrentTransform(
    e: TPointerEvent,
    target: FabricObject,
    alreadySelected: boolean
  ): void {
    if (this.hoverCornerItem) {
      const pointer = this.getScenePoint(e);
      const { key: corner = "", control } = target.getActiveControl() || {};
      const actionHandler =
        control && control.getActionHandler(e, target, control)?.bind(control);
      const origin = this._getOriginFromCorner(target, corner);
      const transform: Transform = {
        target: target,
        action: "resizing",
        actionHandler,
        actionPerformed: false,
        corner,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        skewX: target.skewX,
        skewY: target.skewY,
        offsetX: pointer.x - target.left,
        offsetY: pointer.y - target.top,
        originX: origin.x,
        originY: origin.y,
        ex: pointer.x,
        ey: pointer.y,
        lastX: pointer.x,
        lastY: pointer.y,
        theta: (target.angle * Math.PI) / 180,
        width: target.width,
        height: target.height,
        shiftKey: e.shiftKey,
        altKey: false,
        original: {
          ...{
            scaleX: target.scaleX,
            scaleY: target.scaleY,
            skewX: target.skewX,
            skewY: target.skewY,
            angle: target.angle,
            left: target.left,
            flipX: target.flipX,
            flipY: target.flipY,
            top: target.top
          },
          originX: origin.x,
          originY: origin.y
        }
      };
      this._currentTransform = transform;
      this.fire("before:transform", {
        e,
        transform
      });
    } else {
      super._setupCurrentTransform(e, target, alreadySelected);
    }
  }

  public initEventListeners() {
    addTimelineEvents(this);
    addCanvasEvents(this);
  }

  // --- SYNC API FOR STATE MANAGEMENT ---

  public syncSelection(activeIds: string[]) {
    this.syncManager.syncSelection(activeIds);
  }

  public syncTracksAndClips(data: {
    tracks: ITimelineTrack[];
    duration: number;
    clips: IClip[];
  }) {
    this.syncManager.syncTracksAndClips(data);
  }

  public syncTracks(data: { tracks: ITimelineTrack[]; changedTracks: string[] }) {
    this.syncManager.syncTracks(data);
  }

  public syncClipProperties(data: {
    clips: IClip[];
    state?: any;
    changedTrimIds?: string[];
    changedDisplayIds?: string[];
  }) {
    this.syncManager.syncClipProperties(data);
  }

  public syncScale(data: { scale: ITimelineScaleState }) {
    this.setScale(data.scale);
  }

  public syncHistory(data: { tracks: ITimelineTrack[]; clips: IClip[] }) {
    this.syncManager.syncHistory(data);
  }

  public syncAddOrRemoveClips(currentState: State) {
    this.syncManager.syncAddOrRemoveClips(currentState);
  }

  public setActiveIds(activeIds: string[]) {
    this.syncManager.setActiveIds(activeIds);
  }

  public updateState(
    dataHistory: IUpdateStateOptions = { updateHistory: false }
  ) {
    this.syncManager.updateState(dataHistory);
  }

  public getUpdatedState() {
    return this.syncManager.getUpdatedState();
  }

  public purge() {
    removeCanvasEvents(this);
    removeTimelineEvents(this);
    this.disposeScrollbars();
    this.dispose();
  }

  public scrollTo({
    scrollLeft,
    scrollTop
  }: {
    scrollLeft?: number;
    scrollTop?: number;
  }): void {
    const vt = [...this.viewportTransform]; // Create a shallow copy
    let hasChanged = false;

    if (typeof scrollLeft === "number") {
      vt[4] = -scrollLeft + this.spacing.left;
      hasChanged = true;
    }
    if (typeof scrollTop === "number") {
      vt[5] = -scrollTop;
      hasChanged = true;
    }

    if (hasChanged) {
      this.viewportTransform = vt as TMat2D;
      this.getActiveObject()?.setCoords();
      this.requestRenderAll();
    }
  }

  public setBounding(bounding: Bounding) {
    this.bounding = bounding;
  }

  public calcBounding() {
    const staticTracks = (this.getObjects("Track") as Track[]).filter(
      (track) => track.static
    );

    // get the largest bounding box for right and bottom of the objects
    const yBounding = [
      ...this.itemsManager.getTrackItems(),
      ...staticTracks
    ].reduce(
      (acc, obj) => {
        const { top, height } = obj.getBoundingRect();
        return {
          top: Math.min(acc.top, top),
          height: Math.max(acc.height, top + height)
        };
      },
      {
        top: Infinity,
        height: 0
      }
    );

    const xBounding = [...this.itemsManager.getTrackItems()].reduce(
      (acc, obj) => {
        const { left, width } = obj.getBoundingRect();
        return {
          left: Math.min(acc.left, left),
          width: Math.max(acc.width, left + width)
        };
      },
      {
        left: Infinity,
        width: this.width
      }
    );

    // Check if the width has changed
    const prevBoundingWidth = this.bounding.width;
    const nextBoundingWidth = xBounding.width;

    const changeWidth = nextBoundingWidth - prevBoundingWidth;

    if (changeWidth < 0) {
      const items = this.itemsManager.getTrackItems();
      const elWidth = this.getElement().clientWidth;
      const maxObject = items.reduce(
        (max, obj) => (obj.left + obj.width > max.left + max.width ? obj : max),
        items[0]
      );

      if (!maxObject) return;

      if (Math.abs(changeWidth) > elWidth) {
        // Set viewport to extreme right
        this.setViewportPos(
          -(nextBoundingWidth - elWidth) + this.spacing.right,
          this.viewportTransform[5]
        );
      } else if (maxObject.left + maxObject.width <= elWidth) {
        this.setViewportPos(
          TIMELINE_OFFSET_CANVAS_LEFT,
          this.viewportTransform[5]
        );
      } else {
        // Adjust viewport position by the width change
        this.setViewportPos(
          this.viewportTransform[4] - changeWidth,
          this.viewportTransform[5]
        );
      }
    }

    this.bounding = {
      ...yBounding,
      ...xBounding
    };
    this.emitter.emit(TIMELINE_BOUNDING_CHANGED, {
      payload: {
        bounding: {
          ...yBounding,
          ...xBounding
        }
      }
    });
  }

  public setViewportPos(posX: number, posY: number) {
    const limitedPos = this.getViewportPos(posX, posY);
    const vt = this.viewportTransform;
    vt[4] = limitedPos.x;
    vt[5] = limitedPos.y;
    this.requestRenderAll();
    this.setActiveTrackItemCoords();
    this.onScroll?.({
      scrollTop: limitedPos.y,
      scrollLeft: limitedPos.x - this.spacing.left
    });
  }

  public setActiveTrackItemCoords() {
    this.itemsManager.setActiveTrackItemCoords();
  }

  public getViewportPos(posX: number, posY: number) {
    const canvas = this;
    const spacingRight =
      this.bounding.width - 100 >= canvas.width ? this.spacing.right : 0;
    const minX = canvas.width - this.bounding.width - spacingRight;
    const maxX = this.spacing.left;

    const limitedPosX = Math.max(minX, Math.min(posX, maxX));

    if (this.bounding.height < this.height) {
      return { x: limitedPosX, y: 0 };
    }
    const minY = canvas.height - this.bounding.height - 40;
    const maxY = 0;

    const limitedPosY = Math.max(minY, Math.min(posY, maxY));
    return { x: limitedPosX, y: limitedPosY };
  }

  public setScale(scale: ITimelineScaleState) {
    this.pauseEventListeners();
    this.tScale = scale.zoom;
    this.scale = scale;

    const objects = this.itemsManager.getTrackItems();

    objects.forEach((obj) => {
      const position = timeUsToUnits(obj.display.from, this.tScale);
      const size = timeUsToUnits(
        obj.display.to - obj.display.from,
        this.tScale,
        obj.playbackRate
      );

      obj.set({ left: position, width: size, tScale: scale.zoom });
      if (obj.onScale) obj.onScale();
      obj.setCoords();
    });

    this.requestRenderAll();
    this.calcBounding();
    this.tracksManager.refreshTrackLayout();
    this.transitionManager.updateTransitions(false);
    this.resumeEventListeners();
  }
}

applyMixins(Timeline, [CanvasMixin]);

export default Timeline;
