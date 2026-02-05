<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { Search, Image as ImageIcon, Loader2 } from 'lucide-vue-next';
import { Image, Log } from 'openvideo';
import { useStudioStore } from '~/composables/useStudioStore';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

interface PexelsImage {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

const { state: studioState } = useStudioStore();
const searchQuery = ref('');
const images = ref<PexelsImage[]>([]);
const isLoading = ref(false);

const fetchImages = async (query: string) => {
  isLoading.value = true;
  try {
    const url = query
      ? `/api/pexels?type=image&query=${encodeURIComponent(query)}`
      : `/api/pexels?type=image`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.photos) {
      images.value = data.photos;
    } else {
      images.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch images:', error);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = useDebounceFn((query: string) => {
  fetchImages(query);
}, 500);

watch(searchQuery, (newVal) => {
  debouncedFetch(newVal);
});

onMounted(() => {
  fetchImages('');
});

const addItemToCanvas = async (asset: PexelsImage) => {
  const studio = studioState.value.studio;
  if (!studio) return;

  try {
    const imageClip = await Image.fromUrl(asset.src.medium);
    imageClip.name = `Photo by ${asset.photographer}`;
    imageClip.display = { from: 0, to: 5 * 1e6 };
    imageClip.duration = 5 * 1e6;

    await studio.addClip(imageClip);

    // Scale to fit and center in scene (1080x1920)
    await studio.scaleToFit(imageClip);
    await studio.centerClip(imageClip);
  } catch (error) {
    Log.error(`Failed to add image:`, error);
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
          placeholder="Search stock images..."
          class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </InputGroup>
    </div>

    <div class="flex-1 px-4 overflow-y-auto min-h-0">
      <div v-if="isLoading && images.length === 0" class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-muted-foreground" :size="32" />
      </div>

      <div v-else-if="images.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <ImageIcon :size="32" class="opacity-50" />
        <span class="text-sm">No images found</span>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
        <div
          v-for="image in images"
          :key="image.id"
          class="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
          @click="addItemToCanvas(image)"
        >
          <img
            :src="image.src.medium"
            :alt="image.alt"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p class="text-[10px] text-white truncate font-medium">
              {{ image.photographer }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="isLoading && images.length > 0" class="flex items-center justify-center py-4">
        <Loader2 class="animate-spin text-muted-foreground" :size="20" />
      </div>
    </div>
  </div>
</template>
