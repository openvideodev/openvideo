import {
  Container,
  Point,
  type FederatedPointerEvent,
  Rectangle,
  Matrix,
  Ticker,
  Graphics,
} from 'pixi.js';

import { Wireframe } from './parts/wireframe';
import { type HandleKind, Handle } from './parts/handle';
import { SnappingManager, type SnapGuide } from './parts/snapping';

const TMP = {
  delta: new Matrix(),
  newLocal: new Matrix(),
};

export class Transformer extends Container {
  group: Container[];
  wireframe = new Wireframe();
  selectionOutlines = new Graphics();
  isDragging = false;
  lastPointer = new Point();
  activeHandle: HandleKind | null = null;

  #handles: Record<string, Handle>;
  #childStart = new Map<Container, Matrix>();
  #pivotWorld = new Point();
  #angle = 0;
  #startAngle = 0;

  #opBounds = new Rectangle();
  #scalePivotLocal = new Point();
  #localBounds = new Rectangle();

  // Reusable points for selection bounds calculation to avoid GC
  #tmpQuad = [new Point(), new Point(), new Point(), new Point()];

  #minW = 1;
  #minH = 1;

  #snappingManager: SnappingManager;
  #guidelines = new Graphics();
  #unsnappedPivotWorld = new Point();

  opts: {
    group: Container[];
    centeredScaling?: boolean;
    clip?: any;
    artboardWidth?: number;
    artboardHeight?: number;
  };

  constructor(opts: {
    group: Container[];
    centeredScaling?: boolean;
    clip?: any;
    artboardWidth?: number;
    artboardHeight?: number;
  }) {
    super();
    this.opts = opts;
    this.group = opts.group;
    this.eventMode = 'static';

    this.#snappingManager = new SnappingManager(
      opts.artboardWidth ?? 1920,
      opts.artboardHeight ?? 1080
    );
    this.addChild(this.#guidelines);

    const cb = {
      beginDrag: (h: HandleKind, s: Point) => this.#beginHandleDrag(h, s),
      updateDrag: (h: HandleKind, p: Point) => this.#updateDrag(h, p),
      endDrag: () => this.#endDrag(),
    };

    this.#handles = {
      tl: new Handle('tl', 'nwse-resize', cb),
      tr: new Handle('tr', 'nesw-resize', cb),
      bl: new Handle('bl', 'nesw-resize', cb),
      br: new Handle('br', 'nwse-resize', cb),
      ml: new Handle('ml', 'ew-resize', cb),
      mr: new Handle('mr', 'ew-resize', cb),
      mt: new Handle('mt', 'ns-resize', cb),
      mb: new Handle('mb', 'ns-resize', cb),
      rot: new Handle('rot', 'crosshair', {
        beginDrag: (_c, s) => this.#beginRotateDrag(s),
        updateDrag: (_c, p) => this.#rotate(p),
        endDrag: () => this.#endDrag(),
      }),
    };

    this.addChild(
      this.selectionOutlines,
      this.wireframe,
      ...Object.values(this.#handles)
    );
    this.#bindEvents();

    // Hide initially to prevent FOUC (Flash of Unpositioned Content)
    this.visible = false;

    Ticker.shared.addOnce(() => {
      if (!this.destroyed && this.parent) {
        this.#initBounds();
        this.visible = true;
      }
    });
  }

  #bindEvents() {
    this.on('pointerdown', this.#onDown);
    this.on('pointerup', this.#onUp);
    this.on('pointerupoutside', this.#onUp);
    this.on('globalpointermove', this.#onMove);
  }

  #initBounds() {
    // Check if we have a single object - if so, use its transform directly
    if (this.group.length === 1) {
      const obj = this.group[0];

      // Use object's rotation
      this.#angle = obj.rotation;

      // Get "content" bounds (excluding shadows)
      const contentBounds = this.#getContentBounds(obj);

      // Set transformer's local bounds to match object's content dimensions
      // If we have a clip, it's safer to use its dimensions directly for the handles
      let width: number, height: number;
      if (this.opts.clip) {
        width = this.opts.clip.width;
        height = this.opts.clip.height;
      } else {
        width = contentBounds.width;
        height = contentBounds.height;
      }

      // Calculate global pivot based on the TRUE center of the object (ignoring shadow offset)
      // Since object's pivot is (0,0) (centered root), its global position is its center.
      const globalPos = obj.toGlobal(new Point(0, 0));
      this.#pivotWorld.set(globalPos.x, globalPos.y);

      // Set transformer's local bounds to be centered at origin
      this.#localBounds.copyFrom(
        new Rectangle(-width / 2, -height / 2, width, height)
      );
    } else {
      // Multiple objects - use Local AABB relative to current transformer rotation
      // This preserves the tight bounding box even if the group is rotated
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      if (this.parent) {
        for (const item of this.group) {
          const b = this.#getContentBounds(item);

          this.#tmpQuad[0].set(b.x, b.y);
          this.#tmpQuad[1].set(b.x + b.width, b.y);
          this.#tmpQuad[2].set(b.x + b.width, b.y + b.height);
          this.#tmpQuad[3].set(b.x, b.y + b.height);

          for (const p of this.#tmpQuad) {
            // item local -> global -> transformer local
            item.toGlobal(p, p);
            this.toLocal(p, undefined, p);

            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
        }
      }

      const w = maxX - minX;
      const h = maxY - minY;
      const localCenterX = minX + w / 2;
      const localCenterY = minY + h / 2;

      // Center the local bounds
      this.#localBounds.copyFrom(new Rectangle(-w / 2, -h / 2, w, h));

      // Update Pivot to match the new center (converted to World space)
      if (this.parent) {
        const newGlobalPivot = this.toGlobal(
          new Point(localCenterX, localCenterY)
        );
        this.#pivotWorld.set(newGlobalPivot.x, newGlobalPivot.y);
      }
    }

    this.#refresh();
  }

  /**
   * Helper to compute bounds of a container excluding children labeled "ShadowContainer"
   */
  #getContentBounds(container: Container): Rectangle {
    // Collect all children except the shadow container
    const contentChildren = container.children.filter(
      (child) => child.label !== 'ShadowContainer'
    );

    if (contentChildren.length === 0) {
      const b = container.getLocalBounds();
      return new Rectangle(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    }

    // Since our roots are centered, the content bounds should ideally match the main sprite
    const mainSprite = contentChildren.find((c) => c.label === 'MainSprite');
    if (mainSprite) {
      const b = mainSprite.getLocalBounds();
      const t = mainSprite.localTransform;

      // Transform all 4 corners of the local bounds to parent space
      const p1 = t.apply(new Point(b.x, b.y));
      const p2 = t.apply(new Point(b.x + b.width, b.y));
      const p3 = t.apply(new Point(b.x + b.width, b.y + b.height));
      const p4 = t.apply(new Point(b.x, b.y + b.height));

      const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
      const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
      const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
      const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

      return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    // Fallback: manual calculation for remaining content children
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const child of contentChildren) {
      const b = child.getBounds(); // Global bounds
      // Convert to container local space
      const tl = container.toLocal(new Point(b.minX, b.minY));
      const br = container.toLocal(new Point(b.maxX, b.maxY));

      minX = Math.min(minX, tl.x, br.x);
      minY = Math.min(minY, tl.y, br.y);
      maxX = Math.max(maxX, tl.x, br.x);
      maxY = Math.max(maxY, tl.y, br.y);
    }

    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Public method to update transformer bounds without recreating it
   * Useful for updating bounds after clip dimensions change
   */
  updateBounds(): void {
    this.#initBounds();
  }

  #onDown = (e: FederatedPointerEvent) => {
    // Refresh bounds/pivot to ensure we have the latest global position
    // (in case Artboard moved/zoomed since selection)
    this.#initBounds();
    this.#unsnappedPivotWorld.copyFrom(this.#pivotWorld);

    this.isDragging = true;
    this.lastPointer.copyFrom(e.global);
    this.cursor = 'grabbing';
  };

  #onUp = () => {
    if (this.isDragging) {
      this.#endDrag();
    }
    this.cursor = 'default';
  };

  #onMove = (e: FederatedPointerEvent) => {
    if (!this.isDragging || this.activeHandle || !this.parent) return;

    const { moveDx, moveDy, newPivotWorld } = this.#calculateSnappedMove(e);

    // Apply to objects
    for (const obj of this.group) {
      obj.x += moveDx;
      obj.y += moveDy;
    }

    this.#pivotWorld.copyFrom(newPivotWorld);
    this.lastPointer.copyFrom(e.global);
    this.#refresh();
    this.emit('transforming');
  };

  #calculateSnappedMove(e: FederatedPointerEvent) {
    const parentScale = Math.abs(this.parent!.worldTransform.a);

    // Update context
    this.#snappingManager.updateContext(
      this.opts.artboardWidth ?? 1920,
      this.opts.artboardHeight ?? 1080,
      parentScale
    );

    // Calculate pure global mouse delta
    const dxGlobalMouse = e.global.x - this.lastPointer.x;
    const dyGlobalMouse = e.global.y - this.lastPointer.y;

    // Update the Virtual (Unsnapped) Pivot
    this.#unsnappedPivotWorld.x += dxGlobalMouse;
    this.#unsnappedPivotWorld.y += dyGlobalMouse;

    // Calculate Proposed Parent Position from Virtual Pivot
    const proposedParentPos = this.parent!.toLocal(this.#unsnappedPivotWorld);

    // Construct Proposed Bounds (centered at proposed position)
    const proposedBounds = new Rectangle(
      proposedParentPos.x + this.#localBounds.x,
      proposedParentPos.y + this.#localBounds.y,
      this.#localBounds.width,
      this.#localBounds.height
    );

    // Check for Snaps
    const {
      dx: snapDx,
      dy: snapDy,
      guides,
    } = this.#snappingManager.snapMove(proposedBounds);

    this.#drawGuides(guides, parentScale);

    // Calculate Final Target Position
    const finalParentPosX = proposedParentPos.x + snapDx;
    const finalParentPosY = proposedParentPos.y + snapDy;

    // Calculate Delta to apply to Objects
    const currentParentPos = this.parent!.toLocal(this.#pivotWorld);
    const moveDx = finalParentPosX - currentParentPos.x;
    const moveDy = finalParentPosY - currentParentPos.y;

    // Calculate New Global Pivot
    const newPivotWorld = this.parent!.toGlobal(
      new Point(finalParentPosX, finalParentPosY)
    );

    return { moveDx, moveDy, newPivotWorld };
  }

  #beginHandleDrag(handle: HandleKind, _start: Point) {
    this.#initBounds(); // Refresh pivot/bounds state
    this.isDragging = true;
    this.activeHandle = handle;

    this.#childStart.clear();

    for (const c of this.group)
      this.#childStart.set(c, c.localTransform.clone());

    this.rotation = this.#angle;
    this.#opBounds.copyFrom(this.#localBounds);

    this.#setScalePivot(handle);
  }

  #updateDrag(handle: HandleKind, pos: Point) {
    this.#scale(handle, pos);
  }

  async #scale(handle: HandleKind, global: Point) {
    const { proposed, sx, sy, pivotWorld } = await this.#calculateSnappedScale(
      handle,
      global
    );

    // Check if we're transforming a Text or Caption
    const isTextClip = this.opts.clip && this.opts.clip.type === 'Text';
    const isCaptionClip = this.opts.clip && this.opts.clip.type === 'Caption';

    if (isTextClip || isCaptionClip) {
      this.emit('textClipResize', {
        handle,
        newWidth: proposed.width,
        newHeight: proposed.height,
        pivotWorld,
        proposed,
        sx,
        sy,
      });
    } else {
      this.#applyWorldDelta(this.#deltaScale(pivotWorld, this.#angle, sx, sy));
    }

    this.#localBounds.copyFrom(proposed);
    this.#refresh();
    this.emit('transforming');
  }

  async #calculateSnappedScale(handle: HandleKind, global: Point) {
    const pivotLocal = this.#scalePivotLocal;
    const proposed = this.#proposeScaledRect(
      handle,
      this.toLocal(global),
      pivotLocal
    );

    const parentScale = this.parent
      ? Math.abs(this.parent.worldTransform.a)
      : 1;
    this.#snappingManager.updateContext(
      this.opts.artboardWidth ?? 1920,
      this.opts.artboardHeight ?? 1080,
      parentScale
    );

    // Snap the proposed rectangle
    const { dx, dy, guides } = this.#snappingManager.snapMove(proposed);

    // Apply snap
    proposed.x += dx;
    proposed.y += dy;

    this.#drawGuides(guides, parentScale);

    const sx = proposed.width / this.#opBounds.width;
    const sy = proposed.height / this.#opBounds.height;
    const pivotWorld = this.toGlobal(pivotLocal);

    return { proposed, sx, sy, pivotWorld };
  }

  #beginRotateDrag(start: Point) {
    this.#initBounds(); // Refresh pivot/bounds state
    this.isDragging = true;
    this.activeHandle = 'rot';
    this.#childStart.clear();
    for (const c of this.group)
      this.#childStart.set(c, c.localTransform.clone());
    this.#startAngle = Math.atan2(
      start.y - this.#pivotWorld.y,
      start.x - this.#pivotWorld.x
    );
  }

  #rotate(global: Point) {
    const now = Math.atan2(
      global.y - this.#pivotWorld.y,
      global.x - this.#pivotWorld.x
    );
    const da = now - this.#startAngle;
    const live = this.#angle + da;

    this.#applyWorldDelta(this.#deltaRotate(this.#pivotWorld, da));
    this.rotation = live;
    this.#refresh(live);
    this.emit('transforming');
  }

  #endDrag() {
    this.isDragging = false;
    this.#angle = this.rotation;
    this.activeHandle = null;
    this.#guidelines.clear();
    this.#refresh(this.#angle);
    this.emit('transformEnd');
  }

  #drawGuides(guides: SnapGuide[], scale: number) {
    this.#guidelines.clear();
    if (!guides.length || !this.parent) return;

    this.#guidelines.stroke({ width: 1 / scale, color: 0x48dbfb }); // Blue for guides

    for (const guide of guides) {
      // Create points in Parent Space
      let p1: Point, p2: Point;

      if (guide.type === 'vertical') {
        p1 = new Point(guide.position, guide.start);
        p2 = new Point(guide.position, guide.end);
      } else {
        p1 = new Point(guide.start, guide.position);
        p2 = new Point(guide.end, guide.position);
      }

      // Convert to Local Space
      this.toLocal(p1, this.parent, p1);
      this.toLocal(p2, this.parent, p2);

      this.#guidelines
        .moveTo(p1.x, p1.y)
        .lineTo(p2.x, p2.y)
        .stroke({ width: 1 / scale, color: 0x48dbfb });
    }
  }

  #refresh(angle: number = this.#angle) {
    if (this.parent)
      this.position.copyFrom(this.parent.toLocal(this.#pivotWorld));
    this.rotation = angle;

    // Calculate handle scale based on parent's world scale
    const parentScale = this.parent
      ? Math.abs(this.parent.worldTransform.a)
      : 1;
    const handleScale = 1 / (parentScale || 1);

    const r = this.#localBounds;
    this.wireframe.draw(r, handleScale);

    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;

    // Get visible handles from clip (if available)
    const visibleHandles = this.opts.clip?.getVisibleHandles?.() ?? [
      'tl',
      'tr',
      'bl',
      'br',
      'ml',
      'mr',
      'mt',
      'mb',
      'rot',
    ];

    const handles = [
      this.#handles.tl,
      this.#handles.tr,
      this.#handles.bl,
      this.#handles.br,
      this.#handles.ml,
      this.#handles.mr,
      this.#handles.mt,
      this.#handles.mb,
      this.#handles.rot,
    ];

    for (const h of handles) {
      h.scale.set(handleScale);
    }

    // Set visibility based on clip's visible handles
    this.#handles.tl.visible = visibleHandles.includes('tl');
    this.#handles.tr.visible = visibleHandles.includes('tr');
    this.#handles.bl.visible = visibleHandles.includes('bl');
    this.#handles.br.visible = visibleHandles.includes('br');
    this.#handles.ml.visible = visibleHandles.includes('ml');
    this.#handles.mr.visible = visibleHandles.includes('mr');
    this.#handles.mt.visible = visibleHandles.includes('mt');
    this.#handles.mb.visible = visibleHandles.includes('mb');
    this.#handles.rot.visible = visibleHandles.includes('rot');

    this.#handles.tl.position.set(r.x, r.y);
    this.#handles.tr.position.set(r.x + r.width, r.y);
    this.#handles.bl.position.set(r.x, r.y + r.height);
    this.#handles.br.position.set(r.x + r.width, r.y + r.height);

    this.#handles.ml.position.set(r.x, cy);
    this.#handles.mr.position.set(r.x + r.width, cy);
    this.#handles.mt.position.set(cx, r.y);
    this.#handles.mb.position.set(cx, r.y + r.height);

    // Adjust rotation handle offset based on scale
    this.#handles.rot.position.set(cx, r.y - 30 * handleScale);

    // Update selection outlines
    this.#drawSelectionOutlines(handleScale);
  }

  /**
   * Draw individual bounding boxes for selected items
   * optimized to use cached points and avoid allocations
   */
  #drawSelectionOutlines(handleScale: number) {
    this.selectionOutlines.clear();

    // Only draw individual outlines if multiple clips are selected and we are valid
    if (this.group.length <= 1 || !this.parent) return;

    const strokeStyle = { width: 1 * handleScale, color: 0x00aaff, alpha: 1.0 };

    for (const item of this.group) {
      // Get content bounds (local to item)
      const b = this.#getContentBounds(item);

      // Setup corners in item local space using reused points
      // TL
      this.#tmpQuad[0].set(b.x, b.y);
      // TR
      this.#tmpQuad[1].set(b.x + b.width, b.y);
      // BR
      this.#tmpQuad[2].set(b.x + b.width, b.y + b.height);
      // BL
      this.#tmpQuad[3].set(b.x, b.y + b.height);

      // Transform to transformer local space in-place
      // item local -> global -> transformer local
      for (const p of this.#tmpQuad) {
        item.toGlobal(p, p);
        this.toLocal(p, undefined, p);
      }

      // Draw polygon using the transformed points
      this.selectionOutlines
        .moveTo(this.#tmpQuad[0].x, this.#tmpQuad[0].y)
        .lineTo(this.#tmpQuad[1].x, this.#tmpQuad[1].y)
        .lineTo(this.#tmpQuad[2].x, this.#tmpQuad[2].y)
        .lineTo(this.#tmpQuad[3].x, this.#tmpQuad[3].y)
        .closePath()
        .stroke(strokeStyle);
    }
  }

  // helpers

  #setScalePivot(handle: HandleKind) {
    const s = this.#opBounds;
    if (this.opts.centeredScaling) {
      this.#scalePivotLocal.set(s.x + s.width / 2, s.y + s.height / 2);
      return;
    }
    // For corners
    if (handle === 'tl')
      this.#scalePivotLocal.set(s.x + s.width, s.y + s.height);
    else if (handle === 'tr') this.#scalePivotLocal.set(s.x, s.y + s.height);
    else if (handle === 'bl') this.#scalePivotLocal.set(s.x + s.width, s.y);
    else if (handle === 'br') this.#scalePivotLocal.set(s.x, s.y);
    // For mid-point handles
    else if (handle === 'ml')
      this.#scalePivotLocal.set(s.x + s.width, s.y + s.height / 2);
    else if (handle === 'mr')
      this.#scalePivotLocal.set(s.x, s.y + s.height / 2);
    else if (handle === 'mt')
      this.#scalePivotLocal.set(s.x + s.width / 2, s.y + s.height);
    else if (handle === 'mb') this.#scalePivotLocal.set(s.x + s.width / 2, s.y);
  }

  #proposeScaledRect(handle: HandleKind, p: Point, pivot: Point) {
    if (this.opts.centeredScaling) {
      const w = Math.max(this.#minW, Math.abs(p.x - pivot.x) * 2);
      const h = Math.max(this.#minH, Math.abs(p.y - pivot.y) * 2);
      return new Rectangle(pivot.x - w / 2, pivot.y - h / 2, w, h);
    }

    // Corner handles - scale in both dimensions
    if (handle === 'tl') {
      const left = Math.min(p.x, pivot.x - this.#minW);
      const top = Math.min(p.y, pivot.y - this.#minH);
      return new Rectangle(left, top, pivot.x - left, pivot.y - top);
    }
    if (handle === 'tr') {
      const right = Math.max(p.x, pivot.x + this.#minW);
      const top = Math.min(p.y, pivot.y - this.#minH);
      return new Rectangle(pivot.x, top, right - pivot.x, pivot.y - top);
    }
    if (handle === 'bl') {
      const left = Math.min(p.x, pivot.x - this.#minW);
      const bottom = Math.max(p.y, pivot.y + this.#minH);
      return new Rectangle(left, pivot.y, pivot.x - left, bottom - pivot.y);
    }
    if (handle === 'br') {
      const right = Math.max(p.x, pivot.x + this.#minW);
      const bottom = Math.max(p.y, pivot.y + this.#minH);
      return new Rectangle(pivot.x, pivot.y, right - pivot.x, bottom - pivot.y);
    }

    // Mid-point handles - scale in one dimension only
    const s = this.#opBounds;
    if (handle === 'ml') {
      const left = Math.min(p.x, pivot.x - this.#minW);
      return new Rectangle(left, s.y, pivot.x - left, s.height);
    }
    if (handle === 'mr') {
      const right = Math.max(p.x, pivot.x + this.#minW);
      return new Rectangle(pivot.x, s.y, right - pivot.x, s.height);
    }
    if (handle === 'mt') {
      const top = Math.min(p.y, pivot.y - this.#minH);
      return new Rectangle(s.x, top, s.width, pivot.y - top);
    }
    if (handle === 'mb') {
      const bottom = Math.max(p.y, pivot.y + this.#minH);
      return new Rectangle(s.x, pivot.y, s.width, bottom - pivot.y);
    }

    // Fallback (shouldn't reach here)
    return new Rectangle(pivot.x, pivot.y, this.#minW, this.#minH);
  }

  #deltaScale(pivotWorld: Point, angle: number, sx: number, sy: number) {
    return TMP.delta
      .identity()
      .translate(-pivotWorld.x, -pivotWorld.y)
      .rotate(-angle)
      .scale(sx, sy)
      .rotate(angle)
      .translate(pivotWorld.x, pivotWorld.y);
  }

  #deltaRotate(pivotWorld: Point, da: number) {
    return TMP.delta
      .identity()
      .translate(-pivotWorld.x, -pivotWorld.y)
      .rotate(da)
      .translate(pivotWorld.x, pivotWorld.y);
  }

  #applyWorldDelta(worldDelta: Matrix) {
    for (const c of this.group) {
      const start = this.#childStart.get(c);
      const parent = c.parent;
      if (!start || !parent) continue;
      const parentInv = parent.worldTransform.clone().invert();

      // Calculate Start Global Matrix
      // Pixi uses Row Vectors: v_world = v_local * M_local * M_parent ...
      // So World = Local * Parent
      // P.append(L) -> L * P
      const startWorld = parent.worldTransform.clone().append(start);

      // Apply Global Delta
      // NewGlobal = Global * Delta
      // D.append(G) -> G * D
      const newWorld = worldDelta.clone().append(startWorld);

      // Convert back to Local
      // NewLocal = NewGlobal * ParentInv
      // Inv.append(N) -> N * Inv
      const newLocal = parentInv.clone().append(newWorld);

      c.setFromMatrix(newLocal);
    }
  }
}
