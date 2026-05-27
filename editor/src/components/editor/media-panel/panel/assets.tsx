"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/stores/studio-store";
import { core } from "@/lib/project";
import {
  Upload,
  Search,
  Trash2,
  Music,
  Loader2,
  Image as ImageIcon,
  Film,
  Info,
  ListFilter,
  Sparkles,
  Plus,
} from "lucide-react";
import { storageService } from "@/lib/storage/storage-service";
import type { MediaType } from "@/types/media";
import { uploadFile } from "@/lib/upload-utils";
import { getOpenVideoClient } from "@/lib/openvideo-client";
import Draggable from "@/components/shared/draggable";
import { useGeneratorModalStore } from "@/stores/generator-modal-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/project-store";
import { useAssetsStore, type ProjectFile } from "@/stores/assets-store";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualAsset {
  id: string;
  type: MediaType;
  src: string;
  name: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  indexingStatus?: "pending" | "processing" | "completed" | "failed" | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFileType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext))
    return "audio";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
    return "video";
  return "image";
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

async function getMediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const type = file.type.toLowerCase();
    if (type.startsWith("audio/")) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
      audio.onerror = () => resolve(undefined);
    } else if (type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(undefined);
    } else {
      resolve(undefined);
    }
  });
}

function buildDraggableData(asset: VisualAsset) {
  const typeMap: Record<MediaType, string> = { image: "Image", video: "Video", audio: "Audio" };
  return {
    type: typeMap[asset.type],
    src: asset.src,
    name: asset.name,
    ...(asset.width && { width: asset.width }),
    ...(asset.height && { height: asset.height }),
    ...(asset.duration && { duration: asset.duration * 1e6 }),
  };
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onAdd,
  onDelete,
}: {
  asset: VisualAsset;
  onAdd: (asset: VisualAsset) => void;
  onDelete: (id: string) => void;
}) {
  const { studio } = useStudioStore();
  const draggableData = buildDraggableData(asset);
  const isInUse = studio?.clips?.some((clip: any) => clip.src === asset.src);

  const preview =
    asset.type === "image" ? (
      <div className="w-20 aspect-square rounded-md overflow-hidden shadow-xl border-2 border-primary">
        <img src={asset.src} className="w-full h-full object-cover" />
      </div>
    ) : asset.type === "video" ? (
      <div className="w-20 aspect-video rounded-md overflow-hidden shadow-xl border-2 border-primary bg-background">
        <video src={asset.src} className="w-full h-full object-cover" muted />
      </div>
    ) : (
      <div className="w-20 aspect-square rounded-md overflow-hidden shadow-xl border-2 border-primary bg-secondary flex items-center justify-center">
        <Music size={24} className="text-primary" />
      </div>
    );

  const isTemp = asset.id.startsWith("temp_");
  const showPreview = (asset.type === "image" || asset.type === "video") && asset.src && !isTemp;

  return (
    <Draggable data={draggableData} renderCustomPreview={preview}>
      <div
        className="flex flex-col gap-1.5 group cursor-pointer"
        onClick={() => !isTemp && onAdd(asset)}
      >
        <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/30 border border-border/40 group-hover:border-border transition-all flex items-center justify-center">
          {/* Media Type Icon (Top Left) */}
          <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-background/70 backdrop-blur-md text-foreground flex items-center justify-center pointer-events-none z-10">
            {asset.type === "image" && <ImageIcon size={11} strokeWidth={2.5} />}
            {asset.type === "video" && <Film size={11} strokeWidth={2.5} />}
            {asset.type === "audio" && <Music size={11} strokeWidth={2.5} />}
          </div>

          {/* In Use Badge (Top Right) */}
          {isInUse && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-[9px] text-primary-foreground font-semibold z-10">
              In Use
            </div>
          )}

          {showPreview ? (
            asset.type === "image" ? (
              <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background/60">
                <video
                  src={asset.src}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                  onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLVideoElement).pause();
                    (e.currentTarget as HTMLVideoElement).currentTime = 0;
                  }}
                />
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/40 relative gap-1.5">
              {asset.type === "audio" && !isTemp && (
                <div className="flex items-center gap-0.5 h-8 px-2 opacity-60">
                  <span className="w-[1.5px] h-2 bg-foreground/40 rounded-full" />
                  <span className="w-[1.5px] h-4 bg-foreground/40 rounded-full" />
                  <span className="w-[1.5px] h-6 bg-foreground/60 rounded-full" />
                  <span className="w-[1.5px] h-3 bg-foreground/50 rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/70 rounded-full" />
                  <span className="w-[1.5px] h-7 bg-foreground rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/80 rounded-full" />
                  <span className="w-[1.5px] h-6 bg-foreground/60 rounded-full" />
                  <span className="w-[1.5px] h-4 bg-foreground/50 rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/70 rounded-full" />
                  <span className="w-[1.5px] h-2 bg-foreground/40 rounded-full" />
                </div>
              )}

              {isTemp ? (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 animate-pulse bg-background/80"
                >
                  Uploading
                </Badge>
              ) : asset.indexingStatus === "failed" ? (
                <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
                  Failed
                </Badge>
              ) : asset.indexingStatus === "completed" ? (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20"
                >
                  Ready
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 animate-pulse bg-background/80"
                >
                  Indexing
                </Badge>
              )}
            </div>
          )}

          {/* Indexing status overlay (on preview) */}
          {showPreview && asset.indexingStatus !== "completed" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              {asset.indexingStatus === "failed" ? (
                <Badge variant="destructive" className="text-[9px] h-5 px-2">
                  Failed
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[9px] h-5 px-2 bg-black/50 text-white border-white/30 animate-pulse"
                >
                  Indexing
                </Badge>
              )}
            </div>
          )}

          {/* Duration Badge & Info Button */}
          {(asset.type === "video" || asset.type === "audio") && asset.duration && (
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-10">
              <span className="px-1.5 py-0.5 rounded-md bg-background/70 backdrop-blur-md text-[9px] text-foreground font-semibold">
                {formatDuration(asset.duration)}
              </span>
              {asset.type === "audio" && (
                <span className="p-0.5 rounded-md bg-background/70 backdrop-blur-md text-foreground flex items-center justify-center">
                  <Info size={9} className="opacity-80" />
                </span>
              )}
            </div>
          )}

          {!isTemp && (
            <button
              type="button"
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-background/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(asset.id);
              }}
            >
              <Trash2 size={12} className="text-foreground" />
            </button>
          )}
        </div>
      </div>
    </Draggable>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function PanelAssets() {
  const spaceId = useProjectStore((state) => state.spaceId);
  const files = useAssetsStore((state) => state.files);
  const setFiles = useAssetsStore((state) => state.setFiles);
  const addFiles = useAssetsStore((state) => state.addFiles);
  const updateFile = useAssetsStore((state) => state.updateFile);
  const removeFile = useAssetsStore((state) => state.removeFile);
  const isAssetsStoreLoading = useAssetsStore((state) => state.isLoading);
  const setAssetsStoreLoading = useAssetsStore((state) => state.setIsLoading);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openGenerator = useGeneratorModalStore((state) => state.open);

  const loadStorageStats = useCallback(async () => {
    await storageService.getStorageStats();
  }, []);

  const loadFiles = useCallback(async () => {
    if (!spaceId) return;
    try {
      setAssetsStoreLoading(true);
      const openVideo = getOpenVideoClient();
      const assets = await openVideo.assets.list({ spaceId });

      const projectFiles: ProjectFile[] = assets.map((asset: any) => ({
        id: asset.id,
        spaceId: asset.spaceId || spaceId,
        name: asset.name,
        type: asset.type as any,
        src: asset.src,
        duration: asset.duration,
        size: asset.size,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        indexingStatus: asset.indexing?.status ?? null,
      }));

      setFiles(projectFiles);
      await loadStorageStats();
    } catch (error) {
      console.error("Error loading files in PanelAssets:", error);
    } finally {
      setAssetsStoreLoading(false);
      setIsLoaded(true);
    }
  }, [spaceId, setFiles, setAssetsStoreLoading, loadStorageStats]);

  // Load uploads on mount and when spaceId becomes available
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Real-time polling for indexing status of in-flight files
  useEffect(() => {
    const inFlight = files.filter(
      (f) =>
        !f.id.startsWith("temp_") &&
        (f.indexingStatus === "pending" || f.indexingStatus === "processing"),
    );
    if (inFlight.length === 0) return;

    const validFiles = inFlight.filter((f) => f.spaceId);
    if (validFiles.length === 0) return;

    const openVideo = getOpenVideoClient();
    const timer = setTimeout(async () => {
      try {
        const statuses = await Promise.all(
          validFiles.map((f) =>
            openVideo.assets
              .getIndexStatus({ spaceId: f.spaceId, assetId: f.id })
              .catch(() => null),
          ),
        );
        validFiles.forEach((f, idx) => {
          if (statuses[idx]?.status) {
            updateFile(f.id, { indexingStatus: statuses[idx].status });
          }
        });
      } catch {
        // silently skip — next tick will retry
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [files, updateFile]);

  // Listen to asset generation event to refresh list
  useEffect(() => {
    const handleAssetGenerated = () => {
      loadFiles();
    };
    window.addEventListener("asset-generated", handleAssetGenerated);
    return () => {
      window.removeEventListener("asset-generated", handleAssetGenerated);
    };
  }, [loadFiles]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !spaceId) return;
    setIsUploading(true);

    const fileArray = Array.from(uploadedFiles);

    // Create temporary file entries with uploading status
    const tempFiles: ProjectFile[] = fileArray.map((file) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spaceId,
      name: file.name,
      type: detectFileType(file),
      src: "",
      duration: undefined,
      size: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      indexingStatus: "processing" as const,
    }));

    addFiles(tempFiles);

    const openVideo = getOpenVideoClient();

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        const tempId = tempFiles[index].id;
        const type = tempFiles[index].type;

        try {
          // 1. Upload to R2 using the utility
          const uploadResult = await uploadFile(file);
          const src = uploadResult?.url || URL.createObjectURL(file);
          const duration = await getMediaDuration(file);

          if (storageService.isOPFSSupported()) {
            const mediaFile = { id: tempId, file, name: file.name, type, url: src, duration };
            await storageService.saveMediaFile({ projectId: spaceId, mediaItem: mediaFile });
          }

          const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // 2. Register asset with OpenVideo using actual spaceId
          if (uploadResult?.url) {
            await openVideo.assets.register({
              spaceId,
              id: fileId,
              name: file.name,
              type,
              src: uploadResult.url,
              duration,
              size: file.size,
            });
          }

          // 3. Update Zustand with real file
          updateFile(tempId, {
            id: fileId,
            src,
            duration,
            indexingStatus: "pending" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          updateFile(tempId, { indexingStatus: "failed" });
        }
      });

      await Promise.all(uploadPromises);
      await loadStorageStats();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!spaceId) return;
    try {
      const file = files.find((f) => f.id === id);
      const openVideo = getOpenVideoClient();

      await Promise.all([
        openVideo.assets.delete({ spaceId, assetId: id }),
        file?.src && !file.src.startsWith("blob:")
          ? fetch("/api/uploads", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ src: file.src }),
            })
          : Promise.resolve(),
        storageService.isOPFSSupported()
          ? storageService.deleteMediaFile({ projectId: spaceId, id }).catch(() => null)
          : Promise.resolve(),
      ]);

      removeFile(id);
      await loadStorageStats();
    } catch (error) {
      console.error("Failed to delete upload:", error);
    }
  };

  // Add item to canvas on click
  const addItemToCanvas = async (asset: VisualAsset) => {
    try {
      const typeMap: Record<MediaType, string> = { image: "Image", video: "Video", audio: "Audio" };
      await core.clip.add(
        { type: typeMap[asset.type] as any, src: asset.src, name: asset.name },
        { objectFit: "contain" },
      );
    } catch (error) {
      console.error("Failed to add clip:", error);
    }
  };

  // Map Zustand files to VisualAsset interface for rendering compatibility
  const mappedAssets: VisualAsset[] = files.map((f) => ({
    id: f.id,
    type: f.type,
    src: f.src,
    name: f.name,
    duration: f.duration,
    size: f.size,
    indexingStatus: f.indexingStatus,
  }));

  const filteredAssets = mappedAssets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || a.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!isLoaded || isAssetsStoreLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* ── Uploads area (scrollable) ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {files.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 text-muted-foreground">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1.5">No Assets Yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[210px] mb-5">
              Get started by uploading your own files or generating new ones using AI.
            </p>
            <div className="flex flex-col w-full max-w-[200px] gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-center h-10 bg-secondary/30 hover:bg-secondary/60 text-foreground text-[13px] font-medium rounded-xl border-0 shadow-none transition-colors"
              >
                Upload a file
              </Button>
              <Button
                onClick={() => openGenerator()}
                className="w-full justify-center h-10 bg-secondary/30 hover:bg-secondary/60 text-foreground text-[13px] font-medium rounded-xl border-0 shadow-none transition-colors"
              >
                Generate with AI
              </Button>
            </div>
          </div>
        ) : (
          /* With assets: search + grid */
          <>
            <div className="px-4 pt-3 pb-3">
              <div className="flex items-center gap-2 w-full">
                {/* Plus Menu (Upload & Generate) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 shrink-0 bg-transparent hover:bg-secondary/50 border-border text-foreground rounded-xl transition-colors flex items-center justify-center"
                    >
                      {isUploading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Plus size={16} strokeWidth={2.5} />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="bg-popover text-popover-foreground border-border rounded-xl w-40"
                  >
                    <DropdownMenuItem
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="gap-2 px-3 py-2 text-[13px] font-medium hover:bg-secondary/50 rounded-lg cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>Upload a file</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openGenerator()}
                      className="gap-2 px-3 py-2 text-[13px] font-medium hover:bg-secondary/50 rounded-lg cursor-pointer text-primary"
                    >
                      <Sparkles size={14} />
                      <span>Generate with AI</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    placeholder="Search..."
                    className="w-full h-8 pl-9 pr-3 text-[13px] bg-secondary/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 shrink-0 bg-secondary/30 hover:bg-secondary/60 border-border text-foreground flex items-center justify-center rounded-xl transition-colors"
                    >
                      <ListFilter size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="border-border bg-popover text-popover-foreground rounded-xl w-36"
                  >
                    {[
                      { value: "all", label: "All Assets" },
                      { value: "image", label: "Images" },
                      { value: "video", label: "Videos" },
                      { value: "audio", label: "Audio" },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setFilterType(option.value as any)}
                        className="flex items-center justify-between px-3 py-2 text-[13px] font-medium hover:bg-secondary/50 rounded-lg cursor-pointer"
                      >
                        <span>{option.label}</span>
                        {filterType === option.value && (
                          <div className="size-1.5 rounded-full bg-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <ImageIcon size={28} className="opacity-40" />
                  <span className="text-xs">No matches found.</span>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 pb-4">
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onAdd={addItemToCanvas}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
