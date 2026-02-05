<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { TIMELINE_CONSTANTS } from './timeline-constants';

interface Props {
  zoomLevel: number;
  duration: number;
  width: number;
}

const props = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const drawRuler = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { zoomLevel, duration, width } = props;

  // Handle high DPI screens
  const dpr = window.devicePixelRatio || 1;
  // Set display size (css pixels)
  canvas.style.width = `${width}px`;
  canvas.style.height = `24px`;

  // Set actual size in memory (scaled to account for extra pixel density)
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(24 * dpr);

  // Normalize coordinate system to use css pixels
  ctx.scale(dpr, dpr);

  // Clear canvas
  ctx.clearRect(0, 0, width, 24);

  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

  // Background for valid duration (darker)
  const durationX = duration * pixelsPerSecond;
  if (durationX > 0) {
    ctx.fillStyle = 'rgba(33, 33, 33, 1)';
    ctx.fillRect(0, 0, Math.min(width, durationX), 24);
  }

  // Drawing settings
  ctx.fillStyle = '#9ca3af'; // text-gray-400
  ctx.strokeStyle = '#374151'; // border-gray-700
  ctx.lineWidth = 1;
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Calculate intervals
  const minTextSpacing = 50;
  const intervalOptions = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  let mainInterval = 300;

  for (const opt of intervalOptions) {
    if (opt * pixelsPerSecond >= minTextSpacing) {
      mainInterval = opt;
      break;
    }
  }

  const formatTime = (seconds: number) => {
    if (mainInterval < 1) {
      return seconds.toFixed(1) + 's';
    }

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    if (m > 0 && s === 0) return `${m}m`;
    if (m === 0 && s === 0) return '0s';
    return m > 0
      ? `${m}:${s.toString().padStart(2, '0')}`
      : s.toString().padStart(2, '0');
  };

  let subTickCount = 5;
  if (mainInterval === 0.1) subTickCount = 2;
  if (mainInterval === 1) subTickCount = 5;
  if (mainInterval === 60) subTickCount = 4;

  let subInterval = mainInterval / subTickCount;
  if (subInterval * pixelsPerSecond < 6) {
    subInterval = mainInterval;
  }

  const rangeEnd = Math.max(duration, width / pixelsPerSecond);
  const count = Math.ceil(rangeEnd / subInterval) + 1;

  for (let i = 0; i < count; i++) {
    const time = i * subInterval;
    const x = Math.floor(time * pixelsPerSecond) + 0.5;

    if (x > width) break;

    const isBeyondDuration = time > duration + 0.001;
    ctx.globalAlpha = isBeyondDuration ? 0.4 : 1.0;

    ctx.beginPath();
    const isMain =
      Math.abs(time % mainInterval) < 0.001 ||
      Math.abs((time % mainInterval) - mainInterval) < 0.001;

    if (isMain) {
      ctx.moveTo(x, 18);
      ctx.lineTo(x, 24);
      const text = formatTime(time);
      ctx.fillText(text, x, 4);
    } else {
      if (subInterval !== mainInterval) {
        ctx.moveTo(x, 21);
        ctx.lineTo(x, 24);
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
};

onMounted(() => {
  drawRuler();
});

watch(() => [props.zoomLevel, props.duration, props.width], () => {
  drawRuler();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 pointer-events-none"
    style="height: 24px"
  />
</template>
