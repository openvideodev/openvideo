import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CanvasSize } from "@/types/editor";

interface ProjectState {
  canvasSize: CanvasSize;
  aspectRatio: string;
  fps: number;
  setCanvasSize: (size: CanvasSize, aspectRatio: string) => void;
  setFps: (fps: number) => void;
}

export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 1080, height: 1920 };
export const DEFAULT_ASPECT_RATIO = "9:16";
export const DEFAULT_FPS = 30;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      canvasSize: DEFAULT_CANVAS_SIZE,
      aspectRatio: DEFAULT_ASPECT_RATIO,
      fps: DEFAULT_FPS,
      setCanvasSize: (canvasSize, aspectRatio) =>
        set({ canvasSize, aspectRatio }),
      setFps: (fps) => set({ fps }),
    }),
    {
      name: "openvideo-project-storage",
    },
  ),
);
