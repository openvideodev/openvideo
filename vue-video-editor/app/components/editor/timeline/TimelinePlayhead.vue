<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import { useTimelinePlayhead } from '~/composables/useTimelinePlayhead';
import { TIMELINE_CONSTANTS } from './timeline-constants';

interface Props {
  duration: number;
  zoomLevel: number;
  tracks: any[];
  seek: (time: number) => void;
  rulerRef: any;
  rulerScrollRef: any;
  tracksScrollRef: any;
  trackLabelsRef?: any;
  timelineRef: any;
  playheadRef?: any;
  isSnappingToPlayhead?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSnappingToPlayhead: false
});

const { state: playbackState } = usePlaybackStore();
const currentTime = computed(() => playbackState.value.currentTime);

const internalPlayheadRef = ref<HTMLElement | null>(null);
const playheadRef = props.playheadRef || internalPlayheadRef;
const scrollLeft = ref(0);

const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
  currentTime,
  duration: computed(() => props.duration),
  zoomLevel: computed(() => props.zoomLevel),
  seek: props.seek,
  rulerRef: computed(() => props.rulerRef),
  rulerScrollRef: computed(() => props.rulerScrollRef),
  tracksScrollRef: computed(() => props.tracksScrollRef),
  playheadRef
});

// Track scroll position to lock playhead to frame
let scrollViewport: HTMLElement | null = null;

const handleScroll = () => {
  if (scrollViewport) {
    scrollLeft.value = scrollViewport.scrollLeft;
  }
};

onMounted(() => {
  watch(() => props.rulerScrollRef, (newRef) => {
    // Clean up previous listener
    if (scrollViewport) {
      scrollViewport.removeEventListener('scroll', handleScroll);
    }
    
    // Get the actual DOM element from the ref
    // The ref might be a Vue ref object or a direct element
    const element = newRef?.value || newRef;
    scrollViewport = element;
    
    if (scrollViewport && scrollViewport.addEventListener) {
      scrollLeft.value = scrollViewport.scrollLeft || 0;
      scrollViewport.addEventListener('scroll', handleScroll);
    }
  }, { immediate: true });
});

onUnmounted(() => {
  if (scrollViewport && scrollViewport.removeEventListener) {
    scrollViewport.removeEventListener('scroll', handleScroll);
  }
});

const totalHeight = computed(() => {
  const timelineContainerHeight = props.timelineRef?.offsetHeight || 400;
  return timelineContainerHeight - 4;
});

const trackLabelsWidth = computed(() => {
  return props.tracks.length > 0 && props.trackLabelsRef
    ? props.trackLabelsRef.offsetWidth
    : 0;
});

const timelinePosition = computed(() => {
  return playheadPosition.value * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * props.zoomLevel;
});

const rawLeftPosition = computed(() => {
  return trackLabelsWidth.value + timelinePosition.value - scrollLeft.value;
});

const timelineContentWidth = computed(() => {
  return props.duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * props.zoomLevel;
});

const leftPosition = computed(() => {
  const tracksViewport = props.tracksScrollRef || props.rulerScrollRef || { clientWidth: 1000 };
  const viewportWidth = tracksViewport.clientWidth || 1000;

  const leftBoundary = trackLabelsWidth.value;
  const rightBoundary = Math.min(
    trackLabelsWidth.value + timelineContentWidth.value - scrollLeft.value,
    trackLabelsWidth.value + viewportWidth
  );

  return Math.max(leftBoundary, Math.min(rightBoundary, rawLeftPosition.value));
});
</script>

<template>
  <div
    ref="playheadRef"
    class="absolute pointer-events-auto z-40 group"
    :style="{
      left: `${leftPosition}px`,
      top: 0,
      height: `${totalHeight}px`,
      width: '1px',
      opacity: duration === 0 ? 0 : 1,
    }"
    @mousedown="handlePlayheadMouseDown"
  >
    <!-- The playhead line spanning full height -->
    <div class="absolute left-1/2 -translate-x-1/2 w-[1px] cursor-col-resize h-full bg-white" />

    <!-- Playhead indicator at the top -->
    <div
      class="absolute left-1/2 transform -translate-x-1/2 cursor-col-resize bg-white"
      style="
        top: 0;
        width: 12px;
        height: 14px;
        border-radius: 2px 2px 0 0;
        clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%);
      "
    />
  </div>
</template>
