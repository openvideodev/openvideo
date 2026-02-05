<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Studio, fontManager } from 'openvideo';
import { useStudioStore } from '@/composables/useStudioStore';
import { editorFont } from '@/components/editor/constants';

const DEFAULT_CANVAS_SIZE = {
  width: 1080,
  height: 1920,
};

const STUDIO_CONFIG = {
  fps: 30,
  bgColor: '#181818',
  interactivity: true,
  spacing: 20,
};

const props = defineProps<{
  onReady?: () => void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const studioRef = ref<Studio | null>(null);
const { setStudio } = useStudioStore();

// ResizeObserver logic
let resizeObserver: ResizeObserver | null = null;

const initializeStudio = async () => {
  if (!canvasRef.value) return;

  // Create studio instance
  studioRef.value = new Studio({
    ...DEFAULT_CANVAS_SIZE,
    ...STUDIO_CONFIG,
    canvas: canvasRef.value,
  });

  try {
    await Promise.all([
      fontManager.loadFonts([
        {
          name: editorFont.fontFamily,
          url: editorFont.fontUrl,
        },
      ]),
      studioRef.value.ready,
    ]);
    props.onReady?.();
  } catch (error) {
    console.error('Failed to initialize studio:', error);
  }

  // Update global store
  setStudio(studioRef.value);

  // Setup ResizeObserver
  const canvasElement = canvasRef.value;
  const parentElement = canvasElement.parentElement;

  if (parentElement) {
    resizeObserver = new ResizeObserver(() => {
      if (studioRef.value && (studioRef.value as any).updateArtboardLayout) {
        (studioRef.value as any).updateArtboardLayout();
      }
    });
    resizeObserver.observe(parentElement);
  }
};

onMounted(() => {
  initializeStudio();
});

onUnmounted(() => {
  // Disconnect ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Destroy Studio instance
  if (studioRef.value) {
    studioRef.value.destroy();
    studioRef.value = null;
    setStudio(null);
  }
});
</script>

<template>
  <div class="h-full w-full flex flex-col min-h-0 min-w-0 bg-card rounded-sm relative">
    <div
      style="
        flex: 1;
        position: relative;
        overflow: hidden;
      "
    >
      <canvas
        ref="canvasRef"
        style="
          display: block;
          width: 100%;
          height: 100%;
        "
      />
    </div>
  </div>
</template>
