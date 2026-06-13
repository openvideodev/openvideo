"use client";

import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";

interface TransitionDurationPropertyProps {
  value: number; // in microseconds
  min: number; // in microseconds
  max: number; // in microseconds
  onChange: (val: number) => void;
}

export function TransitionDurationProperty({
  value,
  min,
  max,
  onChange,
}: TransitionDurationPropertyProps) {
  const minSeconds = min / 1_000_000;
  const maxSeconds = max / 1_000_000;

  const [localValue, setLocalValue] = useState(value / 1_000_000);
  const [inputStr, setInputStr] = useState((value / 1_000_000).toFixed(1));
  const isEditing = useRef(false);

  // Sync from parent only when not editing
  useEffect(() => {
    if (!isEditing.current) {
      const secs = value / 1_000_000;
      setLocalValue(secs);
      setInputStr(secs.toFixed(1));
    }
  }, [value]);

  const handleCommit = (seconds: number) => {
    const fps = 30;
    let frameCount = Math.round(seconds * fps);
    if (frameCount % 2 !== 0) frameCount += 1;
    const snapped = (frameCount / fps) * 1_000_000;
    onChange(snapped);
  };

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Transition</span>
      </div>

      {/* Row containing label, value input, and slider */}
      <div className="flex items-center gap-3.5">
        <span className="text-xs text-muted-foreground w-16 select-none font-medium">Duration</span>

        {/* Value Input Box */}
        <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[68px] px-2.5 transition-all">
          <input
            type="text"
            value={`${localValue.toFixed(1)}s`}
            onFocus={() => {
              isEditing.current = true;
            }}
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/[^0-9.]/g, "");
              setInputStr(cleanVal);
              const val = parseFloat(cleanVal);
              if (!isNaN(val)) {
                setLocalValue(val);
              }
            }}
            onBlur={() => {
              isEditing.current = false;
              const val = parseFloat(inputStr);
              if (!isNaN(val)) {
                const clamped = Math.min(maxSeconds, Math.max(minSeconds, val));
                handleCommit(clamped);
                setLocalValue(clamped);
                setInputStr(clamped.toFixed(1));
              } else {
                setInputStr(localValue.toFixed(1));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
          />
        </div>

        {/* Slider */}
        <Slider
          value={[localValue]}
          onValueChange={(v) => {
            setLocalValue(v[0]);
            setInputStr(v[0].toFixed(1));
          }}
          onValueCommit={(v) => handleCommit(v[0])}
          max={maxSeconds}
          min={minSeconds}
          step={0.1}
          className="flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
}
