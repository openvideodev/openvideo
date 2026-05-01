import { createProjectStore } from "@openvideo/core";

// Create a singleton instance of the vanilla Zustand store
export const projectStore = createProjectStore({
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 30_000_000,
  }
});

// For debugging
if (typeof window !== "undefined") {
  (window as any).projectStore = projectStore;
}
