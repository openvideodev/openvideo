import { ref, watchEffect, onUnmounted, type Ref } from 'vue';

interface UseEdgeAutoScrollParams {
  isActive: Ref<boolean> | boolean;
  getMouseClientX: () => number;
  rulerScrollRef: Ref<HTMLElement | null>;
  tracksScrollRef: Ref<HTMLElement | null>;
  contentWidth: Ref<number> | number;
  edgeThreshold?: number;
  maxScrollSpeed?: number;
}

export function useEdgeAutoScroll({
  isActive,
  getMouseClientX,
  rulerScrollRef,
  tracksScrollRef,
  contentWidth,
  edgeThreshold = 100,
  maxScrollSpeed = 15,
}: UseEdgeAutoScrollParams): void {
  const rafId = ref<number | null>(null);

  const step = () => {
    const rulerViewport = rulerScrollRef.value;
    const tracksViewport = tracksScrollRef.value;
    if (!rulerViewport || !tracksViewport) {
      rafId.value = requestAnimationFrame(step);
      return;
    }

    const viewportRect = rulerViewport.getBoundingClientRect();
    const mouseX = getMouseClientX();
    const mouseXRelative = mouseX - viewportRect.left;

    const viewportWidth = rulerViewport.clientWidth;
    const intrinsicContentWidth = rulerViewport.scrollWidth;
    const effectiveContentWidth = Math.max(
      typeof contentWidth === 'number' ? contentWidth : contentWidth.value,
      intrinsicContentWidth
    );
    const scrollMax = Math.max(0, effectiveContentWidth - viewportWidth);

    let scrollSpeed = 0;

    if (mouseXRelative < edgeThreshold && rulerViewport.scrollLeft > 0) {
      const edgeDistance = Math.max(0, mouseXRelative);
      const intensity = 1 - edgeDistance / edgeThreshold;
      scrollSpeed = -maxScrollSpeed * intensity;
    } else if (
      mouseXRelative > viewportWidth - edgeThreshold &&
      rulerViewport.scrollLeft < scrollMax
    ) {
      const edgeDistance = Math.max(
        0,
        viewportWidth - edgeThreshold - mouseXRelative
      );
      const intensity = 1 - edgeDistance / edgeThreshold;
      scrollSpeed = maxScrollSpeed * intensity;
    }

    if (scrollSpeed !== 0) {
      const newScrollLeft = Math.max(
        0,
        Math.min(scrollMax, rulerViewport.scrollLeft + scrollSpeed)
      );
      rulerViewport.scrollLeft = newScrollLeft;
      tracksViewport.scrollLeft = newScrollLeft;
    }

    rafId.value = requestAnimationFrame(step);
  };

  watchEffect(() => {
    const active = typeof isActive === 'boolean' ? isActive : isActive.value;
    if (active) {
      rafId.value = requestAnimationFrame(step);
    } else {
      if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value);
        rafId.value = null;
      }
    }
  });

  onUnmounted(() => {
    if (rafId.value !== null) {
      cancelAnimationFrame(rafId.value);
    }
  });
}
