import { CoreEngine } from "@openvideo/core";

export const engine = new CoreEngine({
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 30_000_000,
  }
});

export const projectStore = engine.store;
export const playbackController = engine.playback;

if (typeof window !== "undefined") {
  (window as any).engine = engine;
}
