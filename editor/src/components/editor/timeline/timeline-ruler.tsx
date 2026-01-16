'use client';

import { useEffect, useRef } from 'react';
import { TIMELINE_CONSTANTS } from '@/components/editor/timeline/timeline-constants';

interface TimelineRulerProps {
  zoomLevel: number;
  duration: number;
  width: number;
}

export function TimelineRuler({
  zoomLevel,
  duration,
  width,
}: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    // We want main labels (text) to have enough space (min 50px)
    const minTextSpacing = 50;

    // Available intervals: 0.1s, 0.5s, 1s, 2s, 5s, 10s, 15s, 30s, 1m (60s), 2m (120s), 5m (300s)
    const intervalOptions = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    let mainInterval = 300; // Default to largest if none fit

    for (const opt of intervalOptions) {
      if (opt * pixelsPerSecond >= minTextSpacing) {
        mainInterval = opt;
        break;
      }
    }

    // Helper to format time
    const formatTime = (seconds: number) => {
      // If interval is sub-second, show decimal
      if (mainInterval < 1) {
        // Avoid long floating point errors
        return seconds.toFixed(1) + 's';
      }

      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);

      if (m > 0 && s === 0) {
        return `${m}m`;
      }
      if (m === 0 && s === 0) {
        return '0s';
      }
      return m > 0
        ? `${m}:${s.toString().padStart(2, '0')}`
        : s.toString().padStart(2, '0');
    };

    // Sub ticks
    // We try to find a nice sub-interval
    let subTickCount = 5;
    if (mainInterval === 0.1) subTickCount = 2; // 0.05
    if (mainInterval === 1) subTickCount = 5; // 0.2
    if (mainInterval === 60) subTickCount = 4; // 15s

    let subInterval = mainInterval / subTickCount;
    // Don't let sub-ticks get too crowded (min 5px)
    if (subInterval * pixelsPerSecond < 6) {
      subInterval = mainInterval; // No sub ticks
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
      // Check if main interval
      // Use epsilon for float comparison
      const isMain =
        Math.abs(time % mainInterval) < 0.001 ||
        Math.abs((time % mainInterval) - mainInterval) < 0.001;

      if (isMain) {
        // Main Tick (Botom)
        ctx.moveTo(x, 18);
        ctx.lineTo(x, 24);

        // Text (Top)
        const text = formatTime(time);
        ctx.fillText(text, x, 4);
      } else {
        // Sub Tick (Bottom, shorter)
        // Only draw sub ticks if there's enough space
        if (subInterval !== mainInterval) {
          ctx.moveTo(x, 21);
          ctx.lineTo(x, 24);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, [zoomLevel, duration, width]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ height: '24px' }}
    />
  );
}
