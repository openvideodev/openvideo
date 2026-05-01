import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { jsonToClip } from "openvideo";
import Header from "./header";
import Ruler from "./ruler";
import { timeUsToUnits, unitsToTimeUs, ITimelineScaleState } from "@openvideo/timeline";
import CanvasTimeline from "./items/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useStudioStore } from "@/stores/studio-store";
import { useProjectStore } from "@/stores/project-store";
import { projectStore } from "@/lib/project";
import Playhead from "./playhead";
import { useTheme } from "next-themes";
import {
  Audio,
  Image,
  Text,
  Video,
  Caption,
  Helper,
  Track,
  LinealAudioBars,
  RadialAudioBars,
  WaveAudioBars,
  HillAudioBars
} from "./items";
import PreviewTrackItem from "./items/preview-drag-item";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { addStudioSync } from "./studio-to-store-sync";

CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Caption,
  Helper,
  Track,
  PreviewTrackItem,
  LinealAudioBars,
  RadialAudioBars,
  WaveAudioBars,
  HillAudioBars
});

const EMPTY_SIZE = { width: 0, height: 0 };

const Timeline = () => {
  // prevent duplicate scroll events
  const canScrollRef = useRef(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<CanvasTimeline | null>(null);
  const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const { currentTime, duration, seek, setDuration } = usePlaybackStore();
  const { studio } = useStudioStore();
  const { fps } = useProjectStore();
  const scale = useStore(projectStore, (s) => s.scale);
  const setScale = projectStore.getState().setScale;
  
  const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);
  const timelineOffsetX = useTimelineOffsetX();
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineHeight = 320; // Default or get from container
  const onMouseDown = () => { };
  const onMouseMove = () => { };
  const onMouseOut = () => { };
  const { theme } = useTheme();

  const [timeline, setTimeline] = useState<CanvasTimeline | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      canvasRef.current?.requestRenderAll();
    }, 5);
    return () => clearTimeout(timeout);
  }, [theme]);

  useEffect(() => {
    const position = timeUsToUnits(currentTime * 1_000_000, scale.zoom);
    const canvasEl = canvasElRef.current;
    const horizontalScrollbar = horizontalScrollbarVpRef.current;

    if (!canvasEl || !horizontalScrollbar) return;

    const canvasBoudingX =
      canvasEl.getBoundingClientRect().x + canvasEl.clientWidth;
    const playHeadPos = position - scrollLeft + 40;
    if (playHeadPos >= canvasBoudingX) {
      const scrollDivWidth = horizontalScrollbar.clientWidth;
      const totalScrollWidth = horizontalScrollbar.scrollWidth;
      const currentPosScroll = horizontalScrollbar.scrollLeft;
      const availableScroll =
        totalScrollWidth - (scrollDivWidth + currentPosScroll);
      const scaleScroll = availableScroll / scrollDivWidth;
      if (scaleScroll >= 0) {
        if (scaleScroll > 1)
          horizontalScrollbar.scrollTo({
            left: currentPosScroll + scrollDivWidth
          });
        else
          horizontalScrollbar.scrollTo({
            left: totalScrollWidth - scrollDivWidth
          });
      }
    }
  }, [currentTime]);

  const onResizeCanvas = (payload: { width: number; height: number }) => {
    setCanvasSize({
      width: payload.width,
      height: payload.height
    });
  };

  useEffect(() => {
    const timelineContainerEl = timelineContainerRef.current;
    if (!timelineContainerEl || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { height, width } = entry.contentRect;
      const containerWidth = width - timelineOffsetX;
      const containerHeight = height - 50 - 40; // 50 is header, 40 is ruler

      canvasRef.current?.resize(
        {
          width: containerWidth,
          height: containerHeight
        },
        { force: true }
      );

      setCanvasSize({ width: containerWidth, height: containerHeight });
    });

    resizeObserver.observe(timelineContainerEl);
    return () => resizeObserver.disconnect();
  }, [timelineOffsetX]);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const timelineContainerEl = timelineContainerRef.current;

    if (!canvasEl || !timelineContainerEl) return;

    const containerWidth =
      (document.getElementById("timeline-header")?.clientWidth || 0) -
      timelineOffsetX;
    const containerHeight = timelineHeight - 50 - 40;
    const canvas = new CanvasTimeline(canvasEl, {
      width: containerWidth,
      height: containerHeight,
      bounding: {
        width: containerWidth,
        height: 0
      },
      selectionColor: "rgba(0, 216, 214,0.1)",
      selectionBorderColor: "rgba(0, 216, 214,1.0)",
      onResizeCanvas,
      scale: scale,
      duration: duration * 1_000_000,
      spacing: {
        left: 16,
        right: 40
      },
      sizesMap: {
        caption: 32,
        text: 32,
        audio: 36,
        video: 48,
        image: 48,
        customTrack: 40,
        customTrack2: 40,
        linealAudioBars: 40,
        radialAudioBars: 40,
        waveAudioBars: 40,
        hillAudioBars: 40,
        main: 48
      },
      itemTypes: [
        "text",
        "image",
        "audio",
        "video",
        "caption",
        "helper",
        "track",
        "composition",
        "template",
        "linealAudioBars",
        "radialAudioBars",
        "progressFrame",
        "progressBar",
        "waveAudioBars",
        "hillAudioBars"
      ],
      acceptsMap: {
        text: ["text", "caption"],
        image: ["image", "video"],
        main: ["image", "video"],
        video: ["video", "image"],
        audio: ["audio"],
        caption: ["caption", "text"],
        template: ["template"],
        customTrack: ["video", "image"],
        customTrack2: ["video", "image"],
        linealAudioBars: ["audio", "linealAudioBars"],
        radialAudioBars: ["audio", "radialAudioBars"],
        waveAudioBars: ["audio", "waveAudioBars"],
        hillAudioBars: ["audio", "hillAudioBars"]
      },
      guideLineColor: "#ffffff"
    });

    canvas.initScrollbars({
      offsetX: 16,
      offsetY: 0,
      extraMarginX: 50,
      extraMarginY: 0,
      scrollbarWidth: 8,
      scrollbarColor: "rgba(33, 33, 33, 0.8)"
    });


    canvas.onViewportChange((left: number) => {
      setScrollLeft(left + 16);
    });

    canvasRef.current = canvas;

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setTimeline(canvas);

    return () => {
      canvas.purge();
    };
  }, []);

  useEffect(() => {
    if (!studio || !timeline) return;

    console.log("Studio ready, adding studio events", studio);
    const disposeStudioSync = addStudioSync(studio, timeline);

    return () => {
      disposeStudioSync();
    };
  }, [studio, timeline]);

  const onClickRuler = (units: number) => {
    const timeUs = unitsToTimeUs(units, scale.zoom);
    projectStore.getState().seek(timeUs);
  };

  const onRulerScroll = (newScrollLeft: number) => {
    // Update the timeline canvas scroll position
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollTo({ scrollLeft: newScrollLeft });
    }

    // Update the horizontal scrollbar position
    if (horizontalScrollbarVpRef.current) {
      horizontalScrollbarVpRef.current.scrollLeft = newScrollLeft;
    }

    // Update the local scroll state
    setScrollLeft(newScrollLeft);
  };

  useEffect(() => {
    const availableScroll = horizontalScrollbarVpRef.current?.scrollWidth;
    if (!availableScroll || !canvasRef.current) return;

    // Sync scale to the timeline engine
    canvasRef.current.syncScale({ scale });

    const canvasWidth = canvasRef.current.width;
    if (availableScroll < canvasWidth + scrollLeft) {
      canvasRef.current.scrollTo({ scrollLeft: availableScroll - canvasWidth });
    }
  }, [scale]);

  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const isTouchScale = Math.floor(e.deltaY) !== Math.ceil(e.deltaY);
        const speed = isTouchScale ? 0.99 : 0.998;
        const oldZoom = scale.zoom;
        let newZoom = oldZoom * speed ** e.deltaY;

        const clampedZoom = Math.max(0.1, Math.min(10, newZoom));

        if (oldZoom !== clampedZoom) {
          setScale(prev => ({ ...prev, zoom: clampedZoom }));
          // Adjust scrollLeft to keep the cursor fixed
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const cursorX = e.clientX - rect.left - timelineOffsetX;
            const newScrollLeft =
              (cursorX + scrollLeft - 16) *
              (clampedZoom / oldZoom) -
              (cursorX - 16);
            onRulerScroll(newScrollLeft);
          }
        }
      } else {
        const delta = e.shiftKey ? e.deltaY : e.deltaX || e.deltaY;
        if (delta !== 0) {
          // We don't preventDefault here to allow native-like scroll feeling, 
          // but we manualy sync the scroll position.
          // Actually, since overflow is hidden, we SHOULD preventDefault to take over.
          e.preventDefault();
          onRulerScroll(scrollLeft + delta);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [scale, timelineContainerRef, scrollLeft, onRulerScroll]);

  return (
    <div
      ref={timelineContainerRef}
      id="timeline-container"
      className="relative w-full overflow-hidden bg-card"
      style={{
        height: `${timelineHeight}px`,
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "transparent"
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseOut={onMouseOut}
    >
      <Header scale={scale} setScale={setScale} />
      <Ruler
        scale={scale}
        onClick={onClickRuler}
        scrollLeft={scrollLeft}
        onScroll={onRulerScroll}
      />
      <Playhead scale={scale} scrollLeft={scrollLeft} />
      <div className="flex">
        <div
          style={{
            width: timelineOffsetX
          }}
          className="relative flex-none"
        />
        <div style={{ height: canvasSize.height }} className="relative flex-1">
          <canvas id="designcombo-timeline-canvas" ref={canvasElRef} />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
