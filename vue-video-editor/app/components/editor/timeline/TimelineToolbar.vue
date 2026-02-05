<script setup lang="ts">
import { computed } from 'vue';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Scissors,
  Copy,
  Trash2,
  Magnet,
  ZoomOut,
  ZoomIn,
} from 'lucide-vue-next';
import { Slider } from '@/components/ui/slider';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-vue';
import EditableTimecode from '~/components/ui/EditableTimecode.vue';

const props = defineProps<{
  zoomLevel: number;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSplit?: () => void;
}>();

const emit = defineEmits<{
  (e: 'update:zoomLevel', value: number): void;
}>();

const { state: playbackState, toggle, seek: playbackSeek } = usePlaybackStore();

const currentTime = computed(() => playbackState.value.currentTime);
const duration = computed(() => playbackState.value.duration);
const isPlaying = computed(() => playbackState.value.isPlaying);

const handleZoomIn = () => {
  emit('update:zoomLevel', Math.min(3.5, props.zoomLevel + 0.15));
};

const handleZoomOut = () => {
  emit('update:zoomLevel', Math.max(0.15, props.zoomLevel - 0.15));
};

const handleZoomSliderChange = (values: number[] | undefined) => {
  if (values && values.length > 0) {
    emit('update:zoomLevel', values[0] as number);
  }
};

// Simple time formatter for fallback
const formatTimeCode = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const DEFAULT_FPS = 30;
</script>

<template>
  <div class="flex items-center justify-between px-2 py-1 border-b h-10">
    <div class="flex items-center gap-1">
      <TooltipProvider :delay-duration="500">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onSplit">
              <Scissors class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split element (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onDuplicate">
              <Copy class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onDelete">
              <Trash2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete element (Delete)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Magnet class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto snapping</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex items-center gap-0">
      <TooltipProvider :delay-duration="500">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              class="size-7"
              variant="ghost"
              size="icon"
              @click="playbackSeek(0)"
            >
              <IconPlayerSkipBack class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="toggle">
              <IconPlayerPauseFilled v-if="isPlaying" class="size-5" />
              <IconPlayerPlayFilled v-else class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isPlaying ? 'Pause (Space)' : 'Play (Space)' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              class="size-7"
              variant="ghost"
              size="icon"
              @click="playbackSeek(duration)"
            >
              <IconPlayerSkipForward class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End of Timeline</TooltipContent>
        </Tooltip>

        <!-- Time Display -->
        <div class="flex flex-row items-center justify-center px-2">
          <EditableTimecode
            :time="currentTime"
            :duration="duration"
            format="MM:SS"
            :fps="DEFAULT_FPS"
            class="text-center"
            @time-change="playbackSeek"
          />
          <div class="text-xs text-muted-foreground px-2">/</div>
          <div class="text-xs text-muted-foreground text-center">
            {{ formatTimeCode(duration) }}
          </div>
        </div>
      </TooltipProvider>
    </div>

    <div class="flex items-center gap-1">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" @click="handleZoomOut">
          <ZoomOut class="h-4 w-4" />
        </Button>
        <Slider
          class="w-24"
          :model-value="[zoomLevel]"
          :min="0.15"
          :max="3.5"
          :step="0.15"
          @update:model-value="handleZoomSliderChange"
        />
        <Button variant="ghost" size="icon" @click="handleZoomIn">
          <ZoomIn class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
