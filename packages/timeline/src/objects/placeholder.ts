import { FabricObject, Rect, RectProps, classRegistry } from 'fabric';
import {
  ACTIVE_SELECTION_COLOR,
  ACTIVE_SELECTION_WIDTH,
} from '../constants/objects';

interface PlaceholderProps
  extends Pick<RectProps, 'width' | 'height' | 'top' | 'left'> {
  id: string;
}

class Placeholder extends Rect {
  static type = 'Placeholder';
  public guideItemId?: string;
  public distXToActCenter?: number;
  public trackItemType?: string;
  public defaultPos?: { x: number; y: number };
  public draggedObject: FabricObject;
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Placeholder.ownDefaults,
    };
  }

  static ownDefaults = {
    rx: 6,
    ry: 6,
    objectCaching: false,
    borderColor: 'transparent',
    strokeWidth: 0,
    fill: 'rgba(255, 211, 42,0.1)',
    stroke: 'rgba(255, 211, 42,1.0)',
    selectable: false,
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
    strokeDashArray: [5, 1],
    evented: false,
  };

  constructor(props: PlaceholderProps) {
    super(props);
    Object.assign(this, Placeholder.ownDefaults);
    this.id = props.id;
  }
  // add custom text to the track item
  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      this.rx
    );
    ctx.lineWidth = ACTIVE_SELECTION_WIDTH;
    ctx.setLineDash(this.strokeDashArray as any); // Set the dash pattern
    ctx.strokeStyle = ACTIVE_SELECTION_COLOR;
    ctx.stroke();
    ctx.restore();
  }
}

classRegistry.setClass(Placeholder, 'Placeholder');

export default Placeholder;
