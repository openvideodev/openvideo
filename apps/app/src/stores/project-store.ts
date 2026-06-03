import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CanvasSize } from "@/types/editor";

interface ProjectState {
  canvasSize: CanvasSize;
  aspectRatio: string;
  fps: number;
  initialStudioJSON: any | null;
  projectName: string;
  projectId: string | null;
  spaceId: string | null;
  setProjectName: (name: string) => void;
  setCanvasSize: (size: CanvasSize, aspectRatio: string) => void;
  setFps: (fps: number) => void;
  setInitialStudioJSON: (json: any | null) => void;
  setProjectId: (projectId: string | null) => void;
  setSpaceId: (spaceId: string | null) => void;
  /** Reset all session-specific state to defaults. Call when navigating to a new/empty project. */
  resetProject: () => void;
}

export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 1080, height: 1920 };
export const DEFAULT_ASPECT_RATIO = "9:16";
export const DEFAULT_FPS = 30;

const DEFAULT_STATE = {
  canvasSize: DEFAULT_CANVAS_SIZE,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  fps: DEFAULT_FPS,
  initialStudioJSON: null,
  projectName: "Untitled video",
  projectId: null,
  spaceId: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setProjectName: (projectName) => set({ projectName }),
      setCanvasSize: (canvasSize, aspectRatio) => set({ canvasSize, aspectRatio }),
      setFps: (fps) => set({ fps }),
      setInitialStudioJSON: (initialStudioJSON) => set({ initialStudioJSON }),
      setProjectId: (projectId) => set({ projectId }),
      setSpaceId: (spaceId) => set({ spaceId }),
      resetProject: () => set(DEFAULT_STATE),
    }),
    {
      name: "openvideo-project-storage",
      version: 1,
      // Never persist transient/session-specific fields
      partialize: (state) => ({
        canvasSize: state.canvasSize,
        aspectRatio: state.aspectRatio,
        fps: state.fps,
      }),
      migrate: (persistedState: any, version: number) => {
        return persistedState as ProjectState;
      },
    },
  ),
);
