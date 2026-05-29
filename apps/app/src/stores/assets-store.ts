import { create } from "zustand";

export interface ProjectFile {
  id: string;
  spaceId: string;
  name: string;
  type: "image" | "video" | "audio";
  src: string;
  duration?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
  indexingStatus?: "pending" | "processing" | "completed" | "failed" | null;
}

interface AssetsState {
  files: ProjectFile[];
  isLoading: boolean;
  isUploading: boolean;

  // Actions
  setFiles: (files: ProjectFile[]) => void;
  addFiles: (files: ProjectFile[]) => void;
  updateFile: (id: string, updates: Partial<ProjectFile>) => void;
  removeFile: (id: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsUploading: (uploading: boolean) => void;

  // Getters
  getFileById: (id: string) => ProjectFile | undefined;
  getFilesByStatus: (status: ProjectFile["indexingStatus"]) => ProjectFile[];
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  files: [],
  isLoading: false,
  isUploading: false,

  setFiles: (files) => set({ files }),

  addFiles: (newFiles) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
    })),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),

  setIsLoading: (isLoading) => set({ isLoading }),
  setIsUploading: (isUploading) => set({ isUploading }),

  getFileById: (id) => get().files.find((f) => f.id === id),
  getFilesByStatus: (status) => get().files.filter((f) => f.indexingStatus === status),
}));
