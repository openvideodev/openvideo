import { Rect, RectProps } from 'fabric';
import { TrackType } from '@/types/timeline';

export interface TrackProps extends Partial<RectProps> {
  trackType: TrackType;
  trackId: string;
}

export class Track extends Rect {
  trackType: TrackType;
  trackId: string;

  constructor(options: TrackProps) {
    super(options);
    this.trackType = options.trackType;
    this.trackId = options.trackId;

    this.set({
      fill: '#202020',
      strokeWidth: 0,
      selectable: false,
      hoverCursor: 'default',
    });
  }
}
