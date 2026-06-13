"use client";

import { Slider } from "@/components/ui/slider";
import { useSliderThrottle } from "../hooks/use-slider-throttle";

interface RotationPropertyProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}

export function RotationProperty({ value, onChange, max = 360 }: RotationPropertyProps) {
  const { localValue, handleChange, handleCommit, handleDirectSet } = useSliderThrottle(
    Math.round(value),
    onChange,
  );

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Rotation</span>
      </div>

      {/* Row containing value and slider */}
      <div className="flex items-center gap-3.5">
        {/* Value Input Box */}
        <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[68px] px-2.5 transition-all">
          <input
            type="text"
            value={`${localValue}°`}
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/[^0-9-]/g, "");
              const parsed = parseInt(cleanVal);
              if (!isNaN(parsed)) {
                handleDirectSet(Math.min(max, Math.max(-360, parsed)));
              } else if (cleanVal === "" || cleanVal === "-") {
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
          max={max}
          step={1}
          className="flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
}
