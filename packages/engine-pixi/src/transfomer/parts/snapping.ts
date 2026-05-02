import type { Point, Rectangle } from 'pixi.js';

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  // The line segment to draw to visualize the snap
  start: number;
  end: number;
}

export interface SnapResult {
  x: number | null; // null if no snap
  y: number | null; // null if no snap
  guides: SnapGuide[];
}

export class SnappingManager {
  static SNAP_THRESHOLD = 5;

  constructor(
    private artboardWidth: number,
    private artboardHeight: number,
    private scale: number = 1
  ) {}

  updateContext(width: number, height: number, scale: number) {
    this.artboardWidth = width;
    this.artboardHeight = height;
    this.scale = scale;
  }

  /**
   * Snap a rectangle (bounds of the object) to artboard edges and center.
   * returns delta (adjustment) needed for x and y
   */
  snapMove(
    current: Rectangle
    // Optional: future support for snapping to other objects could pass them here
  ): { dx: number; dy: number; guides: SnapGuide[] } {
    const guides: SnapGuide[] = [];
    let dx = 0;
    let dy = 0;

    const threshold = SnappingManager.SNAP_THRESHOLD / this.scale;

    // X Axis Snapping

    // Targets: Center (W/2), Left (0), Right (W) - Center prioritized
    const targetsX = [
      { value: this.artboardWidth / 2, label: 'center' },
      { value: 0, label: 'start' },
      { value: this.artboardWidth, label: 'end' },
    ];

    // Points on object: Left, Center, Right
    const objectPointsX = [
      { value: current.x, type: 'start' },
      { value: current.x + current.width / 2, type: 'center' },
      { value: current.x + current.width, type: 'end' },
    ];

    let snappedX = false;

    // Check for closest snap
    for (const target of targetsX) {
      if (snappedX) break;
      for (const objP of objectPointsX) {
        const diff = target.value - objP.value;
        if (Math.abs(diff) < threshold) {
          dx = diff;
          snappedX = true;

          guides.push({
            type: 'vertical',
            position: target.value,
            // Guide length: encompass both object and artboard height usually,
            // or just min/max of the two
            start: Math.min(0, current.y),
            end: Math.max(this.artboardHeight, current.y + current.height),
          });
          break;
        }
      }
    }

    // Y Axis Snapping
    const targetsY = [
      { value: this.artboardHeight / 2, label: 'center' },
      { value: 0, label: 'start' },
      { value: this.artboardHeight, label: 'end' },
    ];

    const objectPointsY = [
      { value: current.y, type: 'start' },
      { value: current.y + current.height / 2, type: 'center' },
      { value: current.y + current.height, type: 'end' },
    ];

    let snappedY = false;

    for (const target of targetsY) {
      if (snappedY) break;
      for (const objP of objectPointsY) {
        const diff = target.value - objP.value;
        if (Math.abs(diff) < threshold) {
          dy = diff;
          snappedY = true;

          guides.push({
            type: 'horizontal',
            position: target.value,
            start: Math.min(0, current.x),
            end: Math.max(this.artboardWidth, current.x + current.width),
          });
          break;
        }
      }
    }

    return { dx, dy, guides };
  }

  /**
   * Snap during scaling
   * For now, simplistic implementation: snap the edges being moved.
   */
  snapResize(proposed: Rectangle): {
    corrected: Rectangle;
    guides: SnapGuide[];
  } {
    // This is complex because changing one edge might change aspect ratio if constrained.
    // For now, let's just use snapMove's logic but applied to the edges?
    // Or simpler: Snap the resulting bounds to the grid?

    // Basic implementation: Snap the PROPOSED bounds' edges to targets.
    // If aspect ratio is locked, this might be tricky (one snap forces the other).
    // Let's assume aspect ratio is NOT locked for the main snap calculation,
    // or apply snapping to the "primary" direction of drag if we knew it.

    // Actually, just checking if edges land near snap targets is a good start.

    const rect = proposed.clone();
    const { dx, dy, guides } = this.snapMove(rect);

    // Apply snap to the rect
    // WARNING: Just moving the rect (dx, dy) might move the fixed anchor point!
    // During resize, one side is fixed. We should only snap the moving sides.

    // Better approach for resize:
    // We need to know which edges are moving.
    // But for MVP, let's just see if we can snap the *resulting* box's edges to the grid.

    rect.x += dx;
    rect.y += dy;

    return { corrected: rect, guides };
  }

  // Specialized resize snap that checks individual edges
  snapPoint(point: Point): { p: Point; guides: SnapGuide[] } {
    const threshold = SnappingManager.SNAP_THRESHOLD / this.scale;

    const guides: SnapGuide[] = [];
    const res = point.clone();

    // X
    const targetsX = [0, this.artboardWidth / 2, this.artboardWidth];
    for (const tx of targetsX) {
      if (Math.abs(tx - point.x) < threshold) {
        res.x = tx;
        guides.push({
          type: 'vertical',
          position: tx,
          start: 0, // Simplified
          end: this.artboardHeight,
        });
        break;
      }
    }

    // Y
    const targetsY = [0, this.artboardHeight / 2, this.artboardHeight];
    for (const ty of targetsY) {
      if (Math.abs(ty - point.y) < threshold) {
        res.y = ty;
        guides.push({
          type: 'horizontal',
          position: ty,
          start: 0,
          end: this.artboardWidth,
        });
        break;
      }
    }

    return { p: res, guides };
  }
}
