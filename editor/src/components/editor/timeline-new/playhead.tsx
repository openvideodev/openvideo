import { usePlaybackStore } from "@/stores/playback-store";
import {
  MouseEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { timeUsToUnits, unitsToTimeUs, ITimelineScaleState } from "@openvideo/timeline";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useTheme } from "next-themes";
const Playhead = ({
  scrollLeft,
  scale
}: {
  scrollLeft: number;
  scale: ITimelineScaleState;
}) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const { currentTime, seek } = usePlaybackStore();
  const position =
    timeUsToUnits(currentTime * 1_000_000, scale.zoom) - scrollLeft;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(position);
  const timelineOffsetX = useTimelineOffsetX();

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const currentTheme = useMemo(() => {
    if (!mounted) return "light";
    return (theme === "system" ? resolvedTheme : theme) as "dark" | "light";
  }, [mounted, theme, resolvedTheme]);

  const color = useMemo(() => {
    return currentTheme === "dark" ? "#ffffff" : "#000000";
  }, [currentTheme]);
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (
    e:
      | MouseEvent<HTMLDivElement, globalThis.MouseEvent>
      | TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault(); // Prevent default drag behavior
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartPosition(position);
  };

  const handleMouseMove = (
    e: globalThis.MouseEvent | globalThis.TouchEvent
  ) => {
    if (isDragging) {
      e.preventDefault(); // Prevent default drag behavior
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragStartX + scrollLeft;
      const newPosition = dragStartPosition + delta;

      const timeUs = unitsToTimeUs(newPosition, scale.zoom);
      seek(timeUs / 1_000_000);
    }
  };

  useEffect(() => {
    const preventDefaultDrag = (e: Event) => {
      e.preventDefault();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.addEventListener("dragstart", preventDefaultDrag);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    }

    // Cleanup event listeners on component unmount
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={playheadRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      id="playhead"
      style={{
        position: "absolute",
        left: timelineOffsetX + 16 + position,
        top: 50,
        width: 1,
        height: "calc(100% - 50px)",
        zIndex: 10,
        cursor: "pointer",
        touchAction: "none" // Prevent default touch actions
      }}
    >
      <div
        id="playhead-handle"
        style={{
          borderRadius: "0 0 4px 4px",
          backgroundColor: color
        }}
        className="absolute top-0 h-4 w-2 -translate-x-1/2 transform text-xs font-semibold text-zinc-800"
      />
      <div className="relative h-full">
        <div className="absolute top-0 h-full w-3 -translate-x-1/2 transform" />
        <div
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 transform"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default Playhead;
