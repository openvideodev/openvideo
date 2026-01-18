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

    // Set default styles for track background
    this.set({
      fill: '#1c1917', // Subtle background
      strokeWidth: 0,
      selectable: false, // Tracks shouldn't be draggable themselves, effectively 'background'
      hoverCursor: 'default',
    });
  }
}
