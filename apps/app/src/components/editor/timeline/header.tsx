import { Button } from "@/components/ui/button";
import { frameToTimeString, timeToString } from "../utils/time";
import {
  IconTrash,
  IconCopy,
  IconScissors,
  IconPlus,
  IconMinus,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { useClipActions } from "../studio-context-menu";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useStore } from "zustand";
import { core, projectStore } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";
import { useEffect, useState } from "react";
import { ITimelineScaleState } from "@openvideo/timeline";
import { getFitZoomLevel } from "../utils/timeline";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} viewBox="0 0 24 24" fill="currentColor">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
  </svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} viewBox="0 0 24 24" fill="currentColor">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
  </svg>
);
const IconPlayerSkipBack = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M20 5v14l-12 -7z" />
    <path d="M4 5l0 14" />
  </svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5v14l12 -7z" />
    <path d="M20 5l0 14" />
  </svg>
);
const Header = ({
  scale,
  setScale,
}: {
  scale: ITimelineScaleState;
  setScale: (scale: ITimelineScaleState) => void;
}) => {
  const currentTimeUs = useStore(projectStore, (s) => s.currentTime);
  const isPlaying = useStore(projectStore, (s) => s.isPlaying);
  const durationUs = useStore(projectStore, (s) => s.settings.duration);
  const currentTime = currentTimeUs / 1_000_000;
  const duration = durationUs / 1_000_000;

  const { studio } = useStudioStore();
  const fps = useStore(projectStore, (s) => s.settings.fps);
  const { selectedClip, isLocked, handleDuplicate, handleDelete } = useClipActions();

  const handleSplit = () => {
    core.clip.split(currentTimeUs);
  };

  const changeScale = (newScale: ITimelineScaleState) => {
    setScale(newScale);
  };

  const handlePlay = () => core.play();
  const handlePause = () => core.pause();
  const handleSeek = (time: number) => core.seek(time * 1_000_000);

  return (
    <div
      id="timeline-header"
      style={{
        position: "relative",
        height: "50px",
        flex: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          height: 50,
          width: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            height: 36,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 260px 1fr",
            alignItems: "center",
          }}
        >
          <div className="flex px-2">
            <Button
              disabled={!selectedClip || isLocked}
              onClick={handleDelete}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <IconTrash size={14} />
            </Button>

            <Button
              disabled={!selectedClip || isLocked}
              onClick={handleSplit}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <IconScissors size={15} />
            </Button>
            <Button
              disabled={!selectedClip || isLocked}
              onClick={handleDuplicate}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <IconCopy size={15} />
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <div>
              <Button
                className="hidden lg:inline-flex"
                onClick={() => handleSeek(0)}
                variant={"ghost"}
                size={"icon"}
              >
                <IconChevronsLeft size={14} />
              </Button>
              <Button
                onClick={() => {
                  if (isPlaying) {
                    return handlePause();
                  }
                  handlePlay();
                }}
                variant={"ghost"}
                size={"icon"}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled size={14} />
                ) : (
                  <IconPlayerPlayFilled size={14} />
                )}
              </Button>
              <Button
                className="hidden lg:inline-flex"
                onClick={() => handleSeek(duration)}
                variant={"ghost"}
                size={"icon"}
              >
                <IconChevronsRight size={14} />
              </Button>
            </div>
            <div
              className="text-xs font-light flex"
              style={{
                alignItems: "center",
                gridTemplateColumns: "54px 4px 54px",
                paddingTop: "2px",
                justifyContent: "center",
              }}
            >
              <div
                className="font-medium text-zinc-200"
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
                data-current-time={currentTime}
                id="video-current-time"
              >
                {frameToTimeString({ frame: Math.floor(currentTime * fps) }, { fps })}
              </div>
              <span className="px-1">|</span>
              <div
                className="text-muted-foreground hidden lg:block"
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {timeToString({ time: durationUs })}
              </div>
            </div>
          </div>

          <ZoomControl scale={scale} onChangeTimelineScale={changeScale} duration={duration} />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration,
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
}) => {
  const timelineOffsetX = useTimelineOffsetX();
  const { selectedClip } = useClipActions();

  const onZoomOutClick = () => {
    const newZoom = Math.max(0.1, scale.zoom - 0.15);
    onChangeTimelineScale({ ...scale, zoom: newZoom });
  };

  const onZoomInClick = () => {
    const newZoom = Math.min(10, scale.zoom + 0.15);
    onChangeTimelineScale({ ...scale, zoom: newZoom });
  };

  const onZoomSetClick = (zoomVal: number) => {
    onChangeTimelineScale({ ...scale, zoom: zoomVal });
  };

  const onZoomFitClick = () => {
    const fitZoom = getFitZoomLevel(duration * 1_000_000, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  const onZoomFitCurrentSceneClick = () => {
    let fitDurationUs = duration * 1_000_000;
    if (selectedClip && selectedClip.display) {
      fitDurationUs = selectedClip.display.to - selectedClip.display.from;
    }
    const fitZoom = getFitZoomLevel(fitDurationUs, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  const onZoomToPlayheadClick = () => {
    onChangeTimelineScale({ ...scale, zoom: 2.0 });
  };

  return (
    <div className="flex items-center justify-end select-none px-4">
      <div className="flex items-center rounded-md px-1.5 py-0.5 gap-1 h-8">
        <Button onClick={onZoomOutClick} variant={"ghost"} size={"icon"}>
          <IconMinus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span className="text-xs font-medium text-zinc-300 min-w-[36px] text-center select-none">
              {Math.round(scale.zoom * 100)}%
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-zinc-950 border border-white/10 text-zinc-200"
          >
            <DropdownMenuItem
              onClick={onZoomInClick}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>Zoom in</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌘=
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onZoomOutClick}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>Zoom out</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌘-
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onZoomSetClick(1)}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>100%</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌘0
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onZoomFitClick}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>Fit in view</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌥⌘1
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onZoomFitCurrentSceneClick}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>Fit current scene</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌥⌘2
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onZoomToPlayheadClick}
              className="cursor-pointer flex justify-between items-center text-xs py-1.5"
            >
              <span>Zoom to playhead</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌥⌘3
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              className="opacity-50 flex justify-between items-center text-xs py-1.5"
            >
              <span>Fit selection</span>
              <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
                ⌥⌘4
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onZoomInClick} variant={"ghost"} size={"icon"}>
          <IconPlus />
        </Button>
      </div>
    </div>
  );
};

export default Header;
