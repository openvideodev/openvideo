import { TrackType } from '@/types/timeline';

export const TRACK_COLORS = {
  video: {
    solid: '#38396F', // bg-blue-500
    background: '',
    border: '',
  },
  image: {
    solid: '#38396F', // bg-blue-500
    background: '',
    border: '',
  },
  text: {
    solid: '#1D4C51',
    background: '#5DBAA0',
    border: '',
  },
  effect: {
    solid: '#511D34', // bg-red-500
    background: '#ef4444',
    border: '',
  },
  audio: {
    solid: '#16365F', // bg-green-500
    background: '#915DBE',
    border: '',
  },
  transition: {
    solid: '#EC4899', // bg-pink-500
    background: '#EC4899',
    border: '',
  },
} as const;

export const TRACK_HEIGHTS: Record<string, number> = {
  video: 40,
  image: 40,
  placeholder: 40,
  text: 32,
  effect: 32,
  audio: 32,
  transition: 40,
} as const;

export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60,
  DEFAULT_TEXT_DURATION: 5,
  DEFAULT_IMAGE_DURATION: 5,
} as const;

export function getTrackHeight(type: TrackType): number {
  return TRACK_HEIGHTS[type.toLowerCase()] || 40;
}
