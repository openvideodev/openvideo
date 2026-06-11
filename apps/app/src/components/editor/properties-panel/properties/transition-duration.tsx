"use client";

import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Transition</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        {/* Duration row */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Duration</span>
          <div className="flex items-center gap-2 w-[130px]">
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
              className="flex-1"
            />
            <InputGroup className="w-16">
              <InputGroupInput
                type="number"
                value={inputStr}
                onFocus={() => {
                  isEditing.current = true;
                }}
                onChange={(e) => {
                  setInputStr(e.target.value);
                  const val = parseFloat(e.target.value);
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
                    // Reset to current value
                    setInputStr(localValue.toFixed(1));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="text-xs! p-0 text-center"
              />
              <InputGroupAddon align="inline-end" className="p-0 pr-2">
                <span className="text-[10px] text-muted-foreground">s</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
