"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { projectStore, core } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";
import { useEphemeralClip } from "@/hooks/use-ephemeral-clip";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { IconLink, IconArrowsLeftRight, IconAlignCenter, IconSquare } from "@tabler/icons-react";

interface TransformPropertyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onXChange: (val: number) => void;
  onYChange: (val: number) => void;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
}

export function TransformProperty({
  x,
  y,
  width,
  height,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
}: TransformPropertyProps) {
  const { selectedClips } = useStudioStore();
  const clip = selectedClips[0];
  const coreClipBase = useStore(projectStore, (s) => (clip?.id ? s.clips[clip.id] : null));
  const coreClip = useEphemeralClip(clip?.id || "", coreClipBase ?? clip) as any;

  const [isLocked, setIsLocked] = useState(false);
  const ratioRef = useRef(1);
  const [activeLayout, setActiveLayout] = useState("stretch");

  // Sync aspect ratio when not locked
  useEffect(() => {
    if (!isLocked && width && height) {
      ratioRef.current = width / height;
    }
  }, [width, height, isLocked]);

  const handleWidthChange = (val: number) => {
    onWidthChange(val);
    if (isLocked && ratioRef.current) {
      onHeightChange(Math.round(val / ratioRef.current));
    }
  };

  const handleHeightChange = (val: number) => {
    onHeightChange(val);
    if (isLocked && ratioRef.current) {
      onWidthChange(Math.round(val * ratioRef.current));
    }
  };

  const angle = Math.round(coreClip?.angle ?? coreClip?.transform?.angle ?? 0);

  const handleAngleChange = (val: number) => {
    if (clip?.id) {
      const transform = coreClip?.transform || {};
      core.clip.update(clip.id, {
        angle: val,
        transform: { ...transform, angle: val },
      });
    }
  };

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Size and position</span>
      </div>

      {/* Grid containing X, Y, W, H, Rotation, Layout and buttons */}
      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
        {/* Row 1: X & Y */}
        <div className="flex items-center gap-2.5 px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all">
          <span className="text-xs font-semibold text-muted-foreground select-none w-3">X</span>
          <NumberInput
            value={Math.round(x)}
            onChange={onXChange}
            className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex items-center gap-2.5 px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all">
          <span className="text-xs font-semibold text-muted-foreground select-none w-3">Y</span>
          <NumberInput
            value={Math.round(y)}
            onChange={onYChange}
            className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
          />
        </div>

        <div className="w-8 h-8" />

        {/* Row 2: W & H with aspect ratio lock */}
        <div className="flex items-center gap-2.5 px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all">
          <span className="text-xs font-semibold text-muted-foreground select-none w-3">W</span>
          <NumberInput
            value={Math.round(width)}
            onChange={handleWidthChange}
            className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex items-center gap-2.5 px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all">
          <span className="text-xs font-semibold text-muted-foreground select-none w-3">H</span>
          <NumberInput
            value={Math.round(height)}
            onChange={handleHeightChange}
            className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
          />
        </div>

        <Button
          type="button"
          variant={isLocked ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setIsLocked(!isLocked)}
          className="h-8 w-8 border border-border/40"
        >
          <IconLink className="size-4 rotate-45" />
        </Button>
      </div>
    </div>
  );
}
