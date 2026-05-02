import { Graphics, type Rectangle } from 'pixi.js';

export class Wireframe extends Graphics {
  constructor() {
    super();
    this.eventMode = 'static';
    this.cursor = 'move';
  }

  draw(bounds: Rectangle, scale: number = 1) {
    const color = 0x0284c7;
    const thickness = 1.5 * scale;

    this.clear();
    this.setStrokeStyle({ width: thickness, color })
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke();

    this.hitArea = bounds;
  }
}
