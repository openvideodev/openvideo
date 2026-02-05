
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-vue-next';

const props = defineProps<{
  item: {
    id: string;
    url: string;
    text: string;
  };
  playingId: string | null;
}>();

const emit = defineEmits<{
  (e: 'add', url: string, name: string): void;
  (e: 'update:playingId', id: string | null): void;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);
const duration = ref('--:--');

// Computed isPlaying based on props
const isPlaying = computed(() => props.playingId === props.item.id);

watch(isPlaying, (newVal) => {
  if (newVal) {
    audioRef.value?.play();
  } else {
    audioRef.value?.pause();
    if (audioRef.value) {
      audioRef.value.currentTime = 0;
    }
  }
});

const togglePlay = (e: Event) => {
  e.stopPropagation();
  if (isPlaying.value) {
    emit('update:playingId', null);
  } else {
    emit('update:playingId', props.item.id);
  }
};

const handleLoadedMetadata = () => {
  if (audioRef.value) {
    const seconds = Math.round(audioRef.value.duration);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    duration.value = `${min}:${sec.toString().padStart(2, '0')}`;
  }
};

const handleEnded = () => {
  emit('update:playingId', null);
};
</script>

<template>
  <div class="group relative flex items-center gap-3 p-2 bg-secondary rounded-sm border hover:border-white/10 transition-colors">
    <audio
      ref="audioRef"
      :src="item.url"
      @ended="handleEnded"
      @loadedmetadata="handleLoadedMetadata"
      class="hidden"
    />

    <Button
      size="icon"
      variant="ghost"
      class="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 shrink-0"
      @click="togglePlay"
    >
      <Pause v-if="isPlaying" class="size-4 fill-current" />
      <Play v-else class="size-4 fill-current ml-0.5" />
    </Button>

    <div
      @click="emit('add', item.url, item.text)"
      class="flex flex-col min-w-0 flex-1 cursor-pointer"
    >
      <span class="text-xs font-medium truncate mb-0.5 text-zinc-300">
        {{ item.text }}
      </span>
      <span class="text-[10px] text-muted-foreground">{{ duration }}</span>
    </div>
  </div>
</template>
