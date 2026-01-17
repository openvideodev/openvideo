'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import {
  Image,
  Video,
  Audio,
  Log,
  clipToJSON,
  type IClip as StudioClip,
} from '@designcombo/video';
import {
  Upload,
  Film,
  Search,
  X,
  HardDrive,
  Trash2,
  Music,
} from 'lucide-react';
import {
  storageService,
  type StorageStats,
} from '@/lib/storage/storage-service';
import type { MediaFile, MediaType } from '@/types/media';

interface VisualAsset {
  id: string;
  type: MediaType;
  src: string;
  name: string;
  preview?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

const STORAGE_KEY = 'designcombo_uploads';
const PROJECT_ID = 'local-uploads';

// Detect file type from MIME type and extension
function detectFileType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)
  ) {
    return 'audio';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)
  ) {
    return 'video';
  }
  return 'image';
}

// Replace old blob URLs with new ones in serialized clips
function replaceUrlsInClips<T>(
  clips: T[],
  urlMapping: Record<string, string>
): T[] {
  const json = JSON.stringify(clips);
  let updated = json;
  for (const [oldUrl, newUrl] of Object.entries(urlMapping)) {
    updated = updated.split(oldUrl).join(newUrl);
  }
  return JSON.parse(updated);
}

// Asset card component
function AssetCard({
  asset,
  onAdd,
  onDelete,
}: {
  asset: VisualAsset;
  onAdd: (asset: VisualAsset) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
      onClick={() => onAdd(asset)}
    >
      {asset.type === 'image' ? (
        <img
          src={asset.src}
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      ) : asset.type === 'audio' ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <Music className="text-white/70 drop-shadow-md" size={24} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <video
            src={asset.src}
            className="w-full h-full object-cover pointer-events-none"
          />
          <Film className="absolute text-white/70 drop-shadow-md" size={24} />
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(asset.id);
        }}
      >
        <Trash2 size={12} className="text-white" />
      </button>

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white truncate font-medium">
          {asset.name}
        </p>
      </div>
    </div>
  );
}

export default function PanelUploads() {
  const { studio } = useStudioStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<VisualAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load storage stats
  const loadStorageStats = useCallback(async () => {
    const stats = await storageService.getStorageStats();
    setStorageStats(stats);
  }, []);

  // Recover uploads from OPFS on mount
  useEffect(() => {
    const recoverFromOPFS = async () => {
      try {
        if (!storageService.isOPFSSupported()) {
          // Fall back to localStorage only (won't persist blobs)
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setUploads(JSON.parse(stored));
          }
          setIsLoaded(true);
          return;
        }

        // Load files from OPFS
        const opfsFiles = await storageService.loadAllMediaFiles({
          projectId: PROJECT_ID,
        });

        if (opfsFiles.length === 0) {
          // No OPFS files, try localStorage for backwards compatibility
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setUploads(JSON.parse(stored));
          }
          setIsLoaded(true);
          await loadStorageStats();
          return;
        }

        // Load old localStorage entries for URL mapping
        const oldEntries: VisualAsset[] = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]'
        );
        const urlMapping: Record<string, string> = {};

        // Generate new blob URLs from OPFS files
        const recoveredAssets: VisualAsset[] = opfsFiles.map((file) => {
          const newBlobUrl = file.url || URL.createObjectURL(file.file);

          // Find matching old entry by ID or name to map URLs
          const oldEntry = oldEntries.find(
            (e) => e.id === file.id || e.name === file.name
          );
          if (oldEntry?.src && oldEntry.src !== newBlobUrl) {
            urlMapping[oldEntry.src] = newBlobUrl;
          }

          return {
            id: file.id,
            name: file.name,
            src: newBlobUrl,
            type: file.type,
            width: file.width,
            height: file.height,
            duration: file.duration,
          };
        });

        // Update timeline clips with new blob URLs if needed
        if (Object.keys(urlMapping).length > 0 && studio) {
          try {
            // Serialize current clips
            const serializedClips = studio.clips.map((clip) =>
              clipToJSON(clip as unknown as StudioClip)
            );
            // Replace old URLs with new blob URLs
            const updatedClips = replaceUrlsInClips(
              serializedClips,
              urlMapping
            );
            // Reload with updated URLs
            await studio.loadFromJSON({ clips: updatedClips });
          } catch (error) {
            Log.warn('Failed to update timeline URLs:', error);
          }
        }

        setUploads(recoveredAssets);
        // Update localStorage with new URLs
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveredAssets));
        await loadStorageStats();
      } catch (error) {
        console.error('Failed to recover uploads from OPFS:', error);
        // Fall back to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUploads(JSON.parse(stored));
        }
      } finally {
        setIsLoaded(true);
      }
    };

    recoverFromOPFS();
  }, [studio, loadStorageStats]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAssets: VisualAsset[] = [];

    try {
      for (const file of Array.from(files)) {
        const blobUrl = URL.createObjectURL(file);
        const id = crypto.randomUUID();
        const type = detectFileType(file);

        // Save to OPFS if supported
        if (storageService.isOPFSSupported()) {
          const mediaFile: MediaFile = {
            id,
            file,
            name: file.name,
            type,
            url: blobUrl,
          };
          await storageService.saveMediaFile({
            projectId: PROJECT_ID,
            mediaItem: mediaFile,
          });
        }

        newAssets.push({
          id,
          name: file.name,
          src: blobUrl,
          type,
          size: file.size,
        });
      }

      const updated = [...newAssets, ...uploads];
      setUploads(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await loadStorageStats();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      if (storageService.isOPFSSupported()) {
        await storageService.deleteMediaFile({
          projectId: PROJECT_ID,
          id,
        });
      }

      const updated = uploads.filter((a) => a.id !== id);
      setUploads(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to delete upload:', error);
    }
  };

  // Add item to canvas
  const addItemToCanvas = async (asset: VisualAsset) => {
    if (!studio) return;

    try {
      if (asset.type === 'image') {
        const imageClip = await Image.fromUrl(asset.src + '?v=' + Date.now());
        imageClip.display = { from: 0, to: 5 * 1e6 };
        imageClip.duration = 5 * 1e6;
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);
        await studio.addClip(imageClip);
      } else if (asset.type === 'audio') {
        const audioClip = await Audio.fromUrl(asset.src);
        await studio.addClip(audioClip);
      } else {
        const videoClip = await Video.fromUrl(asset.src);
        await videoClip.scaleToFit(1080, 1920);
        videoClip.centerInScene(1080, 1920);
        await studio.addClip(videoClip);
      }
    } catch (error) {
      Log.error(`Failed to add ${asset.type}:`, error);
    }
  };

  // Filter assets by search query
  const filteredAssets = uploads.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Upload button */}
      <div className="flex items-center w-full p-4">
        <Button
          type="button"
          className="w-full h-9"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload size={14} />
          <span className="text-xs font-medium">
            {isUploading ? 'Uploading...' : 'Upload files'}
          </span>
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={handleFileUpload}
        />
      </div>

      {/* Search input */}
      {uploads.length > 0 && (
        <div className="relative px-4 mb-2">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search uploads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Assets grid */}
      <ScrollArea className="flex-1 px-4">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Upload size={32} className="opacity-50" />
            <span className="text-sm">
              {uploads.length === 0 ? 'No uploads yet' : 'No matches found'}
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onAdd={addItemToCanvas}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3 mb-2">
              {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
              {searchQuery && ` (showing ${filteredAssets.length})`}
            </p>
          </>
        )}
      </ScrollArea>

      {/* Storage stats footer */}
      {storageStats && (
        <div className="px-4 py-3 border-t border-border/50">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <HardDrive size={10} />
              Local Storage
            </span>
            <span>
              {storageStats.usedMB} MB /{' '}
              {storageStats.quotaMB > 1000
                ? `${(storageStats.quotaMB / 1024).toFixed(1)} GB`
                : `${storageStats.quotaMB} MB`}
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-full transition-all"
              style={{
                width: `${Math.min(storageStats.percentUsed, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
