'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, Music, TypeIcon, SparklesIcon, Image } from 'lucide-react';
import { useTimelineStore } from '@/stores/timeline-store';
import { usePlaybackStore } from '@/stores/playback-store';

import { useTimelineZoom } from '@/hooks/use-timeline-zoom';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  // Timeline shows all tracks (video, audio, effects) and their elements.
  // You can drag media here to add it to your project.
  // elements can be trimmed, deleted, and moved.

  const { tracks, clips, getTotalDuration } = useTimelineStore();
  const { duration, seek, setDuration } = usePlaybackStore();

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
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);
  const timelineCanvasRef = useRef<TimelineCanvas | null>(null);
  const isUpdatingRef = useRef(false);
  const lastRulerSync = useRef(0);
  const lastVerticalSync = useRef(0);

  const handleMoveElementToNewTrack = useCallback(
    (elementId: string, targetIndex: number) => {
      // Find the element and its current track
      // With normalized store, we probably need a way to look up clip -> track, or iterate.
      // Since clipId is unique, we find which track has it.
      let currentTrackId: string | null = null;
      let elementType: any = null;

      for (const track of tracks) {
        if (track.clipIds.includes(elementId)) {
          currentTrackId = track.id;
          elementType = track.type;
          break;
        }
      }

      if (!currentTrackId) {
        console.error('Element not found for move:', elementId);
        return;
      }
    },
    [tracks]
  );

  const handleMoveElementToTrack = useCallback(
    (elementId: string, targetTrackId: string) => {
      let currentTrackId: string | null = null;

      for (const track of tracks) {
        if (track.clipIds.includes(elementId)) {
          currentTrackId = track.id;
          break;
        }
      }
    },
    [tracks]
  );

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
  useEffect(() => {
    const rulerViewport = rulerScrollRef.current;
    const trackLabelsViewport = trackLabelsScrollRef.current;

    if (!rulerViewport) return;

    const updateCanvasScroll = () => {
      const scrollX = rulerViewport.scrollLeft;
      const scrollY = trackLabelsViewport?.scrollTop || 0;
      timelineCanvasRef.current?.setScroll(scrollX, scrollY);
    };

    // Horizontal scroll synchronization (Ruler -> Canvas)
    const handleRulerScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastRulerSync.current < 16) return;
      lastRulerSync.current = now;
      isUpdatingRef.current = true;
      updateCanvasScroll();
      isUpdatingRef.current = false;
    };

    rulerViewport.addEventListener('scroll', handleRulerScroll);

    // Vertical scroll synchronization (Labels -> Canvas)
    if (trackLabelsViewport) {
      const handleTrackLabelsScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        updateCanvasScroll();
        isUpdatingRef.current = false;
      };

      trackLabelsViewport.addEventListener('scroll', handleTrackLabelsScroll);

      return () => {
        rulerViewport.removeEventListener('scroll', handleRulerScroll);
        trackLabelsViewport.removeEventListener(
          'scroll',
          handleTrackLabelsScroll
        );
      };
    }

    return () => {
      rulerViewport.removeEventListener('scroll', handleRulerScroll);
    };
  }, []);

  useEffect(() => {
    const canvas = new TimelineCanvas('timeline-canvas');
    timelineCanvasRef.current = canvas;

    // Set up UI event listeners (scroll/zoom)
    canvas.on('scroll', ({ deltaX, deltaY }) => {
      if (rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft += deltaX;
      }
      if (trackLabelsScrollRef.current && deltaY !== 0) {
        trackLabelsScrollRef.current.scrollTop += deltaY;
      }
    });

    canvas.on('zoom', ({ delta }) => {
      handleWheel({
        ctrlKey: true,
        deltaY: delta,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as any);
    });

    canvas.on('viewport:changed', ({ scrollX, scrollY }) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;
      if (rulerScrollRef.current) {
        if (Math.abs(rulerScrollRef.current.scrollLeft - scrollX) > 1) {
          rulerScrollRef.current.scrollLeft = scrollX;
        }
      }
      if (trackLabelsScrollRef.current) {
        if (Math.abs(trackLabelsScrollRef.current.scrollTop - scrollY) > 1) {
          trackLabelsScrollRef.current.scrollTop = scrollY;
        }
      }
      isUpdatingRef.current = false;
    });

    canvas.setTracks(tracks);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (timelineCanvasRef.current) {
      timelineCanvasRef.current.setTimeScale(zoomLevel);
      timelineCanvasRef.current.setTracks(tracks);
    }
  }, [zoomLevel, tracks, clips]);

  const handleDelete = useCallback(() => {
    timelineCanvasRef.current?.deleteSelectedClips();
  }, []);

  const handleDuplicate = useCallback(() => {
    timelineCanvasRef.current?.duplicateSelectedClips();
  }, []);

  const handleSplit = useCallback(() => {
    // Current time is in seconds in PlaybackStore. Canvas expects microseconds.
    const splitTime = usePlaybackStore.getState().currentTime * 1_000_000;
    timelineCanvasRef.current?.splitSelectedClip(splitTime);
  }, []);

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
                const tracksViewport = tracksScrollRef.current;
                if (tracksViewport) {
                  tracksViewport.scrollLeft = (
                    e.currentTarget as HTMLDivElement
                  ).scrollLeft;
                }
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
              className="w-10 shrink-0 overflow-y-auto"
              data-track-labels
            >
              <div
                className="w-full h-full overflow-hidden"
                ref={trackLabelsScrollRef}
              >
                <div className="flex flex-col">
                  {tracks.map((track, index) => (
                    <div key={track.id}>
                      {/* Top separator for first track */}
                      {index === 0 && (
                        <div
                          className="w-full"
                          style={{
                            height: `${TIMELINE_CONSTANTS.TRACK_SPACING}px`,
                            marginBottom: '0px',
                            background: 'transparent',
                          }}
                        />
                      )}

                      <div
                        className="flex items-center px-3 group bg-zinc-800"
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
                </div>
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
