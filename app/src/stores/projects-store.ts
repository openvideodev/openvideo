import { create } from "zustand";
import type { Project } from "@/lib/projects-storage";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  isCreating: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Pick<Project, "name" | "description">>) => void;
  setIsLoading: (loading: boolean) => void;
  setIsCreating: (creating: boolean) => void;

  // Getters
  getProjectById: (id: string) => Project | undefined;
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
