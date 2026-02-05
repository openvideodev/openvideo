<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, markRaw } from 'vue';
import { useTimelineStore } from '~/composables/useTimelineStore';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import { useStudioStore } from '~/composables/useStudioStore';

import { 
  Video, 
  Music, 
  Type as TypeIcon, 
  Sparkles as SparklesIcon, 
  Image as ImageIcon,
  Ellipsis,
  ArrowUp,
  ArrowDown
} from 'lucide-vue-next';

import { TimelineCanvas } from './timeline/index';
import TimelinePlayhead from './TimelinePlayhead.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelineToolbar from './TimelineToolbar.vue';
import TimelineStudioSync from './TimelineStudioSync.vue';
import { TIMELINE_CONSTANTS, getTrackHeight } from './timeline-constants';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';

const { state: timelineState, getTotalDuration } = useTimelineStore();
const { state: playbackState, seek, setDuration } = usePlaybackStore();
const { state: studioState } = useStudioStore();

const timelineRef = ref<HTMLElement | null>(null);
const rulerRef = ref<HTMLElement | null>(null);
const rulerScrollRef = ref<any>(null);
const rulerScrollViewport = ref<HTMLElement | null>(null); // Actual scrollable element
const tracksScrollRef = ref<HTMLElement | null>(null);
const trackLabelsRef = ref<HTMLElement | null>(null);
const playheadRef = ref<HTMLElement | null>(null);

const isInTimeline = ref(false);
const zoomLevel = ref(1); // Default zoom

const timelineCanvas = ref<TimelineCanvas | null>(null);
const isUpdating = ref(false);

const tracks = computed(() => timelineState.value.tracks);
const duration = computed(() => playbackState.value.duration);
const studio = computed(() => studioState.value.studio);

const dynamicTimelineWidth = computed(() => {
  return Math.max(
    (duration.value || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel.value,
    timelineRef.value?.clientWidth || 1000
  );
});

onMounted(() => {
  const canvas = new TimelineCanvas('timeline-canvas');
  // Use markRaw to prevent Vue from making this reactive
  // This is necessary because the Timeline class uses private fields (#)
  // which don't work with Vue's Proxy-based reactivity
  timelineCanvas.value = markRaw(canvas);

  // Extract the actual scrollable viewport from the ScrollArea component
  if (rulerScrollRef.value) {
    // The ScrollArea component has a viewport element with data-slot="scroll-area-viewport"
    const viewport = rulerScrollRef.value.$el?.querySelector('[data-slot="scroll-area-viewport"]') ||
                     rulerScrollRef.value.querySelector?.('[data-slot="scroll-area-viewport"]');
    if (viewport) {
      rulerScrollViewport.value = viewport;
    }
  }

  canvas.on('scroll', ({ deltaX, deltaY, scrollX, scrollY }: any) => {
    if (isUpdating.value) return;
    isUpdating.value = true;

    if (typeof scrollX === 'number' && rulerScrollRef.value) {
      rulerScrollRef.value.scrollLeft = scrollX;
    }
    
    if (typeof scrollY === 'number' && trackLabelsRef.value) {
      trackLabelsRef.value.scrollTop = scrollY;
    }

    isUpdating.value = false;
  });

  canvas.initScrollbars({
    offsetX: 0,
    offsetY: 0,
    extraMarginX: 50,
    extraMarginY: 15,
    scrollbarWidth: 8,
    scrollbarColor: 'rgba(255, 255, 255, 0.3)',
  });

  canvas.setTracks(tracks.value);
});

onUnmounted(() => {
  if (timelineCanvas.value) {
    timelineCanvas.value.dispose();
  }
});

watch([zoomLevel, tracks], () => {
  if (timelineCanvas.value) {
    timelineCanvas.value.setTimeScale(zoomLevel.value);
    timelineCanvas.value.setTracks(tracks.value);
  }
});

const handleDelete = () => {
  studio.value?.deleteSelected();
};

const handleDuplicate = () => {
  studio.value?.duplicateSelected();
};

const handleSplit = () => {
  const splitTime = playbackState.value.currentTime * 1_000_000;
  studio.value?.splitSelected(splitTime);
};

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY;
    zoomLevel.value = Math.max(0.15, Math.min(3.5, zoomLevel.value - delta * 0.01));
  }
};

const handleTimelineContentClick = (e: MouseEvent) => {
  // Simplified click-to-seek logic from index.tsx
  const target = e.target as HTMLElement;
  if (target.closest('.timeline-element')) return;
  if (playheadRef.value?.contains(target)) return;

  const isRulerClick = target.closest('[data-ruler-area]');
  let mouseX: number;
  let scrollLeft = 0;

  if (isRulerClick && rulerScrollRef.value) {
    const rect = rulerScrollRef.value.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    scrollLeft = rulerScrollRef.value.scrollLeft;
  } else if (tracksScrollRef.value) {
    const rect = tracksScrollRef.value.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    scrollLeft = tracksScrollRef.value.scrollLeft;
  } else {
    return;
  }

  const time = (mouseX + scrollLeft) / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel.value);
  seek(Math.max(0, Math.min(duration.value, time)));
};
</script>

<template>
  <div
    class="h-full flex flex-col transition-colors duration-200 relative bg-card rounded-sm overflow-hidden"
    @mouseenter="isInTimeline = true"
    @mouseleave="isInTimeline = false"
  >
    <TimelineToolbar
      v-model:zoomLevel="zoomLevel"
      @delete="handleDelete"
      @duplicate="handleDuplicate"
      @split="handleSplit"
    />
    
    <TimelineStudioSync :timelineCanvas="timelineCanvas" />

    <!-- Timeline Container -->
    <div
      ref="timelineRef"
      class="flex-1 flex flex-col overflow-hidden relative bg-[#121212]"
      @wheel="handleWheel"
    >
      <TimelinePlayhead
        :duration="duration"
        :zoomLevel="zoomLevel"
        :tracks="tracks"
        :seek="seek"
        :rulerRef="rulerRef"
        :rulerScrollRef="rulerScrollViewport"
        :tracksScrollRef="tracksScrollRef"
        :trackLabelsRef="trackLabelsRef"
        :timelineRef="timelineRef"
        :playheadRef="playheadRef"
      />

      <!-- Timeline Header with Ruler -->
      <div
        :style="{ opacity: duration === 0 ? 0 : 1 }"
        class="flex sticky top-0 z-20"
      >
        <!-- Track Labels Header -->
        <div class="w-16 shrink-0 bg-card border-r flex items-center justify-between h-6">
          <span class="text-sm font-medium text-muted-foreground opacity-0">.</span>
        </div>

        <!-- Timeline Ruler -->
        <div
          class="flex-1 relative overflow-hidden h-6"
          data-ruler-area
          @click="handleTimelineContentClick"
        >
          <ScrollArea
            ref="rulerScrollRef"
            class="w-full h-full scrollbar-hidden"
            @scroll="(e: any) => {
              if (isUpdating) return;
              isUpdating = true;
              const scrollX = e.target.scrollLeft;
              timelineCanvas?.setScroll(scrollX, undefined);
              isUpdating = false;
            }"
          >
            <div
              ref="rulerRef"
              class="relative h-6 select-none cursor-default"
              :style="{ width: `${dynamicTimelineWidth}px` }"
            >
              <TimelineRuler
                :zoomLevel="zoomLevel"
                :duration="duration"
                :width="dynamicTimelineWidth"
              />
            </div>
          </ScrollArea>
        </div>
      </div>

      <!-- Tracks Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Track Labels -->
        <div
          v-if="tracks.length > 0"
          ref="trackLabelsRef"
          class="w-16 shrink-0 overflow-y-hidden z-10 bg-card border-r"
          data-track-labels
        >
          <div class="flex flex-col">
            <template v-for="(track, index) in tracks" :key="track.id">
              <!-- Top separator for first track -->
              <div
                v-if="index === 0"
                :style="{ height: `${TIMELINE_CONSTANTS.TRACK_PADDING_TOP}px` }"
              />

              <div
                class="flex items-center px-3 group bg-input/40"
                :style="{ height: `${getTrackHeight(track.type)}px` }"
              >
                <div class="flex items-center justify-center flex-1 min-w-0 gap-1">
                  <!-- Track Icon Logic -->
                  <ImageIcon v-if="track.type === 'Image'" class="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Video v-else-if="track.type === 'Video' || track.type === 'Placeholder'" class="w-4 h-4 shrink-0 text-muted-foreground" />
                  <TypeIcon v-else-if="track.type === 'Text' || track.type === 'Caption'" class="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Music v-else-if="track.type === 'Audio'" class="w-4 h-4 shrink-0 text-muted-foreground" />
                  <SparklesIcon v-else-if="track.type === 'Effect'" class="w-4 h-4 shrink-0 text-muted-foreground" />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" class="size-4 p-0 h-6 w-4">
                        <Ellipsis class="size-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right">
                      <DropdownMenuItem
                        :disabled="index === 0"
                        @click="useTimelineStore().moveTrack(track.id, index - 1)"
                      >
                        <ArrowUp class="size-4 mr-2" />
                        Move track up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        :disabled="index === tracks.length - 1"
                        @click="useTimelineStore().moveTrack(track.id, index + 1)"
                      >
                        <ArrowDown class="size-4 mr-2" />
                        Move track down
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <!-- Separator after each track -->
              <div
                class="w-full relative"
                :style="{ height: `${TIMELINE_CONSTANTS.TRACK_SPACING}px` }"
              />
            </template>
            <!-- Spacer to match canvas extraMarginY -->
            <div style="height: 15px; flex-shrink: 0" />
          </div>
        </div>

        <!-- Timeline Tracks Content -->
        <div class="flex-1 relative overflow-hidden" ref="tracksScrollRef">
          <div id="timeline-canvas" class="w-full h-full" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
.scrollbar-hidden {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
