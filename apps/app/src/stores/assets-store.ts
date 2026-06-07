import { create } from "zustand";

export interface ProjectFile {
  id: string;
  spaceId: string;
  name: string;
  type: "image" | "video" | "audio";
  src: string;
  thumbnailSrc?: string | null;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
  indexingStatus?: "pending" | "processing" | "completed" | "failed" | null;
  indexingProgress?: number | null;
  indexingStage?: string | null;
  indexingError?: string | null;
  uploadProgress?: number | null;
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

  setFiles: (files) =>
    set((state) => {
      // Preserve temp placeholders AND any real files that are mid-upload.
      // Without this, the 2-second polling refresh would overwrite the
      // in-memory uploadProgress state with the DB version (which has none).
      const inFlightIds = new Set(
        state.files
          .filter((f) => f.id.startsWith("temp_") || f.uploadProgress != null)
          .map((f) => f.id),
      );
      const inFlightFiles = state.files.filter((f) => inFlightIds.has(f.id));
      // Merge: DB files first (excluding in-flight), then in-flight files on top
      const dbFiles = files.filter((f) => !inFlightIds.has(f.id));
      return { files: [...dbFiles, ...inFlightFiles] };
    }),

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
