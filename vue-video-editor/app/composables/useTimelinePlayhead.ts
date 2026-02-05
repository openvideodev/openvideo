import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import { usePlaybackStore } from './usePlaybackStore';
import { useEdgeAutoScroll } from './useEdgeAutoScroll';
import { snapTimeToFrame } from '~/components/editor/timeline/timeline-constants';

const DEFAULT_FPS = 30;

interface UseTimelinePlayheadProps {
  currentTime: Ref<number> | number;
  duration: Ref<number> | number;
  zoomLevel: Ref<number> | number;
  seek: (time: number) => void;
  rulerRef: Ref<HTMLElement | null>;
  rulerScrollRef: Ref<HTMLElement | null>;
  tracksScrollRef: Ref<HTMLElement | null>;
  playheadRef?: Ref<HTMLElement | null>;
}

export function useTimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: UseTimelinePlayheadProps) {
  const { state: playbackState } = usePlaybackStore();

  // Playhead scrubbing state
  const isScrubbing = ref(false);
  const scrubTime = ref<number | null>(null);

  // Ruler drag detection state
  const isDraggingRuler = ref(false);
  const hasDraggedRuler = ref(false);
  const lastMouseXRef = ref(0);

  const _currentTime = typeof currentTime === 'number' ? currentTime : computed(() => (currentTime as Ref<number>).value);
  const _duration = typeof duration === 'number' ? duration : computed(() => (duration as Ref<number>).value);
  const _zoomLevel = typeof zoomLevel === 'number' ? zoomLevel : computed(() => (zoomLevel as Ref<number>).value);

  const playheadPosition = computed(() =>
    isScrubbing.value && scrubTime.value !== null ? scrubTime.value : (typeof _currentTime === 'number' ? _currentTime : _currentTime.value)
  );

  const handleScrub = (e: MouseEvent) => {
    const ruler = rulerRef.value;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const rawX = e.clientX - rect.left;

    const durationVal = typeof _duration === 'number' ? _duration : _duration.value;
    const zoomVal = typeof _zoomLevel === 'number' ? _zoomLevel : _zoomLevel.value;

    // Get the timeline content width based on duration and zoom
    const timelineContentWidth = durationVal * 50 * zoomVal;

    // Constrain x to be within the timeline content bounds
    const x = Math.max(0, Math.min(timelineContentWidth, rawX));

    const rawTime = Math.max(0, Math.min(durationVal, x / (50 * zoomVal)));
    // Use frame snapping for playhead scrubbing
    const time = snapTimeToFrame(rawTime, DEFAULT_FPS);

    scrubTime.value = time;
    seek(time); // update video preview in real time

    // Store mouse position for auto-scrolling
    lastMouseXRef.value = e.clientX;
  };

  const handlePlayheadMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isScrubbing.value = true;
    handleScrub(e);
  };

  const handleRulerMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (playheadRef?.value?.contains(e.target as Node)) return;

    e.preventDefault();
    isDraggingRuler.value = true;
    hasDraggedRuler.value = false;
    isScrubbing.value = true;
    handleScrub(e);
  };

  useEdgeAutoScroll({
    isActive: isScrubbing,
    getMouseClientX: () => lastMouseXRef.value,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: computed(() => (typeof _duration === 'number' ? _duration : _duration.value) * 50 * (typeof _zoomLevel === 'number' ? _zoomLevel : _zoomLevel.value)),
  });

  const onMouseMove = (e: MouseEvent) => {
    if (!isScrubbing.value) return;
    handleScrub(e);
    if (isDraggingRuler.value) {
      hasDraggedRuler.value = true;
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!isScrubbing.value) return;
    isScrubbing.value = false;
    if (scrubTime.value !== null) seek(scrubTime.value);
    scrubTime.value = null;

    if (isDraggingRuler.value) {
      isDraggingRuler.value = false;
      if (!hasDraggedRuler.value) {
        handleScrub(e);
      }
      hasDraggedRuler.value = false;
    }
  };

  watch(isScrubbing, (active) => {
    if (active) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  });

  // Auto-scroll during playback
  watch(() => [playheadPosition.value, playbackState.value.isPlaying], ([pos, isPlaying]) => {
    if (!isPlaying || isScrubbing.value) return;

    const rulerViewport = rulerScrollRef.value;
    const tracksViewport = tracksScrollRef.value;
    if (!rulerViewport || !tracksViewport) return;

    const zoomVal = typeof _zoomLevel === 'number' ? _zoomLevel : _zoomLevel.value;
    const playheadPx = (pos as number) * 50 * zoomVal;
    const viewportWidth = rulerViewport.clientWidth;
    const scrollMax = Math.max(0, rulerViewport.scrollWidth - viewportWidth);

    const needsScroll =
      playheadPx < rulerViewport.scrollLeft ||
      playheadPx > rulerViewport.scrollLeft + viewportWidth;

    if (needsScroll) {
      const desiredScroll = Math.max(0, Math.min(scrollMax, playheadPx - viewportWidth / 2));
      rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
    }
  });

  return {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
  };
}
