"use client";

import { useState, useCallback } from "react";
import { useAssetsStore, type ProjectFile } from "@/stores/assets-store";
import { trpc } from "@/lib/trpc";
import { getPresignedConfig, uploadFileWithConfig } from "@/lib/upload-utils";
import { generateThumbnail } from "@/lib/thumbnail-generator";
import { analyzeVideo } from "@/lib/video-analysis";

export type MediaType = "image" | "video" | "audio";

interface UploadResult {
  success: boolean;
  fileName: string;
  error?: string;
}

interface UseAssetUploadOptions {
  spaceId: string | null;
  onComplete?: () => void;
}

export function useAssetUpload({ spaceId, onComplete }: UseAssetUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const { addFiles, updateFile } = useAssetsStore();

  const utils = trpc.useUtils();
  const createAsset = trpc.asset.create.useMutation();

  const detectFileType = (file: File): MediaType => {
    const mime = file.type.toLowerCase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext))
      return "audio";
    if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
      return "video";
    return "image";
  };

  const createTempFile = (file: File, spaceId: string): ProjectFile => ({
    id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    spaceId,
    name: file.name,
    type: detectFileType(file),
    src: "",
    duration: undefined,
    size: file.size,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    indexingStatus: null,
    uploadProgress: 0,
  });

  const processFile = async (file: File, tempId: string): Promise<UploadResult> => {
    const type = detectFileType(file);
    let currentId = tempId;

    try {
      // Step 1: Analyze + thumbnail + presign in parallel
      const [videoInfo, thumbnailBlob, uploadConfig] = await Promise.all([
        type === "video" ? analyzeVideo(file) : Promise.resolve(undefined),
        generateThumbnail(file).catch(() => null),
        getPresignedConfig(file.name),
      ]);

      // Step 2: Presign thumbnail if generated
      let thumbnailUploadConfig: Awaited<ReturnType<typeof getPresignedConfig>> | null = null;
      if (thumbnailBlob) {
        const thumbName = `thumb_${file.name.replace(/\.[^.]+$/, "")}.webp`;
        thumbnailUploadConfig = await getPresignedConfig(thumbName).catch(() => null);
      }

      // Step 3: Create asset in DB
      const newAsset = await createAsset.mutateAsync({
        spaceId: spaceId!,
        name: file.name,
        type,
        src: uploadConfig.url,
        thumbnailSrc: thumbnailUploadConfig?.url,
        duration: videoInfo?.duration,
        size: file.size,
        width: videoInfo?.width,
        height: videoInfo?.height,
        fps: videoInfo?.estimatedFps,
        autoIndex: true, // Enable workflow processing (conform + index)
      });

      // Step 4: Update temp file with real ID
      currentId = newAsset.id;
      updateFile(tempId, {
        id: newAsset.id,
        src: uploadConfig.url,
        thumbnailSrc: thumbnailUploadConfig?.url ?? null,
        duration: videoInfo?.duration,
        width: videoInfo?.width,
        height: videoInfo?.height,
        uploadProgress: 0,
        indexingStatus: null,
        indexingStage: null,
        indexingProgress: null,
        indexingError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Step 5: Upload file + thumbnail to R2
      await Promise.all([
        uploadFileWithConfig(file, uploadConfig, (progress) => {
          updateFile(newAsset.id, { uploadProgress: progress });
        }),
        thumbnailBlob && thumbnailUploadConfig
          ? uploadFileWithConfig(
              new File([thumbnailBlob], "thumbnail.webp", { type: "image/webp" }),
              thumbnailUploadConfig,
            ).catch(() => null)
          : Promise.resolve(),
      ]);

      // Step 6: Clear progress - workflow will handle conform + index
      updateFile(newAsset.id, {
        uploadProgress: null,
        indexingStatus: "pending", // Workflow will update this
      });

      return { success: true, fileName: file.name };
    } catch (error: any) {
      console.error(`[Upload] Failed for ${file.name}:`, error);
      updateFile(currentId, { uploadProgress: null, indexingStatus: "failed" });
      return { success: false, fileName: file.name, error: error.message };
    }
  };

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !spaceId) return;

      setIsUploading(true);
      const fileArray = Array.from(files);

      // Create temp entries
      const tempFiles = fileArray.map((file) => createTempFile(file, spaceId));
      addFiles(tempFiles);

      // Process all files
      const results = await Promise.all(
        fileArray.map((file, index) => processFile(file, tempFiles[index].id)),
      );

      // Invalidate cache
      utils.asset.list.invalidate({ spaceId });

      setIsUploading(false);
      onComplete?.();

      return results;
    },
    [spaceId, addFiles, updateFile, createAsset, utils, onComplete],
  );

  return { uploadFiles, isUploading };
}
