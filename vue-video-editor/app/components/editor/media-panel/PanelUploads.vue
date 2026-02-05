<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import {
  Image,
  Video,
  Audio,
  Log,
  type IClip as StudioClip,
} from 'openvideo';
import {
  Upload,
  Film,
  Search,
  X,
  HardDrive,
  Trash2,
  Music,
  Loader2,
} from 'lucide-vue-next';
import {
  storageService,
  type StorageStats,
} from '~/lib/storage/storage-service';
import type { MediaFile, MediaType } from '~/types/media';
import { uploadFile } from '~/lib/upload-utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';

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
const { state: studioState } = useStudioStore();

const searchQuery = ref('');
const uploads = ref<VisualAsset[]>([]);
const isUploading = ref(false);
const storageStats = ref<StorageStats | null>(null);
const isLoaded = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

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

// Helper to format duration like 00:00
function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const loadStorageStats = async () => {
    const stats = await storageService.getStorageStats();
    storageStats.value = stats;
};

// Recover uploads from OPFS on mount
onMounted(() => {
    const recoverFromOPFS = async () => {
      try {
        if (!storageService.isOPFSSupported()) {
          // Fall back to localStorage only (won't persist blobs)
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            uploads.value = JSON.parse(stored);
          }
          isLoaded.value = true;
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
             uploads.value = JSON.parse(stored);
          }
          isLoaded.value = true;
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

          // Prefer R2 URL from previous state if available
          const isR2Url = oldEntry?.src && !oldEntry.src.startsWith('blob:');
          const finalUrl = isR2Url ? oldEntry.src! : newBlobUrl;

          return {
            id: file.id,
            name: file.name,
            src: finalUrl,
            type: file.type,
            width: file.width,
            height: file.height,
            duration: file.duration,
          };
        });
        
        uploads.value = recoveredAssets;
        // Update localStorage with new URLs
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveredAssets));
        await loadStorageStats();
      } catch (error) {
        console.error('Failed to recover uploads from OPFS:', error);
        // Fall back to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
           uploads.value = JSON.parse(stored);
        }
      } finally {
        isLoaded.value = true;
      }
    };

    recoverFromOPFS();
});

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    isUploading.value = true;
    const newAssets: VisualAsset[] = [];

    try {
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        const type = detectFileType(file);

        // 1. Upload to R2
        let uploadResult;
        try {
          uploadResult = await uploadFile(file);
        } catch (error) {
          console.error('R2 upload failed, falling back to local only:', error);
        }

        const src = uploadResult?.url || URL.createObjectURL(file);

        // 2. Save to OPFS if supported (for local caching/backup)
        if (storageService.isOPFSSupported()) {
          const mediaFile: MediaFile = {
            id,
            file,
            name: file.name,
            type,
            url: src,
          };
          await storageService.saveMediaFile({
            projectId: PROJECT_ID,
            mediaItem: mediaFile,
          });
        }

        newAssets.push({
          id,
          name: file.name,
          src: src,
          type,
          size: file.size,
        });
      }

      const updated = [...newAssets, ...uploads.value];
      uploads.value = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await loadStorageStats();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      isUploading.value = false;
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    }
};

const handleDelete = async (id: string) => {
    try {
      if (storageService.isOPFSSupported()) {
        await storageService.deleteMediaFile({
          projectId: PROJECT_ID,
          id,
        });
      }

      const updated = uploads.value.filter((a) => a.id !== id);
      uploads.value = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to delete upload:', error);
    }
};

const addItemToCanvas = async (asset: VisualAsset) => {
    const studio = studioState.value.studio;
    if (!studio) return;

    try {
      if (asset.type === 'image') {
        const imageClip = await Image.fromUrl(asset.src);
        imageClip.name = asset.name;
        imageClip.display = { from: 0, to: 5 * 1e6 };
        imageClip.duration = 5 * 1e6;
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);
        await studio.addClip(imageClip);
      } else if (asset.type === 'audio') {
        const audioClip = await Audio.fromUrl(asset.src);
        audioClip.name = asset.name;
        await studio.addClip(audioClip);
      } else {
        const videoClip = await Video.fromUrl(asset.src);
        videoClip.name = asset.name;
        await videoClip.scaleToFit(1080, 1920);
        videoClip.centerInScene(1080, 1920);
        await studio.addClip(videoClip);
      }
    } catch (error) {
      Log.error(`Failed to add ${asset.type}:`, error);
    }
};

const filteredAssets = computed(() => 
    uploads.value.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
);

const onFileClick = () => {
    fileInput.value?.click();
}
</script>

<template>
  <div class="h-full flex flex-col">
    <input
        type="file"
        ref="fileInput"
        class="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        @change="handleFileUpload"
    />
    
    <div v-if="uploads.length > 0">
        <div class="flex-1 p-4 flex gap-2">
            <InputGroup>
                <InputGroupAddon class="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
                    <Search :size="14" />
                </InputGroupAddon>
                <InputGroupInput
                    v-model="searchQuery"
                    placeholder="Search uploads..."
                    class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
            </InputGroup>
             <Button
              @click="onFileClick"
              :disabled="isUploading"
              variant="outline"
            >
              <Upload :size="14" />
            </Button>
        </div>
    </div>
    <div v-else>
         <div class="flex-1 p-4 flex gap-2">
            <Button
              @click="onFileClick"
              :disabled="isUploading"
              variant="outline"
              class="w-full"
            >
              <Upload :size="14" /> Upload
            </Button>
         </div>
    </div>

    <div class="flex-1 px-4 overflow-y-auto min-h-0">
        <div v-if="!isLoaded" class="h-full flex items-center justify-center">
            <span class="text-sm text-muted-foreground">Loading...</span>
        </div>
        
        <div v-else-if="filteredAssets.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Upload :size="32" class="opacity-50" />
             <span class="text-sm">
              {{ uploads.length === 0 ? 'No uploads yet' : 'No matches found' }}
            </span>
        </div>

        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-x-3 gap-y-4">
             <div
                v-for="asset in filteredAssets"
                :key="asset.id"
                class="flex flex-col gap-1.5 group cursor-pointer"
                @click="addItemToCanvas(asset)"
            >
              <div class="relative aspect-square rounded-sm overflow-hidden bg-foreground/20 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
                    <img v-if="asset.type === 'image'"
                        :src="asset.src"
                        :alt="asset.name"
                        class="max-w-full max-h-full object-contain"
                    />
                     <div v-else-if="asset.type === 'audio'" class="w-full h-full flex items-center justify-center relative">
                         <Music
                            class="text-[#2dc28c]"
                            :size="32"
                            fill="#2dc28c"
                            :fill-opacity="0.2"
                        />
                     </div>
                     <div v-else class="w-full h-full flex items-center justify-center bg-black/40 relative">
                        <video
                            :src="asset.src"
                            class="max-w-full max-h-full object-contain pointer-events-none"
                            muted
                            @mouseover="(e) => (e.currentTarget as HTMLVideoElement).play()"
                            @mouseout="(e) => {
                                (e.currentTarget as HTMLVideoElement).pause();
                                (e.currentTarget as HTMLVideoElement).currentTime = 0;
                            }"
                        />
                     </div>
                     
                     <div v-if="asset.duration" class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                        {{ formatDuration(asset.duration) }}
                     </div>
                     
                     <button
                        type="button"
                        class="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        @click.stop="handleDelete(asset.id)"
                     >
                        <Trash2 :size="12" class="text-white" />
                     </button>
              </div>
              <p class="text-[10px] text-muted-foreground group-hover:text-foreground truncate transition-colors px-0.5">
                {{ asset.name }}
              </p>
            </div>
        </div>
    </div>
  </div>
</template>
