import {
  Group,
  Rect,
  Path,
  IText,
  FabricObject,
  type GroupProps,
} from 'fabric';

export interface TransitionButtonProps extends Partial<GroupProps> {
  onClick?: () => void;
}

export class TransitionButton extends Group {
  static type = 'TransitionButton';
  public isTransitionButton = true;
  public isAlignmentAuxiliary = true; // To be cleaned up easily

  constructor(options: TransitionButtonProps = {}) {
    // 1. Tooltip (Top)
    const tooltipText = new IText('Agregar transición', {
      fontSize: 12,
      fill: 'white',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '500',
      originX: 'center',
      originY: 'center',
    });

    const tooltipBg = new Rect({
      width: tooltipText.width + 16,
      height: tooltipText.height + 8,
      fill: '#18181b', // dark gray
      rx: 6,
      ry: 6,
      originX: 'center',
      originY: 'center',
    });

    const tooltip = new Group([tooltipBg, tooltipText], {
      top: -30,
      originX: 'center',
      originY: 'center',
      canvas: options.canvas,
    });

    // 2. Button Body (Center)
    const buttonBg = new Rect({
      width: 24,
      height: 15,
      fill: 'white',
      rx: 4,
      ry: 4,
      originX: 'center',
      originY: 'center',
    });

    // Arrow Left Right icon (Lucide-like)
    // Path: M 8 3 L 4 7 L 8 11 M 4 7 H 20 M 16 21 L 20 17 L 16 13 M 20 17 H 4
    // Scaled to fit 24x24
    const arrowIcon = new Path(
      'M 16 7 L 11 12 L 16 17 M 11 12 H 30 M 24 28 L 29 23 L 24 18 M 29 23 H 13',
      {
        stroke: '#18181b',
        strokeWidth: 2,
        fill: 'transparent',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        originX: 'center',
        originY: 'center',
        scaleX: 0.6,
        scaleY: 0.6,
        top: 0,
        left: 0,
      }
    );

    const button = new Group([buttonBg, arrowIcon], {
      originX: 'center',
      originY: 'center',
      top: -10,
    });

    super([tooltip, button], {
      ...options,
      selectable: false,
      evented: true,
      hoverCursor: 'pointer',
    });

    this.on('mousedown', (e) => {
      if (options.onClick) {
        options.onClick();
      }
    });
  }
}
