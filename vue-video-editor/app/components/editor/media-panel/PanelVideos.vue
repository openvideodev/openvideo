<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { Search, Film, Loader2 } from 'lucide-vue-next';
import { Video, Log, Placeholder } from 'openvideo';
import { useStudioStore } from '~/composables/useStudioStore';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: {
    id: number;
    quality: 'hd' | 'sd';
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

const { state: studioState } = useStudioStore();
const searchQuery = ref('');
const videos = ref<PexelsVideo[]>([]);
const isLoading = ref(false);

const fetchVideos = async (query: string) => {
  isLoading.value = true;
  try {
    const url = query
      ? `/api/pexels?type=video&query=${encodeURIComponent(query)}`
      : `/api/pexels?type=video`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.videos) {
      videos.value = data.videos;
    } else {
      videos.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch videos:', error);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = useDebounceFn((query: string) => {
  fetchVideos(query);
}, 500);

watch(searchQuery, (newVal) => {
  debouncedFetch(newVal);
});

onMounted(() => {
  fetchVideos('');
});

const addItemToCanvas = async (asset: PexelsVideo) => {
  const studio = studioState.value.studio;
  if (!studio) return;

  try {
    // Find the best quality mp4 link
    const videoFile =
      asset.video_files.find((f) => f.quality === 'hd') ||
      asset.video_files[0];
    if (!videoFile) throw new Error('No video file found');

    const src = videoFile.link;
    const clipName = `Video by ${asset.user.name}`;

    // 1. Create and add placeholder immediately
    const placeholder = new Placeholder(
      src,
      {
        width: asset.width,
        height: asset.height,
        duration: asset.duration * 1e6, // seconds to microseconds
      },
      'Video'
    );
    placeholder.name = clipName;

    // Add clip BEFORE applying studio transforms to avoid proxy issues
    await studio.addClip(placeholder);

    // Scale to fit and center in scene (1080x1920)
    await studio.scaleToFit(placeholder);
    await studio.centerClip(placeholder);

    // 2. Load the real clip in the background
    Video.fromUrl(src)
      .then(async (videoClip) => {
        videoClip.name = clipName;

        // 3. Replace all placeholders with this source once loaded
        // cast to any because replaceClipsBySource might not be fully typed in the stub or might differ
        await (studio.timeline as any).replaceClipsBySource(src, async (oldClip: any) => {
          const clone = await videoClip.clone();
          // Copy state from placeholder (user might have moved/resized/split it)
          clone.id = oldClip.id; 
          clone.name = oldClip.name; 
          clone.left = oldClip.left;
          clone.top = oldClip.top;
          clone.width = oldClip.width;
          clone.height = oldClip.height;
          const realDuration = videoClip.meta.duration;
          const newTrim = { ...oldClip.trim };
          newTrim.to = Math.max(newTrim.to, realDuration);
          newTrim.from = Math.min(newTrim.from, newTrim.to);
          
          clone.display = { ...oldClip.display };
          clone.trim = newTrim;
          clone.duration = (newTrim.to - newTrim.from) / clone.playbackRate;
          clone.display.to = clone.display.from + clone.duration;
          clone.zIndex = oldClip.zIndex;
          return clone;
        });
      })
      .catch((err) => {
        Log.error('Failed to load video in background:', err);
      });
  } catch (error) {
    Log.error(`Failed to add video:`, error);
  }
};
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-none p-4 w-full">
      <InputGroup>
        <InputGroupAddon class="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
          <Search :size="14" />
        </InputGroupAddon>
        <InputGroupInput
          v-model="searchQuery"
          placeholder="Search stock videos..."
          class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </InputGroup>
    </div>

    <div class="flex-1 px-4 overflow-y-auto min-h-0">
      <div v-if="isLoading && videos.length === 0" class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-muted-foreground" :size="32" />
      </div>

      <div v-else-if="videos.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Film :size="32" class="opacity-50" />
        <span class="text-sm">No videos found</span>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
        <div
          v-for="video in videos"
          :key="video.id"
          class="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
          @click="addItemToCanvas(video)"
        >
          <div class="w-full h-full flex items-center justify-center bg-black/20 text-[0px]">
             <img
              :src="video.image"
              class="w-full h-full object-cover pointer-events-none"
              :alt="video.user.name"
            />
            <span class="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white px-1 rounded">
              {{ Math.floor(video.duration) }}s
            </span>
          </div>
         
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p class="text-[10px] text-white truncate font-medium">
              {{ video.user.name }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="isLoading && videos.length > 0" class="flex items-center justify-center py-4">
        <Loader2 class="animate-spin text-muted-foreground" :size="20" />
      </div>
    </div>
  </div>
</template>
