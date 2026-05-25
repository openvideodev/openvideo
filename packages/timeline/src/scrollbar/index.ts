import type { TMat2D, TPointerEvent } from "fabric";
import { util } from "fabric";
import Timeline from "../timeline";
import type { ScrollbarProps, ScrollbarsProps, ScrollbarXProps, ScrollbarYProps } from "./types";

export class Scrollbars {
  canvas: Timeline;
  fill = "rgba(0,0,0,.3)";
  stroke = "rgba(255,255,255,.3)";
  lineWidth = 1;
  hideX = false;
  hideY = false;
  scrollbarMinWidth = 40;
  scrollbarSize = 5;
  scrollSpace = 4;
  padding = 4;
  extraMarginX = 200;
  extraMarginY = 200;
  offsetX = 0;
  offsetY = 0;
  scrollbarWidth = 5;
  scrollbarColor = "rgba(0,0,0,.3)";
  onViewportChange?: (left: number) => void;
  private _lastViewportLeft?: number;
  private _lastStateKey?: string;

  private _bar?: { type: string; start: number; vpt: TMat2D };
  private _barViewport = {
    left: 1,
    right: -1,
    top: 1,
    bottom: -1,
    sx: 1,
    sy: 1,
  };

  private _originalMouseDown: ((e: TPointerEvent) => void) | undefined;
  private _originalMouseMove: ((e: TPointerEvent) => void) | undefined;
  private _originalMouseUp: ((e: TPointerEvent) => void) | undefined;

  constructor(canvas: Timeline, props: ScrollbarsProps = {}) {
    this.canvas = canvas;
    Object.assign(this, props);

    if (props.scrollbarWidth !== undefined) {
      this.scrollbarSize = props.scrollbarWidth;
    }
    if (props.scrollbarColor !== undefined) {
      this.fill = props.scrollbarColor;
    }

    this._originalMouseDown = this.canvas.__onMouseDown;
    this._originalMouseMove = this.canvas._onMouseMove;
    this._originalMouseUp = this.canvas._onMouseUp;

    this.canvas.__onMouseDown = this.mouseDownHandler.bind(this);
    this.canvas._onMouseMove = this.mouseMoveHandler.bind(this);
    this.canvas._onMouseUp = this.mouseUpHandler.bind(this);
    this.beforeRenderHandler = this.beforeRenderHandler.bind(this);
    this.afterRenderHandler = this.afterRenderHandler.bind(this);

    this.initBehavior();
  }
  initBehavior() {
    this.canvas.on("before:render", this.beforeRenderHandler);
    this.canvas.on("after:render", this.afterRenderHandler);
  }
  getScrollbar(e: TPointerEvent) {
    const p = this.canvas.getViewportPoint(e);
    const vpt = this.canvas.viewportTransform.slice(0) as TMat2D;
    if (!this.hideX) {
      const b =
        p.x > this._barViewport.left &&
        p.x < this._barViewport.right &&
        p.y > this.canvas.height - this.scrollbarSize - this.scrollSpace - this.padding &&
        p.y < this.canvas.height - this.scrollSpace + this.padding;

      if (b) return { type: "x", start: p.x, vpt };
    }
    if (!this.hideY) {
      const b =
        p.y > this._barViewport.top &&
        p.y < this._barViewport.bottom &&
        p.x > this.canvas.width - this.scrollbarSize - this.scrollSpace - this.padding &&
        p.x < this.canvas.width - this.scrollSpace + this.padding;

      if (b) return { type: "y", start: p.y, vpt };
    }
  }
  mouseDownHandler(e: TPointerEvent) {
    this._bar = this.getScrollbar(e);
    if (!this._bar) return Timeline.prototype.__onMouseDown.call(this.canvas, e);
  }
  mouseMoveHandler(e: TPointerEvent) {
    if (!this._bar) return Timeline.prototype._onMouseMove.call(this.canvas, e);
    const p = this.canvas.getViewportPoint(e);
    const s = this._bar.type == "x" ? this._barViewport.sx : this._barViewport.sy;
    const n = this._bar.type == "x" ? 4 : 5;
    const end = this._bar.type == "x" ? p.x : p.y;
    const vpt = this._bar.vpt.slice(0) as TMat2D;
    vpt[n] -= (end - this._bar.start) * s;

    this.applyViewportLimits(vpt);

    this.canvas.setViewportTransform(vpt);
    this.canvas.requestRenderAll();
  }
  mouseUpHandler(e: TPointerEvent) {
    if (!this._bar) Timeline.prototype._onMouseUp.call(this.canvas, e);
    delete this._bar;
  }
  beforeRenderHandler() {
    const ctx = this.canvas.contextTop;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.restore();
  }
  afterRenderHandler() {
    const { tl, br } = this.canvas.vptCoords;
    const vpt = this.canvas.viewportTransform;
    const stateKey = `${vpt[0]},${vpt[4]},${vpt[5]},${this.canvas.width},${this.canvas.height}`;

    const mapRect = { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
    const objectRect = this.getObjectsBoundingRect();

    const objectRectWithMargin = {
      left: Math.min(objectRect.left, -this.offsetX),
      top: Math.min(objectRect.top, -this.offsetY),
      right: objectRect.right + this.extraMarginX,
      bottom: objectRect.bottom + this.extraMarginY,
    };

    if (objectRectWithMargin.left > mapRect.left) objectRectWithMargin.left = mapRect.left;
    if (objectRectWithMargin.top > mapRect.top) objectRectWithMargin.top = mapRect.top;
    if (objectRectWithMargin.bottom < mapRect.bottom) objectRectWithMargin.bottom = mapRect.bottom;
    if (objectRectWithMargin.right < mapRect.right) objectRectWithMargin.right = mapRect.right;

    const finalStateKey = `${stateKey},${objectRectWithMargin.left},${objectRectWithMargin.top},${objectRectWithMargin.right},${objectRectWithMargin.bottom}`;

    if (this._lastStateKey === finalStateKey) {
      // Re-draw on contextTop because Fabric might have cleared it,
      // but skip the onViewportChange and other logic.
      this.render(this.canvas.contextTop, mapRect, objectRectWithMargin);
      return;
    }
    this._lastStateKey = finalStateKey;

    this.render(this.canvas.contextTop, mapRect, objectRectWithMargin);

    if (this.onViewportChange) {
      const left = tl.x;
      if (this._lastViewportLeft !== left) {
        this.onViewportChange(left);
        this._lastViewportLeft = left;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D, mapRect: ScrollbarProps, objectRect: ScrollbarProps) {
    // Clear only scrollbar areas, not the entire canvas
    if (!this.hideX) {
      ctx.clearRect(
        0,
        this.canvas.height - this.scrollbarSize - this.scrollSpace - this.lineWidth,
        this.canvas.width,
        this.scrollbarSize + this.scrollSpace + this.lineWidth,
      );
    }

    if (!this.hideY) {
      ctx.clearRect(
        this.canvas.width - this.scrollbarSize - this.scrollSpace - this.lineWidth,
        0,
        this.scrollbarSize + this.scrollSpace + this.lineWidth,
        this.canvas.height,
      );
    }

    ctx.save();
    ctx.fillStyle = this.fill;
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.lineWidth;

    if (!this.hideX) this.drawScrollbarX(ctx, mapRect, objectRect);
    if (!this.hideY) this.drawScrollbarY(ctx, mapRect, objectRect);

    ctx.restore();
  }
  drawScrollbarX(
    ctx: CanvasRenderingContext2D,
    mapRect: ScrollbarXProps,
    objectRect: ScrollbarXProps,
  ) {
    // console.log("Drawing scrollbar x", mapRect, objectRect);
    const mapWidth = mapRect.right - mapRect.left;
    const objectWidth = objectRect.right - objectRect.left;
    if (mapWidth == objectWidth) {
      this._barViewport.left = 1;
      this._barViewport.right = -1;
      this._barViewport.sx = 1;
      return;
    }
    // console.log("Drawing scrollbar x", mapRect, objectRect);
    const scaleX = Math.min(mapWidth / objectWidth, 1);
    const w = this.canvas.width - this.scrollbarSize - this.scrollSpace * 2;
    const width = Math.max((w * scaleX) | 0, this.scrollbarMinWidth);
    const left = ((mapRect.left - objectRect.left) / (objectWidth - mapWidth)) * (w - width);

    const x = this.scrollSpace + left;
    const y = this.canvas.height - this.scrollbarSize - this.scrollSpace;
    this._barViewport.left = x;
    this._barViewport.right = x + width;
    this._barViewport.sx = objectWidth / mapWidth;

    this.drawRect(ctx, {
      x,
      y,
      w: width,
      h: this.scrollbarSize,
    });
  }
  drawScrollbarY(
    ctx: CanvasRenderingContext2D,
    mapRect: ScrollbarYProps,
    objectRect: ScrollbarYProps,
  ) {
    const mapHeight = mapRect.bottom - mapRect.top;
    const objectHeight = objectRect.bottom - objectRect.top;
    if (mapHeight == objectHeight) {
      this._barViewport.top = 1;
      this._barViewport.bottom = -1;
      this._barViewport.sy = 1;
      return;
    }

    const scaleY = Math.min(mapHeight / objectHeight, 1);
    const h = this.canvas.height - this.scrollbarSize - this.scrollSpace * 2;
    const height = Math.max((h * scaleY) | 0, this.scrollbarMinWidth);
    const top = ((mapRect.top - objectRect.top) / (objectHeight - mapHeight)) * (h - height);

    const x = this.canvas.width - this.scrollbarSize - this.scrollSpace;
    const y = this.scrollSpace + top;
    this._barViewport.top = y;
    this._barViewport.bottom = y + height;
    this._barViewport.sy = objectHeight / mapHeight;
    this.drawRect(ctx, {
      x,
      y,
      w: this.scrollbarSize,
      h: height,
    });
  }
  drawRect(ctx: CanvasRenderingContext2D, props: { x: number; y: number; w: number; h: number }) {
    const { x, y, w, h } = props;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  getObjectsBoundingRect() {
    const objects = this.canvas.itemsManager.getTrackItems();
    if (objects.length === 0) {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }
    const { left, top, width, height } = util.makeBoundingBoxFromPoints(
      objects.map((x) => x.getCoords()).flat(1),
    );
    return { left, top, right: left + width, bottom: top + height };
  }

  applyViewportLimits(vpt: TMat2D) {
    const zoom = vpt[0];

    const objectRect = this.getObjectsBoundingRect();

    const totalAreaLeft = Math.min(objectRect.left, -this.offsetX);
    const totalAreaTop = Math.min(objectRect.top, -this.offsetY);
    const totalAreaRight = objectRect.right + this.extraMarginX;
    const totalAreaBottom = objectRect.bottom + this.extraMarginY;

    const totalWidth = totalAreaRight - totalAreaLeft;
    const totalHeight = totalAreaBottom - totalAreaTop;

    const canvasWidth = this.canvas.width / zoom;
    const canvasHeight = this.canvas.height / zoom;

    if (totalWidth <= canvasWidth) {
      vpt[4] = -totalAreaLeft * zoom;
    } else {
      const maxScrollLeft = this.offsetX * zoom;
      if (vpt[4] > maxScrollLeft) vpt[4] = maxScrollLeft;

      const minScrollRight = -((objectRect.right + this.extraMarginX) * zoom - this.canvas.width);
      if (minScrollRight < 0 && vpt[4] < minScrollRight) {
        vpt[4] = minScrollRight;
      }
    }

    if (totalHeight <= canvasHeight) {
      vpt[5] = -totalAreaTop * zoom;
    } else {
      const maxScrollTop = this.offsetY * zoom;
      if (vpt[5] > maxScrollTop) vpt[5] = maxScrollTop;

      const minScrollBottom = -(
        (objectRect.bottom + this.extraMarginY) * zoom -
        this.canvas.height
      );
      if (minScrollBottom < 0 && vpt[5] < minScrollBottom) {
        vpt[5] = minScrollBottom;
      }
    }
  }

  dispose() {
    if (this._originalMouseDown) {
      this.canvas.__onMouseDown = this._originalMouseDown;
    }
    if (this._originalMouseMove) {
      this.canvas._onMouseMove = this._originalMouseMove;
    }
    if (this._originalMouseUp) {
      this.canvas._onMouseUp = this._originalMouseUp;
    }

    this.canvas.off("before:render", this.beforeRenderHandler);
    this.canvas.off("after:render", this.afterRenderHandler);
  }
}
