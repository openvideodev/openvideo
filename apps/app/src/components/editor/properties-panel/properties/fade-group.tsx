"use client";

import { Slider } from "@/components/ui/slider";
import { useSliderThrottle } from "../hooks/use-slider-throttle";

interface FadeGroupPropertyProps {
  fadeInDuration: number;
  fadeOutDuration: number;
  onFadeInChange: (val: number) => void;
  onFadeOutChange: (val: number) => void;
  max?: number;
}

export function FadeGroupProperty({
  fadeInDuration,
  fadeOutDuration,
  onFadeInChange,
  onFadeOutChange,
  max = 5000,
}: FadeGroupPropertyProps) {
  const fadeIn = useSliderThrottle(fadeInDuration, onFadeInChange);
  const fadeOut = useSliderThrottle(fadeOutDuration, onFadeOutChange);

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-4 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Fade</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {/* Fade In */}
        <div className="flex items-center gap-3.5">
          {/* Label inside the row layout */}
          <span className="text-xs text-muted-foreground w-16 select-none font-medium">
            Fade-in
          </span>

          {/* Value Input Box */}
          <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[80px] px-2.5 transition-all">
            <input
              type="text"
              value={`${fadeIn.localValue}ms`}
              onChange={(e) => {
                const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                const parsed = parseInt(cleanVal);
                if (!isNaN(parsed)) {
                  fadeIn.handleDirectSet(Math.min(max, Math.max(0, parsed)));
                } else if (cleanVal === "") {
                  fadeIn.handleDirectSet(0);
                }
              }}
              className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
            />
          </div>

          {/* Slider */}
          <Slider
            value={[fadeIn.localValue]}
            onValueChange={(v) => fadeIn.handleChange(v[0])}
            onValueCommit={(v) => fadeIn.handleCommit(v[0])}
            min={0}
            max={max}
            step={100}
            className="flex-1 cursor-pointer"
          />
        </div>

        {/* Fade Out */}
        <div className="flex items-center gap-3.5">
          {/* Label inside the row layout */}
          <span className="text-xs text-muted-foreground w-16 select-none font-medium">
            Fade-out
          </span>

          {/* Value Input Box */}
          <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[80px] px-2.5 transition-all">
            <input
              type="text"
              value={`${fadeOut.localValue}ms`}
              onChange={(e) => {
                const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                const parsed = parseInt(cleanVal);
                if (!isNaN(parsed)) {
                  fadeOut.handleDirectSet(Math.min(max, Math.max(0, parsed)));
                } else if (cleanVal === "") {
                  fadeOut.handleDirectSet(0);
                }
              }}
              className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
            />
          </div>

          {/* Slider */}
          <Slider
            value={[fadeOut.localValue]}
            onValueChange={(v) => fadeOut.handleChange(v[0])}
            onValueCommit={(v) => fadeOut.handleCommit(v[0])}
            min={0}
            max={max}
            step={100}
            className="flex-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
