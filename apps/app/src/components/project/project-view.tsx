"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { schema } from "@openvideo/db";

// Infer Space type from the Drizzle schema (matches what tRPC returns)
type Space = typeof schema.space.$inferSelect;
import {
  ArrowLeft,
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  Music,
  Plus,
  Trash2,
  RefreshCw,
  MoreHorizontalIcon,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDirector } from "@/hooks/use-director";
import { ChatPanel } from "@/components/shared/chat-panel";
import { ChatHeader } from "@/components/shared/chat-header";
import { useAssetsStore, type ProjectFile } from "@/stores/assets-store";

export default function ProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Space | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // tRPC mutations
  const deleteSpace = trpc.space.delete.useMutation();
  const updateSpace = trpc.space.update.useMutation();
  const createAsset = trpc.asset.create.useMutation();
  const deleteAsset = trpc.asset.delete.useMutation();
  const triggerAssetIndex = trpc.asset.triggerIndex.useMutation();

  const { messages: chatMessages, sendMessage, isThinking } = useDirector(project?.id ?? "");

  // Zustand store
  const files = useAssetsStore((state) => state.files);
  const isLoading = useAssetsStore((state) => state.isLoading);
  const isUploading = useAssetsStore((state) => state.isUploading);
  const setFiles = useAssetsStore((state) => state.setFiles);
  const addFiles = useAssetsStore((state) => state.addFiles);
  const updateFile = useAssetsStore((state) => state.updateFile);
  const removeFile = useAssetsStore((state) => state.removeFile);
  const setIsUploading = useAssetsStore((state) => state.setIsUploading);

  // tRPC asset queries - poll every 2 seconds when uploading/indexing
  const filesNeedUpdate = files.some(
    (f) => f.indexingStatus === "pending" || f.indexingStatus === "processing" || isUploading,
  );
  const { data: assetsData, refetch: refetchAssets } = trpc.asset.list.useQuery(
    { spaceId: project?.id ?? "" },
    {
      enabled: !!project?.id,
      refetchInterval: filesNeedUpdate ? 2000 : false,
    },
  );

  useEffect(() => {
    if (assetsData) {
      const projectFiles: ProjectFile[] = assetsData.map((asset: any) => ({
        id: asset.id,
        spaceId: asset.spaceId,
        name: asset.name,
        type: asset.type,
        src: asset.src,
        duration: asset.duration,
        size: asset.size,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        indexingStatus: asset.indexingStatus?.status ?? null,
      }));
      setFiles(projectFiles);
    }
  }, [assetsData, setFiles]);

  const { data: projectData, isLoading: isQueryLoading } = trpc.space.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  useEffect(() => {
    if (projectData) {
      setProject(projectData);
      setIsLoadingProject(false);
    }
  }, [projectData]);

  useEffect(() => {
    setIsLoadingProject(isQueryLoading);
  }, [isQueryLoading]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !project?.id) return;

    const spaceId = project.id;
    const fileArray = Array.from(uploadedFiles);

    // Create temporary file entries with uploading status
    const tempFiles: ProjectFile[] = fileArray.map((file) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spaceId,
      name: file.name,
      type: file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : "image",
      src: "",
      duration: undefined,
      size: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      indexingStatus: "processing" as const,
    }));

    // Add temp files to list immediately
    addFiles(tempFiles);
    setIsUploading(true);

    // Upload files in parallel, updating status individually
    const uploadPromises = fileArray.map(async (file, index) => {
      const tempId = tempFiles[index].id;

      try {
        // 1. Get R2 presigned URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "upload", fileNames: [file.name] }),
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploads } = await presignRes.json();
        const { presignedUrl, url } = uploads[0];

        // 2. Upload to R2
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`);

        // 3. Register asset via tRPC (returns generated id)
        const newAsset = await createAsset.mutateAsync({
          spaceId,
          name: file.name,
          type: tempFiles[index].type,
          src: url,
          size: file.size,
        });

        // 4. Indexing is already triggered by Director on asset registration
        // Replace temp file with real file (Director starts indexing automatically)
        updateFile(tempId, {
          id: newAsset.id,
          spaceId, // Ensure spaceId is preserved
          src: url,
          indexingStatus: "pending" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Mark as failed
        updateFile(tempId, { indexingStatus: "failed" });
        toast.error(`Failed to upload ${file.name}`);
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    event.target.value = "";
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      if (!project?.id) return;
      const file = files.find((f) => f.id === fileId);

      await Promise.all([
        deleteAsset.mutateAsync({ id: fileId, spaceId: project.id }),
        file?.src
          ? fetch("/api/uploads", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ src: file.src }),
            })
          : Promise.resolve(),
      ]);

      removeFile(fileId);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleResyncFile = async (fileId: string) => {
    if (!project?.id) return;
    try {
      await triggerAssetIndex.mutateAsync({ id: fileId, spaceId: project.id });
      toast.success("Resyncing file...");
      updateFile(fileId, { indexingStatus: "pending" });
    } catch (error) {
      console.error("Error resyncing file:", error);
      toast.error("Failed to resync file");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || isThinking) return;
    sendMessage(chatInput.trim());
    setChatInput("");
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "image":
        return ImageIcon;
      case "audio":
        return Music;
      default:
        return FileText;
    }
  };

  const projectName = project?.name ?? "Untitled Project";

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="h-14 flex items-center py-4 justify-between text-sm font-medium border-b sticky top-0 z-10 bg-card backdrop-blur-md">
        <div className="flex items-center justify-between p-4 w-full">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {!project ? <Skeleton className="h-4 w-32" /> : projectName}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRenameValue(project?.name ?? "");
                  setIsRenaming(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left: Assets Panel */}
        <div className="flex-1 flex flex-col border-r bg-card overflow-hidden min-w-0">
          <div className="h-12 border-b text-sm font-medium flex items-center justify-between px-4">
            <span>Assets ({files.length})</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isUploading || !project}
            >
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {!project || isLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-sm" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No assets yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload files
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
                  {files.map((file) => {
                    const Icon = getFileIcon(file.type);
                    const isImage = file.type === "image";
                    const isVideo = file.type === "video";
                    const showPreview =
                      (isImage || isVideo) && file.src && !file.id.startsWith("temp_");

                    return (
                      <div key={file.id} className="relative group cursor-pointer">
                        <div className="relative aspect-[4/3] rounded-sm overflow-hidden bg-muted border border-border/50 group-hover:border-foreground/20 transition-colors">
                          {showPreview ? (
                            isImage ? (
                              <img
                                src={file.src}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <video
                                src={file.src}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <Icon className="size-8 text-muted-foreground/50" />
                              {file.id.startsWith("temp_") ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5 animate-pulse"
                                >
                                  Uploading
                                </Badge>
                              ) : file.indexingStatus === "failed" ? (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
                                  Failed
                                </Badge>
                              ) : file.indexingStatus === "completed" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20"
                                >
                                  Ready
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5 animate-pulse"
                                >
                                  Indexing
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Indexing status overlay (on preview) */}
                          {showPreview &&
                            !file.id.startsWith("temp_") &&
                            file.indexingStatus !== "completed" && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                {file.indexingStatus === "failed" ? (
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

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                            <span className="text-white text-xs font-medium px-2 truncate">
                              {file.name}
                            </span>
                          </div>

                          {/* Type indicator */}
                          <div className="absolute bottom-1.5 left-1.5">
                            <div className="size-5 rounded bg-black/60 flex items-center justify-center">
                              <Icon className="size-3 text-white" />
                            </div>
                          </div>

                          {/* Menu button */}
                          {!file.id.startsWith("temp_") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white border-0 z-30"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontalIcon className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleResyncFile(file.id)}>
                                  <RefreshCw className="mr-2 size-4" />
                                  Resync
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          <Input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            accept="video/*,image/*,audio/*,.pdf,.txt,.doc,.docx"
            className="hidden"
          />
        </div>

        {/* Right: Workspace with Chat */}
        <div className="w-[480px] flex flex-col min-w-0 border-l bg-card">
          <ChatHeader isConnected={true} />
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              isThinking={isThinking}
              input={chatInput}
              onInputChange={setChatInput}
              onSend={handleSendMessage}
              placeholder="Ask, Search or Chat..."
              emptyState={
                <div className="p-6">
                  <div className="max-w-lg font-regular text-sm">
                    Fresh project — describe what you want to see, or let&apos;s brainstorm about
                    where to start.
                  </div>
                </div>
              }
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its files. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!project) return;
                setIsDeleting(true);
                try {
                  await deleteSpace.mutateAsync({ id: project.id });
                  toast.success("Project deleted");
                  router.push("/home");
                } catch {
                  toast.error("Failed to delete project");
                } finally {
                  setIsDeleting(false);
                  setDeleteDialogOpen(false);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={isRenaming} onOpenChange={setIsRenaming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename project</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Project name"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsRenaming(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!project || !renameValue.trim()) return;
                try {
                  const updated = await updateSpace.mutateAsync({
                    id: project.id,
                    name: renameValue.trim(),
                  });
                  setProject(updated);
                  toast.success("Project renamed");
                } catch {
                  toast.error("Failed to rename project");
                } finally {
                  setIsRenaming(false);
                }
              }}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
