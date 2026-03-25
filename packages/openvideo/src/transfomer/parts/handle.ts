import {
  type FederatedPointerEvent,
  Graphics,
  type Point,
  Rectangle,
  Circle,
} from 'pixi.js';

export type Side = 'ml' | 'mr' | 'mt' | 'mb';
type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'rot';
export type HandleKind = Corner | Side;
interface Callbacks {
  beginDrag: (handle: HandleKind, start: Point) => void;
  updateDrag: (handle: HandleKind, pos: Point) => void;
  endDrag: () => void;
}

export class Handle extends Graphics {
  #isDragging = false;
  private handle: HandleKind;
  public cursor: string;
  private callbacks: Callbacks;

  constructor(handle: HandleKind, cursor: string, callbacks: Callbacks) {
    super();
    this.handle = handle;
    this.cursor = cursor;
    this.callbacks = callbacks;
    this.eventMode = 'static';
    this.#draw();

    this.on('pointerdown', this.#onDown);
    this.on('globalpointermove', this.#onMove);
    this.on('pointerup', this.#onUp);
    this.on('pointerupoutside', this.#onUp);
  }

  #draw() {
    this.clear();
    const primaryColor = 0x0284c7;

    if (this.handle === 'rot') {
      // Draw rotation handle (circle with arrow)
      this.circle(0, 0, 8);
      this.fill({ color: '#ffffff' });
      this.stroke({ width: 1, color: 0xcccccc }); // Light grey border

      // Draw arrow icon inside
      // Draw arrow icon inside
      // Simple circular arrow icon using lines
      this.moveTo(0, -4);
      this.arc(0, 0, 4, -Math.PI / 2, Math.PI, false); // Half circle
      this.stroke({ width: 1, color: 0x000000 });

      // Arrowhead
      // Arrowhead
      this.moveTo(0, -8);
      this.lineTo(-3, -5);
      this.lineTo(0, -2);
      this.stroke({ width: 1, color: 0x000000, cap: 'round', join: 'round' });

      this.hitArea = new Circle(0, 0, 24);
    } else if (['ml', 'mr', 'mt', 'mb'].includes(this.handle)) {
      // Draw pill shape for side handles
      const isVertical = this.handle === 'ml' || this.handle === 'mr';
      const width = isVertical ? 6 : 24;
      const height = isVertical ? 24 : 6;
      this.roundRect(-width / 2, -height / 2, width, height, 3);
      this.fill({ color: '#ffffff' });
      this.stroke({ width: 1, color: primaryColor });
      this.hitArea = new Rectangle(-15, -15, 30, 30);
    } else {
      // Draw centered rectangle (8x8) for resizing handles (corners)
      this.rect(-4, -4, 8, 8);
      this.fill({ color: '#ffffff' });
      this.stroke({ width: 1, color: primaryColor });
      // Hit area should be larger than visual representation for better UX
      this.hitArea = new Rectangle(-15, -15, 30, 30);
    }
  }

  #onDown = (e: FederatedPointerEvent) => {
    this.#isDragging = true;
    this.cursor = 'grabbing';
    this.callbacks.beginDrag(this.handle, e.global);
  };

  #onMove = (e: FederatedPointerEvent) => {
    if (!this.#isDragging) return;
    this.callbacks.updateDrag(this.handle, e.global);
  };

  #onUp = (_e: FederatedPointerEvent) => {
    if (!this.#isDragging) return;
    this.#isDragging = false;
    this.cursor = 'pointer';
    this.callbacks.endDrag();
  };
}
