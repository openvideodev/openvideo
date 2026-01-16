import { BaseTimelineClip, BaseClipProps } from './base';
import { Control, Pattern } from 'fabric';
import { createTrimControls } from '../controls';
import { editorFont } from '@/components/editor/constants';
import { useStudioStore } from '@/stores/studio-store';
import { Video as VideoClip } from '@designcombo/video';
import ThumbnailCache from '../utils/thumbnail-cache';
import {
  Filmstrip,
  EMPTY_FILMSTRIP,
  calculateThumbnailSegmentLayout,
  calculateOffscreenSegments,
  timeMsToUnits,
  unitsToTimeMs,
} from '../utils/filmstrip';

const MICROSECONDS_IN_SECOND = 1_000_000;
const DEFAULT_THUMBNAIL_HEIGHT = 52;
const DEFAULT_ASPECT_RATIO = 16 / 9;
const FALLBACK_COLOR = '#1e1b4b'; // Deep Indigo
const THUMBNAIL_STEP_US = 1_000_000; // 1fps

export class Video extends BaseTimelineClip {
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTrimControls() };
  }

  public studioClipId?: string;
  public duration: number = 0;
  public sourceDuration: number = 0;
  public playbackRate: number = 1;
  public trim: { from: number; to: number } = { from: 0, to: 0 };

  private _aspectRatio: number = DEFAULT_ASPECT_RATIO;
  private _scrollLeft: number = 0;
  private _thumbnailsPerSegment: number = 0;
  private _segmentSize: number = 0;

  private _thumbnailWidth: number = 0;
  private _thumbnailHeight: number = DEFAULT_THUMBNAIL_HEIGHT;
  private _isFetchingThumbnails: boolean = false;
  private _thumbAborter: AbortController | null = null;
  private _thumbnailCache: ThumbnailCache = new ThumbnailCache();

  private _currentFilmstrip: Filmstrip = EMPTY_FILMSTRIP;
  private _nextFilmstrip: Filmstrip = { ...EMPTY_FILMSTRIP, segmentIndex: 0 };
  private _loadingFilmstrip: Filmstrip = EMPTY_FILMSTRIP;

  private _fallbackSegmentIndex: number = 0;
  private _fallbackSegmentsCount: number = 0;

  static ownDefaults = {
    rx: 6,
    ry: 6,
    objectCaching: false,
    borderColor: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    fill: '#312e81',
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Video.ownDefaults);
    this.initialize();
  }

  set(key: string, value: any) {
    if (key === 'width') {
      console.log(key, value);
    }
    return super.set(key, value);
  }

  public initDimensions() {
    this._thumbnailHeight = this.height || DEFAULT_THUMBNAIL_HEIGHT;
    this._thumbnailWidth = this._thumbnailHeight * this._aspectRatio;

    const segmentOptions = calculateThumbnailSegmentLayout(
      this._thumbnailWidth
    );
    this._thumbnailsPerSegment = segmentOptions.thumbnailsPerSegment;
    this._segmentSize = segmentOptions.segmentSize;
  }

  public async initialize() {
    this.initDimensions();
    this.onScrollChange({ scrollLeft: 0 });

    // Initial fallback with default 16:9
    await this.createFallbackThumbnail();
    this.createFallbackPattern();

    // Trigger loading which will also update aspect ratio if metadata is ready
    this.loadAndRenderThumbnails();
  }

  private async createFallbackThumbnail() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetHeight = DEFAULT_THUMBNAIL_HEIGHT;
    const targetWidth = Math.round(targetHeight * this._aspectRatio);

    canvas.height = targetHeight;
    canvas.width = targetWidth;

    ctx.fillStyle = FALLBACK_COLOR;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const img = new Image();
    img.src = canvas.toDataURL();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    this._thumbnailWidth = targetWidth;
    this._thumbnailCache.setThumbnail('fallback', img);
  }

  private createFallbackPattern() {
    const canvas = this.canvas;
    if (!canvas) return;

    const canvasWidth = canvas.width;
    const maxPatternSize = 12000;
    const fallbackSource = this._thumbnailCache.getThumbnail('fallback');

    if (!fallbackSource) return;

    const totalWidthNeeded = Math.min(canvasWidth * 20, maxPatternSize);
    const segmentsRequired = Math.ceil(totalWidthNeeded / this._segmentSize);
    this._fallbackSegmentsCount = segmentsRequired;
    const patternWidth = segmentsRequired * this._segmentSize;

    const offCanvas = document.createElement('canvas');
    offCanvas.height = this._thumbnailHeight;
    offCanvas.width = patternWidth;

    const context = offCanvas.getContext('2d');
    if (!context) return;
    const thumbnailsTotal = segmentsRequired * this._thumbnailsPerSegment;

    for (let i = 0; i < thumbnailsTotal; i++) {
      const x = i * this._thumbnailWidth;
      context.drawImage(
        fallbackSource,
        x,
        0,
        this._thumbnailWidth,
        this._thumbnailHeight
      );
    }

    const fillPattern = new Pattern({
      source: offCanvas,
      repeat: 'no-repeat',
      patternTransform: [1, 0, 0, 1, 0, 0],
    });

    this.set('fill', fillPattern);
    this.canvas?.requestRenderAll();
  }

  public onScrollChange({
    scrollLeft,
    force,
  }: {
    scrollLeft: number;
    force?: boolean;
  }) {
    this._scrollLeft = scrollLeft;

    const offscreenWidth = Math.max(0, -(this.left + scrollLeft));
    const trimFromSize = timeMsToUnits(
      this.trim.from,
      this.timeScale,
      this.playbackRate
    );

    const segmentToDraw = calculateOffscreenSegments(
      offscreenWidth,
      trimFromSize,
      this._segmentSize
    );

    if (!force && this._currentFilmstrip.segmentIndex === segmentToDraw) {
      return false;
    }

    if (segmentToDraw !== this._fallbackSegmentIndex) {
      const fillPattern = this.fill as Pattern;
      if (fillPattern instanceof Pattern) {
        fillPattern.offsetX =
          this._segmentSize *
          (segmentToDraw - Math.floor(this._fallbackSegmentsCount / 2));
      }
      this._fallbackSegmentIndex = segmentToDraw;
    }

    if (!this._isFetchingThumbnails || force) {
      const widthOnScreen = this.calculateWidthOnScreen(scrollLeft);

      const dimensions = this.calculateFilmstripDimensions({
        widthOnScreen,
        segmentIndex: segmentToDraw,
      });

      this._nextFilmstrip = {
        segmentIndex: segmentToDraw,
        offset: dimensions.filmstripOffset,
        startTime: dimensions.filmstripStartTime,
        thumbnailsCount: dimensions.filmstrimpThumbnailsCount,
        widthOnScreen,
      };

      this.loadAndRenderThumbnails();
    }
  }

  private calculateWidthOnScreen(scrollLeft: number): number {
    const canvasWidth = this.canvas?.width || 0;
    const clipStartOnTimeline = this.left + scrollLeft;
    const clipEndOnTimeline = clipStartOnTimeline + this.width;

    const visibleStart = Math.max(0, clipStartOnTimeline);
    const visibleEnd = Math.min(canvasWidth, clipEndOnTimeline);

    return Math.max(0, visibleEnd - visibleStart);
  }

  private calculateFilmstripDimensions({
    segmentIndex,
    widthOnScreen,
  }: {
    segmentIndex: number;
    widthOnScreen: number;
  }) {
    const filmstripOffset = segmentIndex * this._segmentSize;
    const backlogSize = this._segmentSize;
    const filmstripStartTime = unitsToTimeMs(filmstripOffset, this.timeScale);
    const filmstrimpThumbnailsCount =
      1 + Math.round((widthOnScreen + backlogSize * 2) / this._thumbnailWidth);

    return {
      filmstripOffset,
      filmstripStartTime,
      filmstrimpThumbnailsCount,
    };
  }

  public async loadAndRenderThumbnails() {
    if (this._isFetchingThumbnails) return;

    const studio = useStudioStore.getState().studio;
    if (!studio || !this.studioClipId) return;

    const clip = studio.getClipById(this.studioClipId);
    if (!clip || clip.type !== 'Video') return;

    const videoClip = clip as VideoClip;

    // Update aspect ratio from metadata if available
    const { width, height, duration: sourceDuration } = videoClip.meta;
    let needsUpdate = false;

    if (width && height) {
      const newAspectRatio = width / height;
      if (Math.abs(this._aspectRatio - newAspectRatio) > 0.01) {
        this._aspectRatio = newAspectRatio;
        needsUpdate = true;
      }
    }

    if (sourceDuration && sourceDuration !== this.sourceDuration) {
      this.sourceDuration = sourceDuration;

      // Clamp current trim and duration to new source duration
      if (this.trim.to > sourceDuration) {
        this.trim.to = sourceDuration;
        this.trim.from = Math.min(this.trim.from, this.trim.to);
        this.duration = (this.trim.to - this.trim.from) / this.playbackRate;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.initDimensions();
      await this.createFallbackThumbnail();
      this.createFallbackPattern();
    }

    this._thumbAborter?.abort();
    this._thumbAborter = new AbortController();
    const { signal } = this._thumbAborter;

    this._loadingFilmstrip = { ...this._nextFilmstrip };
    this._isFetchingThumbnails = true;

    const { startTime, thumbnailsCount } = this._loadingFilmstrip;
    const timestamps = this.generateTimestamps(startTime, thumbnailsCount);

    try {
      const thumbnailsArr = await videoClip.thumbnails(this._thumbnailWidth, {
        start: timestamps[0] * MICROSECONDS_IN_SECOND,
        end: timestamps[timestamps.length - 1] * MICROSECONDS_IN_SECOND,
        step: THUMBNAIL_STEP_US,
      });

      if (signal.aborted) return;

      await this.loadThumbnailBatch(thumbnailsArr);

      this._isFetchingThumbnails = false;
      this._currentFilmstrip = { ...this._loadingFilmstrip };
      this.canvas?.requestRenderAll();
    } catch (error: any) {
      if (error.message !== 'generate thumbnails aborted') {
        console.warn('Failed to load thumbnails:', error);
      }
      this._isFetchingThumbnails = false;
    }
  }

  private generateTimestamps(startTime: number, count: number): number[] {
    const timePerThumbnail = unitsToTimeMs(
      this._thumbnailWidth,
      this.timeScale,
      this.playbackRate
    );

    return Array.from({ length: count }, (_, i) => {
      const timeInFilmstripe = startTime + i * timePerThumbnail;
      return Math.floor(timeInFilmstripe / MICROSECONDS_IN_SECOND);
    });
  }

  private async loadThumbnailBatch(thumbnails: { ts: number; img: Blob }[]) {
    const loadPromises = thumbnails.map(async (thumbnail) => {
      const tsSeconds = Math.floor(thumbnail.ts / MICROSECONDS_IN_SECOND);
      if (this._thumbnailCache.getThumbnail(tsSeconds)) return;

      return new Promise<void>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(thumbnail.img);
        img.src = url;
        img.onload = () => {
          URL.revokeObjectURL(url);
          this._thumbnailCache.setThumbnail(tsSeconds, img);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
      });
    });

    await Promise.all(loadPromises);
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);

    // Apply global rounded clip for thumbnails and identity
    const radius = this.rx || 6;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, radius);
    ctx.clip();

    this.drawFilmstrip(ctx);
    this.drawIdentity(ctx);
    ctx.restore();

    this.updateSelected(ctx);
  }

  private drawFilmstrip(ctx: CanvasRenderingContext2D) {
    const canvasWidth = this.canvas?.width || 0;
    const clipStartOnTimeline = this.left + this._scrollLeft;

    // Determine the visible range of the clip in its local coordinates
    const visibleStart = Math.max(0, -clipStartOnTimeline);
    const visibleEnd = Math.min(this.width, canvasWidth - clipStartOnTimeline);

    if (visibleStart >= visibleEnd) return;

    const thumbnailWidth = this._thumbnailWidth;
    const thumbnailHeight = this._thumbnailHeight;
    const timeScale = this.timeScale;
    const trimFromSize = timeMsToUnits(
      this.trim.from,
      timeScale,
      this.playbackRate
    );

    // Filter indices that cover the visible range + small buffer
    const firstIdx = Math.floor(visibleStart / thumbnailWidth);
    const lastIdx = Math.ceil(visibleEnd / thumbnailWidth);

    for (let i = firstIdx; i <= lastIdx; i++) {
      const x = i * thumbnailWidth;
      // Source time for this thumbnail slot
      const localTime = unitsToTimeMs(
        x + trimFromSize,
        timeScale,
        this.playbackRate
      );
      const tsSeconds = Math.floor(localTime / MICROSECONDS_IN_SECOND);

      let img = this._thumbnailCache.getThumbnail(tsSeconds);
      if (!img) {
        img = this._thumbnailCache.getThumbnail('fallback');
      }

      if (img) {
        ctx.drawImage(img, x, 0, thumbnailWidth, thumbnailHeight);
      }
    }
  }

  public drawIdentity(ctx: CanvasRenderingContext2D) {
    const text = this.text || '';
    const seconds = Math.round(this.duration / MICROSECONDS_IN_SECOND);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const durationText = `${m}:${s.toString().padStart(2, '0')}`;

    // Note: ctx is already translated and clipped in _render

    ctx.font = `600 11px ${editorFont.fontFamily}`;
    const paddingX = 6;
    const paddingY = 2;
    const bgHeight = 14 + paddingY * 2;
    const margin = 4;
    const blockGap = 4;

    let currentX = margin;
    const y = margin;

    // Helper to draw a text block with background
    const drawBlock = (content: string, isDimmed = false) => {
      const metrics = ctx.measureText(content);
      const bgWidth = metrics.width + paddingX * 2;

      // Draw background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(currentX, y, bgWidth, bgHeight, 4);
      ctx.fill();

      // Draw text
      ctx.fillStyle = isDimmed
        ? 'rgba(255, 255, 255, 0.5)'
        : 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(content, currentX + paddingX, y + paddingY + 1);

      currentX += bgWidth + blockGap;
    };

    if (text) {
      drawBlock(text);
    }
    drawBlock(durationText, true);
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? '#ffffff' : '#3730a3';
    const borderWidth = 2;
    const radius = 6;

    ctx.save();
    ctx.fillStyle = borderColor;

    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      radius
    );

    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      radius - borderWidth
    );

    ctx.fill('evenodd');
    ctx.restore();
  }
}
