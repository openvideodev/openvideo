"use client";

import { Slider } from "@/components/ui/slider";
import { useSliderThrottle } from "../hooks/use-slider-throttle";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

interface OpacityPropertyProps {
  value: number;
  onChange: (val: number) => void;
}

export function OpacityProperty({ value, onChange }: OpacityPropertyProps) {
  // Work in 0–100 percentage space internally
  const toPercent = (v: number) => Math.round(v * 100);
  const fromPercent = (v: number) => v / 100;

  const { localValue, handleChange, handleCommit, handleDirectSet } = useSliderThrottle(
    toPercent(value),
    (pct) => onChange(fromPercent(pct)),
  );

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Opacity</span>
      </div>

      {/* Row containing value, slider, and visibility toggle */}
      <div className="flex items-center gap-3.5">
        {/* Value Input Box */}
        <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[68px] px-2.5 transition-all">
          <input
            type="text"
            value={`${localValue}%`}
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/[^0-9]/g, "");
              const parsed = parseInt(cleanVal);
              if (!isNaN(parsed)) {
                handleDirectSet(Math.min(100, Math.max(0, parsed)));
              } else if (cleanVal === "") {
                handleDirectSet(0);
              }
            }}
            className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
          />
        </div>

        {/* Slider */}
        <Slider
          value={[localValue]}
          onValueChange={(v) => handleChange(v[0])}
          onValueCommit={(v) => handleCommit(v[0])}
          max={100}
          step={1}
          className="flex-1 cursor-pointer"
        />

        {/* Eye/Visibility Toggle */}
        <button
          type="button"
          onClick={() => {
            // Toggle between 0 opacity and 1 opacity
            onChange(value === 0 ? 1 : 0);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          {value === 0 ? (
            <IconEyeOff className="size-4 stroke-[2]" />
          ) : (
            <IconEye className="size-4 stroke-[2]" />
          )}
        </button>
      </div>
    </div>
  );
}
