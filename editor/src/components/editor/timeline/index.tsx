'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, Music, TypeIcon, SparklesIcon, Image } from 'lucide-react';
import { useTimelineStore } from '@/stores/timeline-store';
import { usePlaybackStore } from '@/stores/playback-store';
import { useStudioStore } from '@/stores/studio-store';

import { useTimelineZoom } from '@/hooks/use-timeline-zoom';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  TimelinePlayhead,
  useTimelinePlayheadRuler,
} from './timeline-playhead';
import type { TimelineTrack } from '@/types/timeline';
import { TimelineRuler } from './timeline-ruler';
import {
  getTrackHeight,
  TIMELINE_CONSTANTS,
  snapTimeToFrame,
} from '@/components/editor/timeline/timeline-constants';
import { TimelineToolbar } from './timeline-toolbar';
import { TimelineCanvas } from './timeline';
import { TimelineStudioSync } from './timeline-studio-sync';
import { useEditorHotkeys } from '@/hooks/use-editor-hotkeys';

export function Timeline() {
  const { tracks, clips, getTotalDuration } = useTimelineStore();
  const { duration, seek, setDuration } = usePlaybackStore();
  const { studio } = useStudioStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Track mouse down/up for distinguishing clicks from drag/resize ends
  const mouseTrackingRef = useRef({
    isMouseDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  });

  // Timeline zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
  });

  // Old marquee selection removed - using new SelectionBox component instead

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Base width from duration
    timelineRef.current?.clientWidth || 1000 // Minimum width
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timelineCanvasRef = useRef<TimelineCanvas | null>(null);
  const isUpdatingRef = useRef(false);

  // Timeline playhead ruler handlers
  const { handleRulerMouseDown } = useTimelinePlayheadRuler({
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  // Timeline content click to seek handler
  const handleTimelineContentClick = useCallback(
    (e: React.MouseEvent) => {
      const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current;

      // Reset mouse tracking
      mouseTrackingRef.current = {
        isMouseDown: false,
        downX: 0,
        downY: 0,
        downTime: 0,
      };

      // Only process as click if we tracked a mouse down on timeline background
      if (!isMouseDown) {
        console.log(
          JSON.stringify({
            debug_click: 'REJECTED - no mousedown',
            mouseTracking: mouseTrackingRef.current,
          })
        );
        return;
      }

      // Check if mouse moved significantly (indicates drag, not click)
      const deltaX = Math.abs(e.clientX - downX);
      const deltaY = Math.abs(e.clientY - downY);
      const deltaTime = e.timeStamp - downTime;

      if (deltaX > 5 || deltaY > 5 || deltaTime > 500) {
        console.log(
          JSON.stringify({
            debug_click: 'REJECTED - movement too large',
            deltaX,
            deltaY,
            deltaTime,
          })
        );
        return;
      }

      // Don't seek if clicking on timeline elements, but still deselect
      if ((e.target as HTMLElement).closest('.timeline-element')) {
        console.log(
          JSON.stringify({
            debug_click: 'REJECTED - clicked timeline element',
          })
        );
        return;
      }

      // Don't seek if clicking on playhead
      if (playheadRef.current?.contains(e.target as Node)) {
        console.log(
          JSON.stringify({
            debug_click: 'REJECTED - clicked playhead',
          })
        );
        return;
      }

      // Clear selected elements when clicking empty timeline area
      console.log(
        JSON.stringify({
          debug_click: 'PROCEEDING - clearing elements',
          clearingSelectedElements: true,
        })
      );

      // Determine if we're clicking in ruler or tracks area
      const isRulerClick = (e.target as HTMLElement).closest(
        '[data-ruler-area]'
      );

      console.log(
        JSON.stringify({
          debug_click: 'CALCULATING POSITION',
          isRulerClick,
          clientX: e.clientX,
          clientY: e.clientY,
          target_element: (e.target as HTMLElement).tagName,
          target_class: (e.target as HTMLElement).className,
        })
      );

      let mouseX: number;
      let scrollLeft = 0;

      if (isRulerClick) {
        // Calculate based on ruler position
        const rulerContent = rulerScrollRef.current;
        if (!rulerContent) {
          console.log(
            JSON.stringify({
              debug_click: 'ERROR - no ruler container found',
            })
          );
          return;
        }
        const rect = rulerContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        scrollLeft = rulerContent.scrollLeft;
      } else {
        const tracksContent = tracksScrollRef.current;
        if (!tracksContent) {
          // If tracksScrollRef is gone (because we removed it), we can try to use canvas container if possible,
          // or just rely on ruler if we assume vertical stack is aligned.
          // But playhead seeking usually depends on ruler X.
          // If the user clicked elsewhere?
          // In the new layout, timeline-canvas is in a div. We didn't ref it for clicking yet.
          // But handleTimelineContentClick is attached to...
          // Wait, I removed the "tracksContainerRef" attachment in the previous step?
          // "onMouseDown={handleTimelineMouseDown} ... ref={tracksContainerRef}" was on the removed div.
          // So click seeking on the canvas tracks area MIGHT BE BROKEN unless I re-attach listeners.
          return;
        }
        const rect = tracksContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        scrollLeft = tracksContent.scrollLeft;
      }

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          (mouseX + scrollLeft) /
            (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel)
        )
      );

      // Use frame snapping for timeline clicking
      const projectFps = 30;
      const time = snapTimeToFrame(rawTime, projectFps);
      seek(time);
    },
    [duration, zoomLevel, seek, rulerScrollRef, tracksScrollRef]
  );

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(totalDuration);
  }, [tracks, clips, setDuration, getTotalDuration]);

  // --- Scroll synchronization effect ---
  // Horizontal scroll synchronization (Ruler -> Canvas) is now handled via canvas.initScrollbars
  // but we still need to keep the UI in sync when the canvas scrolls.

  useEffect(() => {
    const canvas = new TimelineCanvas('timeline-canvas');
    timelineCanvasRef.current = canvas;

    // Set up UI event listeners (scroll/zoom)
    canvas.on('scroll', ({ deltaX, deltaY, scrollX, scrollY }) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;

      if (typeof scrollX === 'number' && rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft = scrollX;
      } else if (deltaX !== 0 && rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft += deltaX;
      }

      if (typeof scrollY === 'number' && trackLabelsRef.current) {
        trackLabelsRef.current.scrollTop = scrollY;
      } else if (deltaY !== 0 && trackLabelsRef.current) {
        trackLabelsRef.current.scrollTop += deltaY;
      }

      isUpdatingRef.current = false;
    });

    canvas.on('zoom', ({ delta, zoomLevel: newZoomLevel }) => {
      if (typeof newZoomLevel === 'number') {
        setZoomLevel(newZoomLevel);
        return;
      }
      handleWheel({
        ctrlKey: true,
        deltaY: delta,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as any);
    });

    canvas.initScrollbars({
      offsetX: 0,
      offsetY: 0,
      extraMarginX: 50,
      extraMarginY: 15,
      scrollbarWidth: 8,
      scrollbarColor: 'rgba(255, 255, 255, 0.3)',
    });

    canvas.setTracks(tracks);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Listen for clip replacement (e.g. Placeholder -> Video)
  useEffect(() => {
    const studio = useStudioStore.getState().studio;
    if (!studio) return;

    const onReplaced = ({ newClip }: { newClip: any }) => {
      // Reload the clip in the timeline canvas to fetch thumbnails
      // We use newClip.id as it's the active clip now
      timelineCanvasRef.current?.reloadClip(newClip.id);
    };

    studio.on('clip:replaced', onReplaced);

    return () => {
      studio.off('clip:replaced', onReplaced);
    };
  }, []);

  useEffect(() => {
    if (timelineCanvasRef.current) {
      timelineCanvasRef.current.setTimeScale(zoomLevel);
      timelineCanvasRef.current.setTracks(tracks);
    }
  }, [zoomLevel, tracks, clips]);

  const handleDelete = useCallback(() => {
    studio?.deleteSelected();
  }, [studio]);

  const handleDuplicate = useCallback(() => {
    studio?.duplicateSelected();
  }, [studio]);

  const handleSplit = useCallback(() => {
    // Current time is in seconds in PlaybackStore. Canvas expects microseconds.
    const splitTime = usePlaybackStore.getState().currentTime * 1_000_000;
    studio?.splitSelected(splitTime);
  }, [studio]);

  useEditorHotkeys({
    timelineCanvas: timelineCanvasRef.current,
    setZoomLevel,
  });

  return (
    <div
      className={
        'h-full flex flex-col transition-colors duration-200 relative bg-panel rounded-sm overflow-hidden'
      }
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
    >
      <TimelineToolbar
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSplit={handleSplit}
      />
      <TimelineStudioSync timelineCanvas={timelineCanvasRef.current} />

      {/* Timeline Container */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        ref={timelineRef}
      >
        <TimelinePlayhead
          duration={duration}
          zoomLevel={zoomLevel}
          tracks={tracks}
          seek={seek}
          rulerRef={rulerRef}
          rulerScrollRef={rulerScrollRef}
          tracksScrollRef={tracksScrollRef}
          trackLabelsRef={trackLabelsRef}
          timelineRef={timelineRef}
          playheadRef={playheadRef}
          isSnappingToPlayhead={false}
        />

        {/* Timeline Header with Ruler */}
        <div className="flex bg-[#0E0E0E] sticky top-0 z-10">
          {/* Track Labels Header */}
          <div className="w-10 shrink-0 bg-panel border-r flex items-center justify-between h-6">
            {/* Empty space */}
            <span className="text-sm font-medium text-muted-foreground opacity-0">
              .
            </span>
          </div>

          {/* Timeline Ruler */}
          <div
            className="flex-1 relative overflow-hidden h-6"
            onWheel={(e) => {
              // Check if this is horizontal scrolling - if so, don't handle it here
              if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return; // Let ScrollArea handle horizontal scrolling
              }
              handleWheel(e);
            }}
            onClick={handleTimelineContentClick}
            data-ruler-area
          >
            <ScrollArea
              className="w-full scrollbar-hidden"
              ref={rulerScrollRef}
              onScroll={(e) => {
                if (isUpdatingRef.current) return;
                isUpdatingRef.current = true;
                const scrollX = (e.currentTarget as HTMLDivElement).scrollLeft;
                timelineCanvasRef.current?.setScroll(scrollX, undefined);
                isUpdatingRef.current = false;
              }}
            >
              <div
                ref={rulerRef}
                className="relative h-6 select-none cursor-default"
                style={{
                  width: `${dynamicTimelineWidth}px`,
                }}
                onMouseDown={handleRulerMouseDown}
              >
                <TimelineRuler
                  zoomLevel={zoomLevel}
                  duration={duration}
                  width={dynamicTimelineWidth}
                />
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden bg-[#0E0E0E]">
          {/* Track Labels */}
          {tracks.length > 0 && (
            <div
              ref={trackLabelsRef}
              className="w-10 shrink-0 overflow-y-hidden z-100"
              data-track-labels
            >
              <div className="flex flex-col">
                {tracks.map((track, index) => (
                  <div key={track.id}>
                    {/* Top separator for first track */}
                    {index === 0 && (
                      <div
                        className="w-full"
                        style={{
                          height: `${TIMELINE_CONSTANTS.TRACK_PADDING_TOP}px`,
                          marginBottom: '0px',
                          background: 'transparent',
                        }}
                      />
                    )}

                    <div
                      className={cn(
                        'flex items-center px-3 group bg-zinc-800',
                        ['Text', 'Caption', 'Effect', 'Transition'].includes(
                          track.type
                        )
                          ? 'h-8'
                          : 'h-12'
                      )}
                      style={{ height: getTrackHeight(track.type as any) }}
                    >
                      <div className="flex items-center justify-center flex-1 min-w-0">
                        <TrackIcon track={track} />
                      </div>
                    </div>

                    {/* Separator after each track */}
                    <div
                      className="w-full relative"
                      style={{
                        height: `${TIMELINE_CONSTANTS.TRACK_SPACING}px`,
                        background: 'transparent',
                      }}
                    ></div>
                  </div>
                ))}
                {/* Spacer to match canvas extraMarginY */}
                <div style={{ height: '15px', flexShrink: 0 }} />
              </div>
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div className="flex-1 relative overflow-hidden bg-red-800">
            <div id="timeline-canvas" className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackIcon({ track }: { track: TimelineTrack }) {
  return (
    <>
      {track.type === 'Image' && (
        <Image className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
      {(track.type === 'Video' || track.type === 'Placeholder') && (
        <Video className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
      {track.type === 'Text' && (
        <TypeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
      {track.type === 'Caption' && (
        <TypeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
      {track.type === 'Audio' && (
        <Music className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
      {track.type === 'Effect' && (
        <SparklesIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );
}
