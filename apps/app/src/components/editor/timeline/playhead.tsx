import { useStore } from "zustand";
import { projectStore } from "@/lib/project";
import { MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { timeUsToUnits, unitsToTimeUs, ITimelineScaleState } from "@openvideo/timeline";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";

const Playhead = ({ scrollLeft, scale }: { scrollLeft: number; scale: ITimelineScaleState }) => {
  const currentTimeUs = useStore(projectStore, (s) => s.currentTime);
  const timelineOffsetX = useTimelineOffsetX();

  // Track drag state in a ref to avoid closure issues
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startTimeUs: 0,
  });

  // Local state for optimistic UI updates (smooth dragging)
  const [localTimeUs, setLocalTimeUs] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Determine which time to use for visual positioning
  const displayTimeUs = localTimeUs !== null ? localTimeUs : currentTimeUs;

  const position = useMemo(() => {
    return timeUsToUnits(displayTimeUs, scale.zoom) - scrollLeft;
  }, [displayTimeUs, scale.zoom, scrollLeft]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const color = "#ffffff";

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent | any) => {
      if (!dragRef.current.isDragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragRef.current.startX;

      // Calculate new time based on pixel delta
      const deltaTimeUs = unitsToTimeUs(deltaX, scale.zoom);
      const newTimeUs = Math.max(0, dragRef.current.startTimeUs + deltaTimeUs);

      // 1. Update local state for INSTANT visual response
      setLocalTimeUs(newTimeUs);

      // 2. Update CORE state (source of truth)
      projectStore.getState().seek(newTimeUs);
    },
    [scale.zoom],
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      setLocalTimeUs(null);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    }
  }, [handleMouseMove]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clientX = (e as any).touches ? (e as any).touches[0].clientX : (e as any).clientX;

    // Capture current state at the moment of interaction
    const startTimeUs = projectStore.getState().currentTime;

    dragRef.current = {
      isDragging: true,
      startX: clientX,
      startTimeUs: startTimeUs,
    };

    setIsDragging(true);
    setLocalTimeUs(startTimeUs);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      id="playhead"
      style={{
        position: "absolute",
        left: timelineOffsetX + 16 + position,
        top: 50,
        width: 1,
        height: "calc(100% - 50px)",
        zIndex: 10,
        cursor: "ew-resize",
        touchAction: "none",
      }}
    >
      {/* Handle */}
      <div
        style={{
          borderRadius: "0 0 4px 4px",
          backgroundColor: isDragging ? "#ffffff" : "#000000",
          height: "16px",
          width: "10px",
          transform: "translateX(-50%)",
          cursor: isDragging ? "grabbing" : "grab",
          borderColor: "#ffffff",
          borderWidth: 1,
          zIndex: 20,
        }}
        className="absolute top-0 flex items-center justify-center shadow-lg"
      ></div>

      {/* Line */}
      <div className="relative h-full pointer-events-none">
        <div
          className="absolute top-0 h-full w-[1px] -translate-x-1/2 transform shadow-sm"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default Playhead;
