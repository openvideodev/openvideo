import { create } from "zustand";
import type { schema } from "@openvideo/db";

// Infer Space type from the Drizzle schema (matches what tRPC returns)
type Space = typeof schema.space.$inferSelect;

interface ProjectsState {
  projects: Space[];
  isLoading: boolean;
  isCreating: boolean;

  // Actions
  setProjects: (projects: Space[]) => void;
  addProject: (project: Space) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Pick<Space, "name" | "description">>) => void;
  setIsLoading: (loading: boolean) => void;
  setIsCreating: (creating: boolean) => void;

  // Getters
  getProjectById: (id: string) => Space | undefined;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  isCreating: false,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p,
      ),
    })),

  setIsLoading: (isLoading) => set({ isLoading }),
  setIsCreating: (isCreating) => set({ isCreating }),

  getProjectById: (id) => get().projects.find((p) => p.id === id),
}));
