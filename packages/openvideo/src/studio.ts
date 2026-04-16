import {
  Application,
  Sprite,
  Texture,
  Container,
  Graphics,
  RenderTexture,
  BlurFilter,
  ColorMatrixFilter,
  Filter,
  GlProgram,
  UniformGroup,
} from "pixi.js";

import { Caption } from "./clips/caption-clip";
import { Image } from "./clips/image-clip";
import type { IClip, IPlaybackCapable } from "./clips/iclip";
import { Text } from "./clips/text-clip";
import { Video } from "./clips/video-clip";
import { Effect } from "./clips/effect-clip";
import {
  PixiSpriteRenderer,
  updateSpriteTransform,
} from "./sprite/pixi-sprite-renderer";
import { type ProjectJSON } from "./json-serialization";
import { Transformer } from "./transfomer/transformer";
import type { EffectKey } from "./effect/glsl/gl-effect";
import { makeEffect } from "./effect/effect";
import { makeTransition } from "./transition/transition";
import { parseColor, hexToRgb } from "./utils/color";
import { vertex } from "./effect/vertex";
import { SELECTIVE_HSL_FRAGMENT } from "./effect/glsl/custom-glsl";
import {
  applyColorAdjustmentToMatrix,
  getAllSelectiveHsl,
  hasColorAdjustment,
} from "./utils/color-adjustment";

import EventEmitter from "./event-emitter";

export interface IStudioOpts {
  width: number;
  height: number;
  fps?: number;
  bgColor?: string;
  canvas?: HTMLCanvasElement;
  interactivity?: boolean;
  spacing?: number;
}

interface ActiveGlobalEffect {
  id: string;
  key: EffectKey;
  startTime: number;
  duration: number;
  trackIndex?: number;
  values?: Record<string, any>;
}
interface GlobalEffectInfo {
  id: string;
  key: EffectKey;
  startTime: number;
  duration: number;
}

export interface StudioEvents {
  "selection:created": { selected: IClip[] };
  "selection:updated": { selected: IClip[] };
  "selection:cleared": { deselected: IClip[] };
  "track:added": { track: StudioTrack; index?: number };
  "track:order-changed": { tracks: StudioTrack[] };
  "track:removed": { trackId: string };
  "clip:added": { clip: IClip; trackId: string };
  "clips:added": { clips: IClip[]; trackId?: string }; // Batch event
  "clip:removed": { clipId: string };
  "clip:updated": { clip: IClip };
  "clip:lock-changed": { clip: IClip; locked: boolean };
  "clip:replaced": { oldClip: IClip; newClip: IClip; trackId: string };
  "studio:restored": {
    clips: IClip[];
    tracks: StudioTrack[];
    settings: IStudioOpts;
  };
  currentTime: { currentTime: number };
  play: { isPlaying: boolean };
  pause: { isPlaying: boolean };
  "history:changed": { canUndo: boolean; canRedo: boolean };
  "transform:start": { transformer: Transformer };
  "transform:end": { transformer: Transformer };
  "clip:dblclick": { clip: IClip };
  /**
   * Emitted after every action dispatched via studio.dispatch().
   * External layers (collab, agent, sync) should listen to this event
   * to observe the stream of edits. Do NOT call studio.dispatch() again
   * inside this handler for the same action — use _meta to track origin.
   */
  "action:dispatched": { action: StudioAction };
  [key: string]: any;
  [key: symbol]: any;
}

export interface StudioTrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
}

/**
 * Interactive preview studio for clips with playback controls
 * Useful for previewing clips before rendering with Compositor
 *
 * @example
 * const studio = new Studio({
 *   width: 1280,
 *   height: 720,
 *   fps: 30,
 *   bgColor: '#000'
 * });
 *
 * await studio.addClip(spr1);
 * await studio.addClip(spr2);
 * studio.play();
 *
 * studio.on('selection:created', ({ selected }) => {
 *   console.log('Selection created', selected);
 * });
 */
import { SelectionManager } from "./studio/selection-manager";
import { Transport } from "./studio/transport";
import { TimelineModel } from "./studio/timeline-model";
import { HistoryManager, HistoryState } from "./studio/history-manager";
import { ResourceManager } from "./studio/resource-manager";
import { jsonToClip } from "./json-serialization";
import { Difference } from "microdiff";
import { ActionDispatcher } from "./studio/action-dispatcher";
import type { StudioAction } from "./actions";

export class Studio extends EventEmitter<StudioEvents> {
  public selection: SelectionManager;
  public transport: Transport;
  public timeline: TimelineModel;
  public history: HistoryManager;
  public resourceManager: ResourceManager;
  /**
   * Action dispatcher — the inbound gateway for agentic and external systems.
   * Use studio.dispatch(action) for ergonomic access.
   */
  public dispatcher: ActionDispatcher;
  public pixiApp: Application | null = null;
  public get tracks() {
    return this.timeline.tracks;
  }
  public get clips() {
    return this.timeline.clips;
  }
  // BUT I need to remove the getter/setter I added in previous step.
  // And restoring `private clips` property.

  public spriteRenderers = new Map<IClip, PixiSpriteRenderer>();
  public artboard: Container | null = null;
  public clipContainer: Container | null = null;
  public artboardMask: Graphics | null = null;
  public artboardBg: Graphics | null = null;

  // Transformer for interactive transform controls
  // Transformer for interactive transform controls
  // Delegated to SelectionManager
  public get activeTransformer(): Transformer | null {
    return this.selection.activeTransformer;
  }
  public set activeTransformer(val: Transformer | null) {
    this.selection.activeTransformer = val;
  }

  public get selectedClips(): Set<IClip> {
    return this.selection.selectedClips;
  }
  public set selectedClips(val: Set<IClip>) {
    this.selection.selectedClips = val;
  }

  public get interactiveClips(): Set<IClip> {
    return this.selection.interactiveClips;
  }
  public set interactiveClips(val: Set<IClip>) {
    this.selection.interactiveClips = val;
  }

  // Playback elements for clips that support playback
  public get playbackElements() {
    return this.transport.playbackElements;
  }

  public videoSprites = new Map<IClip, Sprite>();
  public clipListeners = new Map<IClip, () => void>();
  // Only for Video

  public get isPlaying() {
    return this.transport.isPlaying;
  }
  public set isPlaying(val: boolean) {
    this.transport.isPlaying = val;
  }

  public get currentTime() {
    return this.transport.currentTime;
  }
  public set currentTime(val: number) {
    this.transport.currentTime = val;
  }

  public get maxDuration() {
    return this.transport.maxDuration;
  }
  public set maxDuration(val: number) {
    this.transport.maxDuration = val;
  }

  public opts: Required<Omit<IStudioOpts, "canvas">> & {
    canvas?: HTMLCanvasElement;
  };
  public destroyed = false;
  private renderingSuspended = false;
  private historyPaused = false;
  private processingHistory = false;
  /**
   * By asserting this flag, the next history save will silently update the baseline without adding to the undo stack.
   */
  public ignoreHistoryForNextAction = false;
  /**
   * Indicates if the studio is currently restoring state from history (undo/redo)
   */
  public isRestoring = false;
  private historyGroupDepth = 0;
  private clipCache = new Map<string, IClip>();
  private _isUpdatingLayout = false;

  // Effect system
  public globalEffects = new Map<string, GlobalEffectInfo>();
  public activeGlobalEffects: ActiveGlobalEffect[] = [];
  // private postProcessContainer: Container; // Removed
  public currentGlobalEffectSprite: Sprite | null = null;
  public effectFilters = new Map<
    string,
    Awaited<ReturnType<typeof makeEffect>>
  >();
  public transitionRenderers = new Map<
    string,
    ReturnType<typeof makeTransition>
  >();
  public transitionSprites = new Map<string, Sprite>();
  public transFromTexture: RenderTexture | null = null;
  public transToTexture: RenderTexture | null = null;
  public transBgGraphics: Graphics | null = null;
  public clipsNormalContainer: Container | null = null;
  public clipsEffectContainer: Container | null = null;
  public videoTextureCache = new WeakMap<HTMLVideoElement, Texture>();
  public lastFromFrame: Texture | ImageBitmap | null = null;
  public lastToFrame: Texture | ImageBitmap | null = null;
  /**
   * Convert hex color string to number
   */
  private hexToNumber(hex: string): number {
    // Remove # if present
    const hexStr = hex.startsWith("#") ? hex.slice(1) : hex;
    return parseInt(hexStr, 16);
  }

  public ready: Promise<void>;
  /**
   * Create a new Studio instance
   */
  constructor(opts: IStudioOpts) {
    super();
    // this.postProcessContainer = new Container(); // Removed
    this.opts = {
      fps: 30,
      bgColor: "#000000",
      interactivity: true,
      spacing: 0,
      ...opts,
    };

    this.selection = new SelectionManager(this);
    this.transport = new Transport(this);
    this.timeline = new TimelineModel(this);
    this.history = new HistoryManager();
    this.resourceManager = new ResourceManager();
    this.dispatcher = new ActionDispatcher(this);

    this.ready = this.initPixiApp().then(() => {
      // Initialize history with initial state after Pixi is ready and dimensions are set correctly
      this.history.init(this.exportToJSON());
    });

    this.on("clip:added", (data) => this.handleTimelineChange(data));
    this.on("clips:added", (data) => this.handleTimelineChange(data));
    this.on("clip:replaced", (data) =>
      this.handleTimelineChange({ clip: data.newClip }),
    );
    this.on("studio:restored", (data) => {
      data.clips.forEach((c) => this.attachClipEvents(c));
      this.handleTimelineChange();
    });
    this.on("clip:removed", this.handleClipRemoved);
    this.on("clips:removed", this.handleClipsRemoved);
    this.on("clip:updated", this.handleTimelineChange);
    this.on("track:removed", () => this.handleTimelineChange());
    this.on("track:added", () => this.handleTimelineChange());
  }

  private attachClipEvents(clip: IClip) {
    if (this.clipListeners.has(clip)) return;
    const listener = () => {
      this.updateFrame(this.currentTime);
    };
    clip.on("request-render" as any, listener);
    this.clipListeners.set(clip, listener);
  }

  private handleTimelineChange = (data?: { clip?: IClip; clips?: IClip[] }) => {
    if (data?.clip) this.attachClipEvents(data.clip);
    if (data?.clips) data.clips.forEach((c) => this.attachClipEvents(c));

    // Force a re-render of the current frame to reflect changes
    this.updateFrame(this.currentTime);
    this.saveHistory();
  };

  private saveHistory() {
    if (this.historyPaused || this.processingHistory) return;

    if (this.ignoreHistoryForNextAction) {
      this.history.updateWithoutPush(this.exportToJSON());
      this.ignoreHistoryForNextAction = false;
      return;
    }

    this.history.push(this.exportToJSON());
    this.emit("history:changed", {
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
    });
  }

  public beginHistoryGroup() {
    // During undo/redo we are replaying history patches; grouping here would
    // incorrectly toggle `historyPaused` and push new history entries mid-restore.
    if (this.processingHistory || this.isRestoring) return;
    this.historyGroupDepth++;
    this.historyPaused = true;
  }

  public endHistoryGroup() {
    if (this.processingHistory || this.isRestoring) return;
    this.historyGroupDepth = Math.max(0, this.historyGroupDepth - 1);
    if (this.historyGroupDepth === 0) {
      this.historyPaused = false;
      this.saveHistory();
    }
  }

  private setPath(obj: any, path: (string | number)[], value: any) {
    let target = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!target[key]) {
        target[key] = typeof path[i + 1] === "number" ? [] : {};
      }
      target = target[key];
    }
    target[path[path.length - 1]] = value;
  }

  private async applyHistoryPatches(
    patches: Difference[],
    state: HistoryState,
    reverse: boolean,
  ) {
    const clipChanges = new Map<string, any>();
    const clipsToAdd = new Map<string, any>();
    const clipsToRemove = new Set<string>();

    for (const patch of patches) {
      const { type, path } = patch;
      const value = (patch as any).value;
      const oldValue = (patch as any).oldValue;

      if (path[0] === "clips") {
        const clipId = path[1] as string;
        if (reverse) {
          if (type === "CREATE") clipsToRemove.add(clipId);
          else if (type === "REMOVE") clipsToAdd.set(clipId, oldValue);
          else if (type === "CHANGE") {
            if (!clipChanges.has(clipId)) clipChanges.set(clipId, {});
            this.setPath(
              clipChanges.get(clipId),
              path.slice(2) as (string | number)[],
              oldValue,
            );
          }
        } else {
          if (type === "CREATE") clipsToAdd.set(clipId, value);
          else if (type === "REMOVE") clipsToRemove.add(clipId);
          else if (type === "CHANGE") {
            if (!clipChanges.has(clipId)) clipChanges.set(clipId, {});
            this.setPath(
              clipChanges.get(clipId),
              path.slice(2) as (string | number)[],
              value,
            );
          }
        }
      } else if (path[0] === "settings") {
        if (reverse) {
          this.setPath(
            this.opts,
            path.slice(1) as (string | number)[],
            oldValue,
          );
        } else {
          this.setPath(this.opts, path.slice(1) as (string | number)[], value);
        }
      }
    }

    // Apply removals
    for (const clipId of clipsToRemove) {
      const clip = this.timeline.getClipById(clipId);
      if (clip) await this.removeClip(clip);
    }

    // Apply additions
    for (const [clipId, clipJSON] of clipsToAdd) {
      let clip = this.clipCache.get(clipId);
      if (!clip) {
        clip = await jsonToClip(clipJSON);
        this.clipCache.set(clipId, clip);
        this.attachClipEvents(clip);
      }

      // Find original track ID from target state
      let trackId: string | undefined;
      for (const track of state.tracks) {
        if (track.clipIds.includes(clipId)) {
          trackId = track.id;
          break;
        }
      }

      await this.addClip(clip, { trackId });
    }

    // Apply property changes
    for (const [clipId, updates] of clipChanges) {
      await this.updateClip(clipId, updates);
    }

    // Sync all tracks at once to ensure correct order and clipIds
    this.timeline.setTracks(state.tracks);


    // Emit single restore event to sync UI (e.g. Timeline Store)
    // This ensures tracks and clips are perfectly in sync with the engine state
    this.emit("studio:restored", {
      clips: this.clips,
      tracks: this.tracks,
      settings: this.opts,
    });
  }

  public async undo() {
    if (!this.history.canUndo() || this.processingHistory) return;
    this.processingHistory = true;
    this.isRestoring = true;
    this.historyPaused = true;
    try {
      const result = this.history.undo(this.exportToJSON());
      if (result) {
        await this.applyHistoryPatches(result.patches, result.state, true);
      }
      this.emit("history:changed", {
        canUndo: this.history.canUndo(),
        canRedo: this.history.canRedo(),
      });
    } finally {
      this.historyPaused = false;
      this.isRestoring = false;
      this.processingHistory = false;
    }
  }

  public async redo() {
    if (!this.history.canRedo() || this.processingHistory) return;
    this.processingHistory = true;
    this.isRestoring = true;
    this.historyPaused = true;
    try {
      const result = this.history.redo(this.exportToJSON());
      if (result) {
        await this.applyHistoryPatches(result.patches, result.state, false);
      }
      this.emit("history:changed", {
        canUndo: this.history.canUndo(),
        canRedo: this.history.canRedo(),
      });
    } finally {
      this.historyPaused = false;
      this.isRestoring = false;
      this.processingHistory = false;
    }
  }

  private cleanupClipVisuals = (clipId: string) => {
    // 1. Cleanup SpriteRenderers
    for (const [clip, renderer] of this.spriteRenderers) {
      if (clip.id === clipId) {
        // Remove from parent if possible (renderer.getRoot() exists)
        const root = renderer.getRoot();
        if (root && root.parent) {
          root.parent.removeChild(root);
        }
        renderer.destroy();
        this.spriteRenderers.delete(clip);
        break; // Assuming 1:1 map
      }
    }

    // 2. Cleanup Transition Sprites
    const transSprite = this.transitionSprites.get(clipId);
    if (transSprite) {
      if (transSprite.parent) {
        transSprite.parent.removeChild(transSprite);
      }
      transSprite.destroy();
      this.transitionSprites.delete(clipId);
    }

    // 3. Cleanup Transition Renderers
    const transRenderer = this.transitionRenderers.get(clipId);
    if (transRenderer) {
      // transRenderer might not have destroy, just remove from map
      this.transitionRenderers.delete(clipId);
    }

    // 4. Cleanup Video Sprites
    for (const [clip, sprite] of this.videoSprites) {
      if (clip.id === clipId) {
        if (sprite.parent) {
          sprite.parent.removeChild(sprite);
        }
        sprite.destroy();
        this.videoSprites.delete(clip);
        break;
      }
    }

    // 5. Cleanup Clip Listeners
    const clip = this.timeline.getClipById(clipId);
    if (clip) {
      const listener = this.clipListeners.get(clip);
      if (listener) {
        clip.off("request-render" as any, listener);
        this.clipListeners.delete(clip);
      }
    }
  };

  private handleClipRemoved = ({ clipId }: { clipId: string }) => {
    this.cleanupClipVisuals(clipId);
    this.updateFrame(this.currentTime);
    this.saveHistory();
  };

  private handleClipsRemoved = ({ clipIds }: { clipIds: string[] }) => {
    for (const clipId of clipIds) {
      this.cleanupClipVisuals(clipId);
    }
    this.updateFrame(this.currentTime);
    this.saveHistory();
  };

  private async initPixiApp(): Promise<void> {
    if (this.destroyed) return;

    const canvas = this.opts.canvas || document.createElement("canvas");
    canvas.width = this.opts.width;
    canvas.height = this.opts.height;

    const app = new Application();
    // Use the parent element for resizing if available, otherwise fallback to window
    // This allows the Pixi canvas to fill its container (Player component)
    const resizeTo = canvas.parentElement || window;

    await app.init({
      canvas,
      resizeTo, // Auto-resize to fill the container
      // width/height are derived from resizeTo, so we don't set them explicitly for the renderer
      backgroundColor: this.hexToNumber(this.opts.bgColor),
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: false, // Prevent auto-rendering to avoid race conditions during async updates
    });
    this.pixiApp = app;

    // Trigger initial render to avoid black screen
    app.render();

    // Make stage interactive to handle clicks on empty space
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    // Initialize Artboard (Root Container for Viewport)
    this.artboard = new Container();
    this.artboard.label = "ArtboardRoot";
    app.stage.addChild(this.artboard);

    this.selection.init(app, this.artboard);

    // Create background for Artboard (in clip container)
    this.artboardBg = new Graphics();
    this.artboardBg
      .rect(0, 0, this.opts.width, this.opts.height)
      .fill({ color: 0x000000 });
    this.artboard.addChild(this.artboardBg);

    // Initialize Clip Container (Masked Content)
    this.clipContainer = new Container();
    this.clipContainer.label = "ClipContainer";
    this.artboard.addChild(this.clipContainer);
    // Create mask for Clip Container
    this.artboardMask = new Graphics();
    this.artboardMask
      .rect(0, 0, this.opts.width, this.opts.height)
      .fill({ color: 0xffffff });
    this.clipContainer.addChild(this.artboardMask);
    this.clipContainer.mask = this.artboardMask;

    //effectContainer
    this.clipsEffectContainer = new Container();
    this.clipsEffectContainer.label = "ClipsEffect";
    this.clipsEffectContainer.visible = false;
    this.clipsEffectContainer.zIndex = 1; // Lowest
    this.clipsEffectContainer.sortableChildren = true;
    this.clipContainer.addChild(this.clipsEffectContainer);

    this.clipsNormalContainer = new Container();
    this.clipsNormalContainer.label = "ClipsNormal";
    this.clipsNormalContainer.zIndex = 10; // Highest (above effect)
    this.clipsNormalContainer.sortableChildren = true;
    this.clipContainer.addChild(this.clipsNormalContainer);

    // Initialize Transition helper objects
    this.transFromTexture = RenderTexture.create({
      width: this.opts.width,
      height: this.opts.height,
    });
    this.transToTexture = RenderTexture.create({
      width: this.opts.width,
      height: this.opts.height,
    });
    this.transBgGraphics = new Graphics();
    this.transBgGraphics.rect(0, 0, this.opts.width, this.opts.height).fill({
      color: 0x000000,
      alpha: 0,
    });

    // Enable sorting on parent to respect zIndex
    this.clipContainer.sortableChildren = true;

    // Artboard itself is NOT masked, so children added directly to it (like transformer)
    // will be visible outside the bounds.

    // Initial positioning
    this.updateArtboardLayout();

    // Listen for resize from Pixi renderer (since we used resizeTo)
    // This handles both window resize and container resize automatically
    app.renderer.on("resize", () => {
      this.handleResize();
    });
    // Removed postProcessContainer usage
  }

  /**
   * Get studio options
   */
  public getOptions(): IStudioOpts {
    return this.opts;
  }

  /**
   * Update studio dimensions
   */
  public setSize(width: number, height: number) {
    this.updateDimensions(width, height);
  }

  /**
   * Update the background color of the studio
   */
  public setBgColor(color: string) {
    this.opts.bgColor = color;
    const colorNum = this.hexToNumber(color);

    if (this.pixiApp) {
      this.pixiApp.renderer.background.color = colorNum;
      this.pixiApp.render();
    }

    this.updateFrame(this.currentTime);
  }

  public updateDimensions(width: number, height: number) {
    this.opts.width = width;
    this.opts.height = height;

    if (this.artboardBg) {
      this.artboardBg
        .clear()
        .rect(0, 0, width, height)
        .fill({ color: 0x000000 });
    }
    if (this.artboardMask) {
      this.artboardMask
        .clear()
        .rect(0, 0, width, height)
        .fill({ color: 0xffffff });
    }

    if (this.transFromTexture) {
      this.transFromTexture.resize(width, height);
    }
    if (this.transToTexture) {
      this.transToTexture.resize(width, height);
    }
    if (this.transBgGraphics) {
      this.transBgGraphics
        .clear()
        .rect(0, 0, width, height)
        .fill({ color: 0x000000, alpha: 0 });
    }

    this.updateArtboardLayout();
    this.updateFrame(this.currentTime);
  }

  private handleResize = () => {
    if (this.destroyed || !this.pixiApp || this._isUpdatingLayout) return;
    this.updateArtboardLayout();
  };

  public updateArtboardLayout() {
    if (!this.pixiApp || !this.artboard || this._isUpdatingLayout) return;
    this._isUpdatingLayout = true;

    try {
      // Force PIXI to resize its renderer to match its container (if resizeTo is set)
      this.pixiApp.resize();

      const canvas = this.pixiApp.canvas as HTMLCanvasElement;
      const parent = canvas.parentElement;

      // Use the parent's bounding rect if available, as clientWidth/Height might be 0 during initial mount or reflow
      const containerWidth = parent
        ? parent.getBoundingClientRect().width
        : this.pixiApp.screen.width;
      const containerHeight = parent
        ? parent.getBoundingClientRect().height
        : this.pixiApp.screen.height;

      // Artboard logical size (the "true" size of our project)
      const artboardWidth = this.opts.width;
      const artboardHeight = this.opts.height;

      const spacing = this.opts.spacing || 0;
      const containerWidthWithSpacing = Math.max(
        0,
        containerWidth - spacing * 2,
      );
      const containerHeightWithSpacing = Math.max(
        0,
        containerHeight - spacing * 2,
      );

      // Calculate scale to fit artboard in container with spacing
      const scaleX = containerWidthWithSpacing / artboardWidth;
      const scaleY = containerHeightWithSpacing / artboardHeight;
      const scale = Math.min(scaleX, scaleY);

      // Apply scale and center
      this.artboard.scale.set(scale);

      // Center the artboard within the updated container dimensions
      this.artboard.x = (containerWidth - artboardWidth * scale) / 2;
      this.artboard.y = (containerHeight - artboardHeight * scale) / 2;

      // Ensure we render the layout change if ticker is not running
      this.pixiApp.render();
    } finally {
      this._isUpdatingLayout = false;
    }
  }

  /**
   * Get the canvas element (creates one if not provided)
   */
  getCanvas(): HTMLCanvasElement {
    if (this.opts.canvas) {
      return this.opts.canvas;
    }
    if (this.pixiApp?.canvas) {
      return this.pixiApp.canvas as HTMLCanvasElement;
    }
    throw new Error(
      "Canvas not initialized yet. Wait for initPixiApp to complete.",
    );
  }

  async addTransition(
    transitionKey: string,
    duration: number = 2000000,
    fromClipId?: string | null,
    toClipId?: string | null,
  ): Promise<void> {
    return this.timeline.addTransition(
      transitionKey,
      duration,
      fromClipId,
      toClipId,
    );
  }

  findTrackIdByClipId(clipId: string): string | undefined {
    return this.timeline.findTrackIdByClipId(clipId);
  }

  /**
   * Add a clip (or clips) to the studio
   * @param clipOrClips The clip or array of clips to add
   * @param options Options for addition (trackId, etc.)
   */
  async addClip(
    clipOrClips: IClip | IClip[],
    options?:
      | {
          trackId?: string;
          audioSource?: string | File | Blob;
        }
      | string
      | File
      | Blob,
  ): Promise<void> {
    const clips = Array.isArray(clipOrClips) ? clipOrClips : [clipOrClips];
    clips.forEach((c) => this.clipCache.set(c.id, c));

    this.beginHistoryGroup();
    try {
      const result = await this.timeline.addClip(clipOrClips, options);
      clips.forEach((c) => this.attachClipEvents(c));
      return result;
    } finally {
      this.endHistoryGroup();
    }
  }

  /**
   * Add a new track to the studio
   */
  addTrack(
    track: { name: string; type: string; id?: string },
    index?: number,
  ): StudioTrack {
    return this.timeline.addTrack(track, index);
  }

  async setTracks(tracks: StudioTrack[]): Promise<void> {
    if (this.isRestoring) return;
    // Stale editor sync can pass [] or tracks whose clipIds no longer match
    // timeline.clips (e.g. redo vs Zustand timing). reconcileTracks() would drop
    // all rows and emit track:order-changed with [], wiping the timeline UI.
    const clipIds = new Set(this.timeline.clips.map((c) => c.id));
    if (tracks.length === 0 && clipIds.size > 0) {
      return;
    }
    if (tracks.length > 0 && clipIds.size > 0) {
      const anyKnown = tracks.some((t) =>
        t.clipIds.some((id) => clipIds.has(id)),
      );
      if (!anyKnown) {
        return;
      }
    }
    return this.timeline.setTracks(tracks);
  }


  /**
   * Move a track to a new index
   */
  public async moveTrack(trackId: string, newIndex: number): Promise<void> {
    return this.timeline.moveTrack(trackId, newIndex);
  }

  /**
   * Set the order of tracks by ID
   */
  public async setTrackOrder(trackIds: string[]): Promise<void> {
    return this.timeline.setTrackOrder(trackIds);
  }

  async removeTrack(trackId: string): Promise<void> {
    return this.timeline.removeTrack(trackId);
  }

  /**
   * Get a clip by its ID
   */
  public getClipById(id: string): IClip | undefined {
    return this.timeline.getClipById(id);
  }

  async updateClip(id: string, updates: Partial<IClip>): Promise<void> {
    return this.timeline.updateClip(id, updates);
  }

  /**
   * Centers object vertically and horizontally in the studio
   */
  async centerClip(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;
    if (!clip) return;
    const left = (this.opts.width - clip.width) / 2;
    const top = (this.opts.height - clip.height) / 2;

    if (this.getClipById(clip.id)) {
      return this.updateClip(clip.id, { left, top });
    } else {
      clip.left = left;
      clip.top = top;
    }
  }

  /**
   * Centers object horizontally in the studio
   */
  async centerClipH(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;
    if (!clip) return;
    const left = (this.opts.width - clip.width) / 2;

    if (this.getClipById(clip.id)) {
      return this.updateClip(clip.id, { left });
    } else {
      clip.left = left;
    }
  }

  /**
   * Centers object vertically in the studio
   */
  async centerClipV(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;
    if (!clip) return;
    const top = (this.opts.height - clip.height) / 2;

    if (this.getClipById(clip.id)) {
      return this.updateClip(clip.id, { top });
    } else {
      clip.top = top;
    }
  }

  /**
   * Scale clip to fit within the studio dimensions while maintaining aspect ratio
   */
  async scaleToFit(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;
    if (!clip) return;

    const meta = await clip.ready;
    const { width: origWidth, height: origHeight } = meta;
    if (origWidth === 0 || origHeight === 0) return;

    const scale = Math.min(
      this.opts.width / origWidth,
      this.opts.height / origHeight,
    );
    const width = origWidth * scale;
    const height = origHeight * scale;

    if (this.getClipById(clip.id)) {
      return this.updateClip(clip.id, { width, height });
    } else {
      clip.width = width;
      clip.height = height;
    }
  }

  /**
   * Scale clip to fill the studio dimensions while maintaining aspect ratio
   */
  async scaleToCover(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;
    if (!clip) return;

    const meta = await clip.ready;
    const { width: origWidth, height: origHeight } = meta;
    if (origWidth === 0 || origHeight === 0) return;

    const scale = Math.max(
      this.opts.width / origWidth,
      this.opts.height / origHeight,
    );
    const width = origWidth * scale;
    const height = origHeight * scale;

    if (this.getClipById(clip.id)) {
      return this.updateClip(clip.id, { width, height });
    } else {
      clip.width = width;
      clip.height = height;
    }
  }

  async updateClips(
    updates: { id: string; updates: Partial<IClip> }[],
  ): Promise<void> {
    this.suspendRendering();
    await this.timeline.updateClips(updates);
    this.resumeRendering();
    this.updateFrame(this.currentTime);
  }

  suspendRendering() {
    this.renderingSuspended = true;
  }

  resumeRendering() {
    this.renderingSuspended = false;
  }

  getTracks(): StudioTrack[] {
    return this.timeline.tracks;
  }

  getClip(id: string): IClip | undefined {
    return this.timeline.getClipById(id);
  }

  findClip(id: string): IClip | undefined {
    return this.timeline.getClipById(id);
  }

  /**
   * Setup sprite interactivity for click selection
   * Delegated to SelectionManager
   */
  public setupSpriteInteractivity(clip: IClip): void {
    this.selection.setupSpriteInteractivity(clip);
  }

  /**
   * Setup playback element for a clip (if it supports playback)
   */

  /**
   * Remove a clip from the studio
   */
  async removeClip(clipOrId: IClip | string): Promise<void> {
    const clip =
      typeof clipOrId === "string" ? this.getClipById(clipOrId) : clipOrId;

    if (!clip) {
      console.warn(`[Studio] removeClip: Clip not found`, clipOrId);
      return;
    }

    this.beginHistoryGroup();
    try {
      this.clipCache.set(clip.id, clip);
      return this.timeline.removeClip(clip, {
        permanent: !this.processingHistory,
      });
    } finally {
      this.endHistoryGroup();
    }
  }

  async removeClips(clips: IClip[]): Promise<void> {
    this.beginHistoryGroup();
    try {
      clips.forEach((c) => this.clipCache.set(c.id, c));
      return this.timeline.removeClips(clips, {
        permanent: !this.processingHistory,
      });
    } finally {
      this.endHistoryGroup();
    }
  }

  async removeClipById(clipId: string): Promise<void> {
    const clip = this.timeline.getClipById(clipId);
    if (clip) return this.removeClip(clip);
  }

  async removeClipsById(clipIds: string[]): Promise<void> {
    const clips = clipIds
      .map((id) => this.timeline.getClipById(id))
      .filter(Boolean) as IClip[];
    return this.removeClips(clips);
  }

  /**
   * Delete all currently selected clips
   */
  async deleteSelected(): Promise<void> {
    const selectedClips = this.selection.selectedClips;
    if (selectedClips.size === 0) return;

    this.beginHistoryGroup();
    try {
      await this.removeClips(Array.from(selectedClips));
    } finally {
      this.endHistoryGroup();
    }
  }

  async duplicateSelected(): Promise<void> {
    this.beginHistoryGroup();
    try {
      return await this.timeline.duplicateSelected();
    } finally {
      this.endHistoryGroup();
    }
  }

  async splitSelected(splitTime?: number): Promise<void> {
    this.beginHistoryGroup();
    try {
      return await this.timeline.splitSelected(splitTime);
    } finally {
      this.endHistoryGroup();
    }
  }

  async trimSelected(trimFromSeconds: number): Promise<void> {
    return this.timeline.trimSelected(trimFromSeconds);
  }

  async updateSelected(updates: Partial<IClip>): Promise<void> {
    return this.timeline.updateSelected(updates);
  }

  /**
   * Clear all clips from the studio
   */
  async clear(): Promise<void> {
    await this.timeline.clear();

    // Clear Studio-specific textures
    if (this.transFromTexture) {
      this.transFromTexture.destroy(true);
      this.transFromTexture = null;
    }
    if (this.transToTexture) {
      this.transToTexture.destroy(true);
      this.transToTexture = null;
    }
    if (this.transBgGraphics) {
      this.transBgGraphics.destroy(true);
      this.transBgGraphics = null;
    }
    this.transitionRenderers.forEach((r: any) => r.destroy());
    this.transitionRenderers.clear();
    this.transitionSprites.forEach((s) => s.destroy());
    this.transitionSprites.clear();

    this.emit("reset");
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    return this.transport.play();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.transport.pause();
  }

  /**
   * Stop playback and reset to start
   */
  async stop(): Promise<void> {
    return this.transport.stop();
  }

  /**
   * Seek to a specific time (in microseconds)
   */
  async seek(time: number): Promise<void> {
    return this.transport.seek(time);
  }

  /**
   * Move to the next frame
   */
  async frameNext(): Promise<void> {
    return this.transport.frameNext();
  }

  /**
   * Move to the previous frame
   */
  async framePrev(): Promise<void> {
    return this.transport.framePrev();
  }

  /**
   * Renders the frame at the given time and returns it as a base64-encoded PNG.
   *
   * The artboard is temporarily reset to 1:1 scale during extraction so the
   * output image always matches the project's configured width × height,
   * regardless of the current viewport zoom.
   *
   * @param timeMs Time in milliseconds
   * @returns Base64 data-URL string (e.g. "data:image/png;base64,...")
   *
   * @example
   * await studio.ready;
   * const frame = await studio.renderFrame(1500); // frame at 1.5 s
   * const img = document.createElement('img');
   * img.src = frame;
   */
  public async renderFrame(timeMs: number): Promise<string> {
    await this.ready;
    if (!this.pixiApp || !this.artboard) {
      throw new Error(
        "Studio is not initialized yet. Wait for studio.ready before calling renderFrame().",
      );
    }

    // Convert milliseconds → microseconds (internal timeline unit)
    const timeUs = timeMs * 1000;

    // Render the scene at the requested time
    await this.updateFrame(timeUs);

    // Temporarily reset artboard transform so extract covers exactly the
    // project dimensions (width × height) at pixel-perfect 1:1 resolution.
    const prevScale = this.artboard.scale.clone();
    const prevX = this.artboard.x;
    const prevY = this.artboard.y;

    this.artboard.scale.set(1);
    this.artboard.x = 0;
    this.artboard.y = 0;

    let base64: string;
    try {
      base64 = await (this.pixiApp.renderer.extract as any).base64(
        this.artboard,
        "image/png",
        1,
      );
    } finally {
      // Always restore the original artboard layout
      this.artboard.scale.set(prevScale.x, prevScale.y);
      this.artboard.x = prevX;
      this.artboard.y = prevY;
      this.pixiApp.render();
    }

    return base64;
  }

  /**
   * Get current playback time (in microseconds)
   */
  getCurrentTime(): number {
    return this.transport.currentTime;
  }

  /**
   * Dispatch a StudioAction \u2014 the primary entry point for agentic and external systems.
   *
   * Actions are plain serializable JSON objects describing an edit operation.
   * After execution, emits 'action:dispatched' so external layers (collab, agent, sync)
   * can observe the edit stream.
   *
   * Direct property mutations (clip.opacity = 0.5) continue to work unchanged
   * and go through the existing history path. Only dispatch() calls produce
   * 'action:dispatched' events.
   *
   * @example
   * // Agentic edit
   * await studio.dispatch({ type: 'clip:update', payload: { clipId: 'x', updates: { opacity: 0.5 } } });
   *
   * // Observe all dispatched actions (e.g. in a collab layer)
   * studio.on('action:dispatched', ({ action }) => {
   *   myTransport.send(action);
   * });
   */
  public dispatch(action: StudioAction): Promise<void> {
    return this.dispatcher.dispatch(action);
  }

  /**
   * Get maximum duration (in microseconds)
   */
  getMaxDuration(): number {
    return this.transport.maxDuration;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.transport.isPlaying;
  }

  /**
   * Get currently selected clips
   */
  getSelectedClips(): IClip[] {
    return Array.from(this.selectedClips);
  }

  // renderLoop deleted (moved to PlaybackController)

  private getVideoTexture(video: HTMLVideoElement): Texture {
    let texture = this.videoTextureCache.get(video);
    if (!texture) {
      texture = Texture.from(video);
      this.videoTextureCache.set(video, texture);
    }
    return texture;
  }
  private isPlaybackCapable(clip: IClip): clip is IClip & IPlaybackCapable {
    return (
      "createPlaybackElement" in clip &&
      "play" in clip &&
      "pause" in clip &&
      "seek" in clip &&
      "syncPlayback" in clip &&
      "cleanupPlayback" in clip
    );
  }

  public async updateFrame(timestamp: number): Promise<void> {
    if (this.destroyed || this.pixiApp == null || this.renderingSuspended)
      return;
    this.updateActiveGlobalEffect(timestamp);

    const usedTransitionSprites = new Set<string>();
    const renderedTransitions = new Set<string>();

    // Apply Z-index based on track order
    // Track 0 (Top) should have highest Z-index
    // This ensures correct visual stacking even when clips are re-parented
    const totalTracks = this.tracks.length;
    for (const clip of this.clips) {
      const trackIndex = this.getTrackIndex(clip.id);
      if (trackIndex !== -1) {
        // Track 0 -> Highest Z
        const zIndex = (totalTracks - trackIndex) * 10;
        clip.zIndex = zIndex;

        // Also update renderer root zIndex
        const renderer = this.spriteRenderers.get(clip);
        if (renderer) {
          const root = renderer.getRoot();
          if (root) {
            root.zIndex = zIndex;
          }
        }

        // Also update video sprite zIndex immediately
        const videoSprite = this.videoSprites.get(clip);
        if (videoSprite) {
          videoSprite.zIndex = zIndex;
        }
      }
    }

    // Sort clips by zIndex
    const sortedClips = [...this.clips].sort((a, b) => a.zIndex - b.zIndex);

    // Update each clip
    for (const clip of sortedClips) {
      // Check if clip is before its display time
      if (timestamp < clip.display.from) {
        const inactiveRenderer = this.spriteRenderers.get(clip);
        if (inactiveRenderer != null) {
          await inactiveRenderer.updateFrame(null);
        }

        // Pause playback if it exists (fix for audio leak on split)
        const playbackInfo = this.playbackElements.get(clip);
        if (playbackInfo != null && this.isPlaybackCapable(clip)) {
          clip.pause(playbackInfo.element);
        }
        continue;
      }

      // Check if clip is after its display time (display.to)
      if (clip.display.to > 0 && timestamp > clip.display.to) {
        const inactiveRenderer = this.spriteRenderers.get(clip);
        if (inactiveRenderer != null) {
          await inactiveRenderer.updateFrame(null);
        }

        // Pause playback if it exists (fix for audio leak on split)
        const playbackInfo = this.playbackElements.get(clip);
        if (playbackInfo != null && this.isPlaybackCapable(clip)) {
          clip.pause(playbackInfo.element);
        }
        continue;
      }

      const relativeTime = timestamp - clip.display.from;
      const spriteTime = relativeTime * clip.playbackRate;

      // Update animation
      clip.animate(spriteTime);

      // Check if clip has exceeded its duration (different from display.to)
      const meta = await clip.ready;
      const clipDuration = clip.duration || meta.duration;
      if (clipDuration > 0 && relativeTime > clipDuration) {
        const inactiveRenderer = this.spriteRenderers.get(clip);
        if (inactiveRenderer != null) {
          await inactiveRenderer.updateFrame(null);
        }

        // Pause playback if it exists (fix for audio leak on split)
        const playbackInfo = this.playbackElements.get(clip);
        if (playbackInfo != null && this.isPlaybackCapable(clip)) {
          clip.pause(playbackInfo.element);
        }
        continue;
      }

      // Handle playback elements (VideoClip and AudioClip)
      const playbackInfo = this.playbackElements.get(clip);

      const isTransitionable = clip.type === "Video" || clip.type === "Image";
      const transitionStartTime = clip.transition ? clip.transition.start! : 0;
      const transitionEndTime = clip.transition ? clip.transition.end! : 0;
      const inTransition =
        isTransitionable &&
        clip.transition &&
        timestamp >= transitionStartTime &&
        timestamp < transitionEndTime;

      if (playbackInfo != null && this.isPlaybackCapable(clip)) {
        const playbackRelativeTime = relativeTime / 1e6; // Convert to seconds

        // Sync playback using clip method
        clip.syncPlayback(
          playbackInfo.element,
          this.isPlaying,
          playbackRelativeTime,
        );

        // For VideoClip, handle sprite visibility
        if (clip.type === "Video" && this.isPlaybackCapable(clip)) {
          const videoSprite = this.videoSprites.get(clip);
          if (videoSprite != null) {
            const clipDurationSeconds = clip.meta.duration / 1e6;
            const hasCustomRenderer = this.spriteRenderers.has(clip);

            // If we also have a PixiSpriteRenderer for this clip (e.g. chromakey),
            // treat the HTMLVideoElement as audio-only and don't show its sprite.
            // Otherwise, use the video sprite for rendering.
            if (!hasCustomRenderer) {
              videoSprite.visible =
                !inTransition &&
                playbackRelativeTime >= 0 &&
                playbackRelativeTime < clipDurationSeconds;
              if (videoSprite.visible) {
                updateSpriteTransform(clip, videoSprite);
              }

              // No custom renderer, so we can skip further processing for this clip
              // unless we are in transition (in which case we need to fall through to the transition block)
              if (!inTransition) {
                continue;
              }
            } else {
              videoSprite.visible = false;
            }
          }
        } else {
          // Audio-only clip, skip video rendering - safe to continue as they don't have transitions
          continue;
        }
      }

      if (inTransition) {
        const fromClipId = clip?.transition?.fromClipId;
        const toClipId = clip?.transition?.toClipId;
        const transKey = `${fromClipId}_${toClipId}`;

        // Ensure we only render this transition ONCE per frame
        if (renderedTransitions.has(transKey)) {
          // Hide this clip's own renderer/sprite if it's the one currently being updated
          const renderer = this.spriteRenderers.get(clip);
          if (renderer?.getRoot()) renderer.getRoot()!.visible = false;
          const videoSprite = this.videoSprites.get(clip);
          if (videoSprite) videoSprite.visible = false;
          continue;
        }

        renderedTransitions.add(transKey);

        // Inicialización lazy de texturas
        if (!this.transFromTexture) {
          this.transFromTexture = RenderTexture.create({
            width: this.opts.width,
            height: this.opts.height,
          });
        }
        if (!this.transToTexture) {
          this.transToTexture = RenderTexture.create({
            width: this.opts.width,
            height: this.opts.height,
          });
        }
        if (!this.transBgGraphics) {
          this.transBgGraphics = new Graphics();
          this.transBgGraphics
            .rect(0, 0, this.opts.width, this.opts.height)
            .fill({ color: 0x000000, alpha: 0 }); // fondo default
        }

        const fromClip = fromClipId ? this.getClipById(fromClipId) : null;
        const toClip = toClipId ? this.getClipById(toClipId) : null;

        let fromFrame: ImageBitmap | Texture | null = null;
        let toFrame: ImageBitmap | Texture | null = null;

        // Captura frame estático "from"
        if (fromClip) {
          const fromRelativeTime = Math.max(
            0,
            timestamp - fromClip.display.from,
          );

          const { video } = await fromClip.getFrame(fromRelativeTime);

          if (video instanceof HTMLVideoElement) {
            fromFrame = this.getVideoTexture(video);
          } else {
            fromFrame = video;
          }

          if (fromFrame) {
            this.lastFromFrame = fromFrame;
          }
        }

        // Captura frame estático "to"
        if (toClip) {
          const toRelativeTime = Math.max(0, timestamp - toClip.display.from);

          const { video } = await toClip.getFrame(toRelativeTime);

          if (video instanceof HTMLVideoElement) {
            toFrame = this.getVideoTexture(video);
          } else {
            toFrame = video;
          }

          if (toFrame) {
            this.lastToFrame = toFrame;
          }
        }

        if (!fromFrame) fromFrame = this.lastFromFrame;
        if (!toFrame) toFrame = this.lastToFrame;
        if (!fromFrame || !toFrame) {
          continue;
        }
        if (
          fromFrame &&
          toFrame &&
          this.pixiApp &&
          this.transFromTexture &&
          this.transToTexture
        ) {
          const progress =
            (timestamp - transitionStartTime) / clip?.transition?.duration!;

          // Renderizar "from" frame en la textura
          if (fromClip && fromFrame) {
            this.renderClipToTransitionTexture(
              fromClip,
              fromFrame,
              this.transFromTexture,
            );
          }
          // Renderizar "to" frame en la textura
          if (toClip && toFrame) {
            this.renderClipToTransitionTexture(
              toClip,
              toFrame,
              this.transToTexture,
            );
          }

          // Crear o reutilizar renderer de transición
          // Use shared transKey for the cache!
          let transRenderer = this.transitionRenderers.get(transKey);
          if (!transRenderer) {
            try {
              transRenderer = makeTransition({
                name: clip?.transition?.name as any,
                renderer: this.pixiApp.renderer,
              });
              this.transitionRenderers.set(transKey, transRenderer);
            } catch (err) {
              console.error(
                `[Studio] Failed to create transition renderer:`,
                err,
              );
            }
          }

          if (transRenderer) {
            const transTexture = transRenderer.render({
              width: this.opts.width,
              height: this.opts.height,
              from: this.transFromTexture,
              to: this.transToTexture,
              progress,
            });

            // Mostrar transición
            let transSprite = this.transitionSprites.get(clip.id);
            if (!transSprite) {
              transSprite = new Sprite();
              transSprite.label = `TransitionSprite_${clip.id}`;
              this.transitionSprites.set(clip.id, transSprite);
              if (this.clipsNormalContainer) {
                this.clipsNormalContainer.addChild(transSprite);
              }
            }

            transSprite.texture = transTexture;
            transSprite.visible = true;
            transSprite.x = 0;
            transSprite.y = 0;
            transSprite.width = this.opts.width;
            transSprite.height = this.opts.height;
            transSprite.anchor.set(0, 0);
            transSprite.zIndex = clip.zIndex;
            usedTransitionSprites.add(clip.id);

            // Ocultar clips reales durante la transición

            const renderer = this.spriteRenderers.get(clip);
            if (renderer?.getRoot()) renderer.getRoot()!.visible = false;
            const videoSprite = this.videoSprites.get(clip);
            if (videoSprite) videoSprite.visible = false;

            if (fromClip) {
              const prevRenderer = this.spriteRenderers.get(fromClip);
              if (prevRenderer?.getRoot())
                prevRenderer.getRoot()!.visible = false;
              const prevVideoSprite = this.videoSprites.get(fromClip);
              if (prevVideoSprite) prevVideoSprite.visible = false;
            }

            if (toClip) {
              const nextRenderer = this.spriteRenderers.get(toClip);
              if (nextRenderer?.getRoot())
                nextRenderer.getRoot()!.visible = false;
              const nextVideoSprite = this.videoSprites.get(toClip);
              if (nextVideoSprite) nextVideoSprite.visible = false;
            }

            continue;
          }
        }
      }

      // Hide transition sprite if not active for any clip in this loop
      // (Actually we should probably reset it at start of updateFrame)

      // Handle clips rendered via PixiSpriteRenderer (ImageClip, MP4 with
      // tickInterceptor/chromakey, etc)
      const renderer = this.spriteRenderers.get(clip);
      if (renderer != null) {
        // Skip transform updates if this is the selected clip being transformed
        // The transformer directly manipulates the sprite, so we don't want to overwrite it
        const isSelected = this.selectedClips.has(clip);

        // Optimized path: Check if clip has a Texture (e.g., Image.fromUrl)
        // Skip Text and Caption clips here as they have async getTexture() and are handled below
        if (
          clip.type !== "Text" &&
          clip.type !== "Caption" &&
          typeof (clip as any).getTexture === "function" &&
          (clip as Image).getTexture() != null
        ) {
          const texture = (clip as Image).getTexture();
          if (texture != null) {
            // Use Texture directly for optimized rendering
            await renderer.updateFrame(texture);
            // Only update transforms if not currently being transformed
            if (!isSelected) {
              renderer.updateTransforms();
            }
            if (this.opts.interactivity) {
              this.selection.setupSpriteInteractivity(clip);
            }
            continue;
          }
        }

        // Optimized path for Text: Use Texture directly
        if (clip.type === "Text") {
          const textClip = clip as Text;
          if (
            this.pixiApp?.renderer &&
            typeof textClip.setRenderer === "function"
          ) {
            textClip.setRenderer(this.pixiApp.renderer);
          }
          const texture = await textClip.getTexture();

          if (texture != null) {
            // Use Texture directly for optimized rendering
            await renderer.updateFrame(texture);
            // Only update transforms if not currently being transformed
            if (!isSelected) {
              renderer.updateTransforms();
            }
            if (this.opts.interactivity) {
              this.selection.setupSpriteInteractivity(clip);
            }
            continue;
          }
        }

        // Optimized path for Caption: Use Texture directly
        if (clip.type === "Caption") {
          // Update caption highlighting based on current time before rendering
          (clip as Caption).updateState(relativeTime);
          const captionClip = clip as Caption;
          if (
            this.pixiApp?.renderer &&
            typeof captionClip.setRenderer === "function"
          ) {
            captionClip.setRenderer(this.pixiApp.renderer);
          }
          const texture = await captionClip.getTexture();
          if (texture != null) {
            // Use Texture directly for optimized rendering
            await renderer.updateFrame(texture);
            // Only update transforms if not currently being transformed
            if (!isSelected) {
              renderer.updateTransforms();
            }
            if (this.opts.interactivity) {
              this.selection.setupSpriteInteractivity(clip);
            }
            continue;
          }
        }

        // Traditional path: Get frame data
        const { video: frameVideo } = await clip.getFrame(relativeTime);

        // Update renderer with new frame
        // PixiSpriteRenderer will handle sprite creation and stage addition on first frame
        // Always call updateFrame - it will handle visibility internally
        // This ensures smooth updates without blinking
        await renderer.updateFrame(frameVideo);

        // Update transforms after frame update
        // Only update transforms if not currently being transformed
        if (!isSelected) {
          renderer.updateTransforms();
        }

        if (this.opts.interactivity) {
          this.selection.setupSpriteInteractivity(clip);
        }

        // Note: done flag is handled by duration check above
      }
    }

    // Render global effects sequence
    if (
      this.activeGlobalEffects.length > 0 &&
      this.clipsNormalContainer &&
      this.clipsEffectContainer
    ) {
      // 1. Reset all clips to Normal container first
      for (const c of this.clips) {
        this.moveClipToEffectContainer(c, false);
      }

      this.clipsNormalContainer.visible = true;
      await this.applyGlobalEffects(timestamp);
    } else {
      // No active global effects
      if (this.clipsNormalContainer) {
        for (const c of this.clips) {
          this.moveClipToEffectContainer(c, false);
        }

        this.clipsNormalContainer.visible = true;
        // Cleanup effect sprite
        if (this.currentGlobalEffectSprite) {
          if (this.currentGlobalEffectSprite.parent) {
            this.currentGlobalEffectSprite.parent.removeChild(
              this.currentGlobalEffectSprite,
            );
          }
          this.currentGlobalEffectSprite.destroy();
          this.currentGlobalEffectSprite = null;
        }
      }
    }

    // Finally, hide any transition sprites that were NOT used this frame
    for (const [clipId, sprite] of this.transitionSprites.entries()) {
      if (!usedTransitionSprites.has(clipId)) {
        sprite.visible = false;
      }
    }

    // Render the scene
    if (this.pixiApp != null) {
      this.pixiApp.render();
    }
  }

  /**
   * Apply global effect to the current scene
   */

  moveClipToEffectContainer(clip: IClip, toEffect: boolean = true): void {
    if (!this.clipsNormalContainer || !this.clipsEffectContainer) return;

    const target = toEffect
      ? this.clipsEffectContainer
      : this.clipsNormalContainer;

    // 1. Move the regular clip sprite
    const renderer = this.spriteRenderers.get(clip);
    if (renderer) {
      const root = renderer.getRoot();
      if (root && root.parent !== target) {
        try {
          if (root.parent && (root.parent as Container).removeChild) {
            (root.parent as Container).removeChild(root);
          }
        } catch (err) {
          console.warn(
            "moveClipToEffectContainer: could not remove root from parent",
            err,
          );
        }
        target.addChild(root);
      }
    }

    // 2. Move the transition sprite (if exists)
    const transSprite = this.transitionSprites.get(clip.id);
    if (transSprite && transSprite.parent !== target) {
      try {
        if (
          transSprite.parent &&
          (transSprite.parent as Container).removeChild
        ) {
          (transSprite.parent as Container).removeChild(transSprite);
        }
      } catch (err) {
        console.warn(
          "moveClipToEffectContainer: could not remove transSprite from parent",
          err,
        );
      }
      target.addChild(transSprite);
    }
  }

  applyGlobalEffect(
    key: EffectKey,
    options: {
      startTime: number;
      duration?: number;
      id?: string;
    },
    clips: IClip[],
  ): string {
    const id =
      options.id ||
      `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const effect = {
      id,
      key,
      startTime: options.startTime,
      duration: options.duration ?? 1_000_000,
    };
    for (const clip of clips) {
      if (clip instanceof Image) {
        clip.addEffect(effect);
      }
      if (clip instanceof Video) {
        clip.addEffect(effect);
      }
      if (clip instanceof Text) {
        clip.addEffect(effect);
      }
      if (clip instanceof Caption) {
        clip.addEffect(effect);
      }
    }
    this.globalEffects.set(id, effect);

    return id;
  }

  getTrackIndex(clipId: string): number {
    return this.tracks.findIndex((t) => t.clipIds.includes(clipId));
  }

  /**
   * Get the frame from the previous clip on the same track for transition
   */
  public async getTransitionFromFrame(
    clip: IClip,
    timestamp: number,
  ): Promise<ImageBitmap | null | Texture> {
    let prevClip: IClip | null = null;

    // 1. Try explicit pairing first
    if (clip.transition?.prevClipId) {
      prevClip =
        this.clips.find((c) => c.id === clip.transition!.prevClipId) || null;
    }

    // 2. Fallback to track heuristic
    if (!prevClip) {
      prevClip = this.getPreviousClipOnTrack(clip);
    }
    if (!prevClip) return null;

    // Calculate relative time for the "from" clip
    // If clips overlap, we use the current absolute timestamp
    // If they are back-to-back, we clamp to the end of the previous clip
    const prevClipDuration = prevClip.duration > 0 ? prevClip.duration : 0;
    const prevRelativeTime = Math.max(
      0,
      Math.min(timestamp - prevClip.display.from, prevClipDuration),
    );

    const { video } = await prevClip.getFrame(prevRelativeTime);
    return video;
  }

  private getPreviousClipOnTrack(clip: IClip): IClip | null {
    const trackIndex = this.getTrackIndex(clip.id);
    if (trackIndex === -1) return null;

    return (
      this.clips
        .filter(
          (c) =>
            c.id !== clip.id &&
            this.getTrackIndex(c.id) === trackIndex &&
            c.display.from < clip.display.from &&
            (c instanceof Video || c instanceof Image),
        )
        .sort((a, b) => b.display.to - a.display.to)[0] || null
    );
  }

  /**
   * Renders a clip frame onto a transition texture with red background
   */
  private renderClipToTransitionTexture(
    clip: IClip,
    frame: ImageBitmap | Texture,
    target: RenderTexture,
  ): void {
    if (!this.pixiApp) return;

    const style = (clip as any).style || {};
    const { renderTransform } = clip;
    const isMirrored = (renderTransform?.mirror ?? 0) > 0.5;

    const tex = frame instanceof Texture ? frame : Texture.from(frame);

    // Apply transforms similar to PixiSpriteRenderer.applySpriteTransforms
    const xOffset = renderTransform?.x ?? 0;
    const yOffset = renderTransform?.y ?? 0;
    const angleOffset = renderTransform?.angle ?? 0;
    const scaleMultiplier = renderTransform?.scale ?? 1;
    const opacityMultiplier = renderTransform?.opacity ?? 1;
    const blurOffset = renderTransform?.blur ?? 0;
    const brightnessMultiplier = renderTransform?.brightness ?? 1;

    const textureWidth = tex.width || 1;
    const textureHeight = tex.height || 1;

    const isCaption = (clip as any).type === "Caption";

    const baseScaleX =
      !isCaption && clip.width && clip.width !== 0
        ? Math.abs(clip.width) / textureWidth
        : 1;
    const baseScaleY =
      !isCaption && clip.height && clip.height !== 0
        ? Math.abs(clip.height) / textureHeight
        : 1;

    // Create a root container that holds everything
    const rootContainer = new Container();
    rootContainer.x = clip.center.x + xOffset;
    rootContainer.y = clip.center.y + yOffset;
    rootContainer.rotation =
      ((clip.flip == null ? 1 : -1) * ((clip.angle + angleOffset) * Math.PI)) /
      180;
    rootContainer.alpha = clip.opacity * opacityMultiplier;

    // Create the main sprite
    const tempSprite = new Sprite(tex);
    tempSprite.anchor.set(0.5, 0.5);

    let mirrorSprites: Sprite[] = [];

    if (isMirrored) {
      // True reflection: original at normal position, mirrors on all sides
      const sX = baseScaleX * scaleMultiplier;
      const sY = baseScaleY * scaleMultiplier;
      const scaledW = textureWidth * sX;
      const scaledH = textureHeight * sY;

      // Original sprite at normal position
      tempSprite.position.set(0, 0);
      tempSprite.scale.set(sX, sY);

      // Mirror layout: [dx, dy, scaleX, scaleY]
      const mirrors: [number, number, number, number][] = [
        [scaledW, 0, -sX, sY], // right
        [-scaledW, 0, -sX, sY], // left
        [0, scaledH, sX, -sY], // bottom
        [0, -scaledH, sX, -sY], // top
        [scaledW, scaledH, -sX, -sY], // bottom-right
        [-scaledW, scaledH, -sX, -sY], // bottom-left
        [scaledW, -scaledH, -sX, -sY], // top-right
        [-scaledW, -scaledH, -sX, -sY], // top-left
      ];

      for (const [dx, dy, sx, sy] of mirrors) {
        const ms = new Sprite(tex);
        ms.anchor.set(0.5, 0.5);
        ms.position.set(dx, dy);
        ms.scale.set(sx, sy);
        mirrorSprites.push(ms);
      }

      // Apply flip
      if (clip.flip === "horizontal") {
        tempSprite.scale.x = -sX;
        for (let i = 0; i < 8; i++) {
          mirrorSprites[i].scale.x = -mirrors[i][2];
        }
      } else if (clip.flip === "vertical") {
        tempSprite.scale.y = -sY;
        for (let i = 0; i < 8; i++) {
          mirrorSprites[i].scale.y = -mirrors[i][3];
        }
      }

      rootContainer.addChild(tempSprite);
      for (const ms of mirrorSprites) {
        rootContainer.addChild(ms);
      }
    } else {
      // Standard single sprite
      if (clip.flip === "horizontal") {
        tempSprite.scale.x = -baseScaleX * scaleMultiplier;
        tempSprite.scale.y = baseScaleY * scaleMultiplier;
      } else if (clip.flip === "vertical") {
        tempSprite.scale.x = baseScaleX * scaleMultiplier;
        tempSprite.scale.y = -baseScaleY * scaleMultiplier;
      } else {
        tempSprite.scale.x = baseScaleX * scaleMultiplier;
        tempSprite.scale.y = baseScaleY * scaleMultiplier;
      }
      rootContainer.addChild(tempSprite);
    }

    // Apply Filters
    const filters: any[] = [];
    if (blurOffset > 0) {
      const blurFilter = new BlurFilter();
      blurFilter.strength = blurOffset;
      blurFilter.quality = 4;
      (blurFilter as any).repeatEdgePixels = true;
      filters.push(blurFilter);
    }

    const hasClipColorAdjustment = hasColorAdjustment(
      (clip as any).colorAdjustment,
    );
    if (brightnessMultiplier !== 1 || hasClipColorAdjustment) {
      const brightnessFilter = new ColorMatrixFilter();
      applyColorAdjustmentToMatrix(
        brightnessFilter,
        (clip as any).colorAdjustment,
        brightnessMultiplier,
      );
      filters.push(brightnessFilter);
    }

    const activeSelectiveHslList = getAllSelectiveHsl(
      (clip as any).colorAdjustment,
    );
    for (let i = 0; i < activeSelectiveHslList.length; i++) {
      const activeSelectiveHsl = activeSelectiveHslList[i];
      const hslUniforms = new UniformGroup({
        uTargetColor: { value: [1, 1, 0], type: "vec3<f32>" },
        uHueShift: { value: activeSelectiveHsl.hue, type: "f32" },
        uSatShift: { value: activeSelectiveHsl.saturation / 100, type: "f32" },
        uLightShift: { value: activeSelectiveHsl.lightness / 100, type: "f32" },
        uTolerance: { value: 0.22, type: "f32" },
        uSoftness: { value: 0.12, type: "f32" },
      });
      const rgb = hexToRgb(activeSelectiveHsl.targetColor);
      if (rgb) {
        hslUniforms.uniforms.uTargetColor[0] = rgb.r / 255;
        hslUniforms.uniforms.uTargetColor[1] = rgb.g / 255;
        hslUniforms.uniforms.uTargetColor[2] = rgb.b / 255;
      }
      const selectiveHslFilter = new Filter({
        glProgram: new GlProgram({
          vertex,
          fragment: SELECTIVE_HSL_FRAGMENT,
          name: `SelectiveHslShader_${i}`,
        }),
        resources: { hslUniforms },
      });
      filters.push(selectiveHslFilter);
    }
    rootContainer.filters = filters;

    // Apply Styles (Border Radius, Stroke, Shadow)
    const targetWidth = Math.abs(clip.width) || textureWidth;
    const targetHeight = Math.abs(clip.height) || textureHeight;
    const borderRadius = style.borderRadius || 0;

    let maskGraphics: Graphics | null = null;
    if (borderRadius > 0) {
      maskGraphics = new Graphics();
      const r = Math.min(borderRadius, targetWidth / 2, targetHeight / 2);
      maskGraphics.roundRect(
        -targetWidth / 2,
        -targetHeight / 2,
        targetWidth,
        targetHeight,
        r,
      );
      maskGraphics.fill({ color: 0xffffff, alpha: 1 });
      rootContainer.addChild(maskGraphics);
      // In this transition path, we mask the rootContainer to affect mirrors too if they existed
      rootContainer.mask = maskGraphics;
    }

    const stroke = style.stroke;
    let strokeGraphics: Graphics | null = null;
    if (stroke && stroke.width > 0) {
      strokeGraphics = new Graphics();
      const color = parseColor(stroke.color) ?? 0xffffff;
      strokeGraphics.setStrokeStyle({
        width: stroke.width,
        color: color,
        alignment: 0.5, // Standard centered alignment
      });

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, targetWidth / 2, targetHeight / 2);
        strokeGraphics.roundRect(
          -targetWidth / 2,
          -targetHeight / 2,
          targetWidth,
          targetHeight,
          r,
        );
      } else {
        strokeGraphics.rect(
          -targetWidth / 2,
          -targetHeight / 2,
          targetWidth,
          targetHeight,
        );
      }
      strokeGraphics.stroke();
      rootContainer.addChild(strokeGraphics);
    }

    const shadow = style.dropShadow;
    let shadowGraphics: Graphics | null = null;
    if (shadow && (shadow.blur > 0 || shadow.distance > 0)) {
      shadowGraphics = new Graphics();
      const color = parseColor(shadow.color) ?? 0x000000;
      const alpha = shadow.alpha ?? 0.5;
      const distance = shadow.distance ?? 0;
      const angle = shadow.angle ?? 0;

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      if (borderRadius > 0) {
        const r = Math.min(borderRadius, targetWidth / 2, targetHeight / 2);
        shadowGraphics.roundRect(
          -targetWidth / 2 + dx,
          -targetHeight / 2 + dy,
          targetWidth,
          targetHeight,
          r,
        );
      } else {
        shadowGraphics.rect(
          -targetWidth / 2 + dx,
          -targetHeight / 2 + dy,
          targetWidth,
          targetHeight,
        );
      }
      shadowGraphics.fill({ color, alpha });
      // Insert shadow at the bottom of the rootContainer
      rootContainer.addChildAt(shadowGraphics, 0);
    }

    // Render onto target and CLEAR the texture first
    this.pixiApp.renderer.render({
      container: rootContainer,
      target: target,
      clear: true,
    });

    // Clean up temporary objects
    if (!(frame instanceof Texture)) {
      tempSprite.texture.destroy(true);
    }
    if (maskGraphics) maskGraphics.destroy();
    if (strokeGraphics) strokeGraphics.destroy();
    if (shadowGraphics) shadowGraphics.destroy();
    for (const ms of mirrorSprites) ms.destroy();
    tempSprite.destroy();
    rootContainer.destroy();
  }

  removeGlobalEffect(id: string): void {
    this.globalEffects.delete(id);
  }

  clearGlobalEffects(): void {
    this.globalEffects.clear();
  }

  private updateActiveGlobalEffect(currentTime: number): void {
    const active: ActiveGlobalEffect[] = [];

    // 1. Check for Effect instances (Adjustment Layer)
    for (const clip of this.clips) {
      if (
        clip instanceof Effect &&
        currentTime >= clip.display.from &&
        (clip.display.to === 0 || currentTime < clip.display.to)
      ) {
        active.push({
          id: clip.id,
          key: (clip as Effect).effect.key,
          startTime: clip.display.from,
          duration:
            clip.duration > 0
              ? clip.duration
              : clip.display.to - clip.display.from,
          trackIndex: this.getTrackIndex(clip.id),
          values: (clip as Effect).effect.values,
        });
      }
    }

    // 2. Add legacy globalEffects map if they match the time
    for (const effect of this.globalEffects.values()) {
      const endTime = effect.startTime + effect.duration;
      if (currentTime >= effect.startTime && currentTime < endTime) {
        active.push({
          id: effect.id,
          key: effect.key,
          startTime: effect.startTime,
          duration: effect.duration,
          trackIndex: -1, // Global effects apply to everything
        });
      }
    }

    // Sort by track index descending (bottom tracks first)
    // Legacy global effects (trackIndex: -1) go first as they are "below" everything
    this.activeGlobalEffects = active.sort(
      (a, b) => (b.trackIndex ?? -1) - (a.trackIndex ?? -1),
    );
  }

  private async applyGlobalEffects(timestamp: number): Promise<void> {
    // 1. Cleanup previous final effect sprite
    if (this.currentGlobalEffectSprite) {
      if (this.currentGlobalEffectSprite.parent) {
        this.currentGlobalEffectSprite.parent.removeChild(
          this.currentGlobalEffectSprite,
        );
      }
      this.currentGlobalEffectSprite.destroy();
      this.currentGlobalEffectSprite = null;
    }

    if (
      this.activeGlobalEffects.length === 0 ||
      !this.pixiApp ||
      !this.clipContainer ||
      !this.clipsNormalContainer ||
      !this.clipsEffectContainer
    )
      return;

    const width = this.opts.width;
    const height = this.opts.height;
    let lastResultTexture: Texture | null = null;
    let processedClips = new Set<string>();

    // Intermediate textures for chain
    const intermediateTextures: RenderTexture[] = [];

    for (const effect of this.activeGlobalEffects) {
      const { key, startTime, duration, trackIndex, values } = effect;
      const elapsed = timestamp - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      if (progress < 0 || progress >= 1) continue;

      // Ensure effect container is ready for this pass
      this.clipsEffectContainer.visible = true;
      this.clipsEffectContainer.removeChildren();

      // If we have a previous result, add it bottom-most in the container
      if (lastResultTexture) {
        const prevSprite = new Sprite(lastResultTexture);
        prevSprite.label = "PrevEffectResult";
        prevSprite.width = width;
        prevSprite.height = height;
        this.clipsEffectContainer.addChild(prevSprite);
      }

      // Add clips that belong to this effect (below it)
      const effectTrackIndex = trackIndex ?? -1;
      for (const c of this.clips) {
        if (processedClips.has(c.id)) continue;

        const clipTrackIndex = this.getTrackIndex(c.id);

        // Check if clip is an adjustment layer itself
        const isEffectClip = c instanceof Effect;

        // Clip should be moved if it's below the current effect track
        // OR if it's a legacy effect (trackIndex -1) and we are processing it (but legacy usually apply to all)
        if (
          !isEffectClip &&
          (effectTrackIndex === -1 || clipTrackIndex > effectTrackIndex)
        ) {
          this.moveClipToEffectContainer(c, true);
          processedClips.add(c.id);
        }
      }

      // Apply effect filter
      let effectFilter = this.effectFilters.get(key);
      if (!effectFilter) {
        try {
          effectFilter = await makeEffect({
            name: key as any,
            renderer: this.pixiApp.renderer,
            values,
          });
          if (effectFilter) {
            this.effectFilters.set(key, effectFilter);
          } else {
            continue;
          }
        } catch (err) {
          console.error(err);
          continue;
        }
      }

      const inputTexture = RenderTexture.create({ width, height });
      intermediateTextures.push(inputTexture);

      this.pixiApp.renderer.render({
        container: this.clipsEffectContainer,
        target: inputTexture,
        clear: true,
      });

      const resultTexture = effectFilter.render({
        canvasTexture: inputTexture,
        progress,
        width,
        height,
        values,
      });

      // Hide input clips from this container after rendering to texture
      this.clipsEffectContainer.visible = false;

      lastResultTexture = resultTexture;
    }

    // Final composition
    if (lastResultTexture) {
      const effectSprite = new Sprite(lastResultTexture);
      effectSprite.x = 0;
      effectSprite.y = 0;
      effectSprite.width = width;
      effectSprite.height = height;
      effectSprite.scale.set(1);
      effectSprite.zIndex = 5;

      this.clipContainer.addChild(effectSprite);
      this.currentGlobalEffectSprite = effectSprite;
    }

    // Cleanup input textures (but resultTexture might be used as input for NEXT frame or pass)
    // Actually, resultTexture from makeEffect is usually managed by the filter or temporary for this frame.
    for (const tex of intermediateTextures) {
      tex.destroy(true);
    }
  }

  /**
   * Destroy the studio and clean up resources
   */
  destroy(): void {
    if (this.destroyed) return;
    window.removeEventListener("resize", this.handleResize);
    this.destroyed = true;
    this.stop();
    this.clear();
    this.transitionRenderers.clear();

    if (this.transFromTexture) {
      this.transFromTexture.destroy(true);
      this.transFromTexture = null;
    }
    if (this.transToTexture) {
      this.transToTexture.destroy(true);
      this.transToTexture = null;
    }
    if (this.transBgGraphics) {
      this.transBgGraphics.destroy(true);
      this.transBgGraphics = null;
    }
    for (const sprite of this.transitionSprites.values()) {
      sprite.destroy();
    }
    this.transitionSprites.clear();

    if (this.pixiApp) {
      this.pixiApp.destroy(true, {
        children: true,
        texture: true,
      });
      this.pixiApp = null;
    }
  }

  /**
   * Select a clip and show transform controls
   * Delegated to InteractionManager
   */
  selectClip(clip: IClip, addToSelection: boolean = false): void {
    this.selection.selectClip(clip, addToSelection);
  }

  // createTransformer deleted (moved to manager)

  /**
   * Set the selection to a specific list of clips
   */
  public setSelection(clips: IClip[]): void {
    this.selection.setSelection(clips);
  }

  /**
   * Select clips by their IDs
   */
  selectClipsByIds(ids: string[]): void {
    this.selection.selectClipsByIds(ids);
  }

  /**
   * Deselect the current clip and hide transform controls
   */
  deselectClip(): void {
    this.selection.deselectClip();
  }

  /**
   * Toggle lock state of a clip
   */
  public async lockClip(clipId: string, locked: boolean): Promise<void> {
    const clip = this.timeline.getClipById(clipId);
    if (!clip) return;

    await this.timeline.updateClip(clipId, { locked });
    this.emit("clip:lock-changed", { clip, locked });

    // If the clip is currently selected, recreate the transformer so it
    // shows/hides handles according to the new lock state without deselecting.
    if (this.selection.selectedClips.has(clip)) {
      this.selection.recreateTransformer();
    }

    await this.updateFrame(this.currentTime);
  }

  /**
   * Export current studio state to JSON
   * @param sourceUrlMap Optional map of clips to their source URLs (required for proper serialization)
   */
  exportToJSON(): ProjectJSON {
    return this.timeline.exportToJSON();
  }

  async loadFromJSON(json: ProjectJSON): Promise<void> {
    return this.timeline.loadFromJSON(json);
  }

  // End of class Studio (removed legacy commented out code)
}
