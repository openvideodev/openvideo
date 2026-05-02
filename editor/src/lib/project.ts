import { Core } from '@openvideo/core';

export const core = new Core({
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 30_000_000,
  },
});

// Legacy alias — remove once all consumers migrate
export const engine = core;
export const projectStore = core.store;
export const playbackController = core.playback;

if (typeof window !== 'undefined') {
  (window as any).core = core;
  // Keep legacy global for gradual migration
  (window as any).engine = core;
}
