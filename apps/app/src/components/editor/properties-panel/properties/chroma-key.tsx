"use client";

import { useState } from "react";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import color from "color";
import { useSliderThrottle } from "../hooks/use-slider-throttle";

interface ChromaKeyPropertyProps {
  enabled: boolean;
  color: string;
  similarity: number;
  spill: number;
  onEnabledChange: (enabled: boolean) => void;
  onColorChange: (color: string) => void;
  onSimilarityChange: (val: number) => void;
  onSpillChange: (val: number) => void;
}

export function ChromaKeyProperty({
  enabled,
  color: chromaColor,
  similarity,
  spill,
  onEnabledChange,
  onColorChange,
  onSimilarityChange,
  onSpillChange,
}: ChromaKeyPropertyProps) {
  const [open, setOpen] = useState(enabled);

  const toPercent = (v: number) => Math.round((v ?? 0) * 100);
  const fromPercent = (v: number) => v / 100;

  const sim = useSliderThrottle(toPercent(similarity ?? 0.1), (pct) =>
    onSimilarityChange(fromPercent(pct)),
  );
  const sp = useSliderThrottle(toPercent(spill ?? 0.05), (pct) => onSpillChange(fromPercent(pct)));

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-4 my-2">
      {/* Header with toggle switch */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Chroma Key</span>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            setOpen(checked);
          }}
        />
      </div>

      {enabled && (
        <div className="flex flex-col gap-3.5">
          {/* Key Color */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground w-16 select-none font-medium">
              Key Color
            </span>

            <div className="flex items-center gap-2">
              {/* Color picker popover trigger */}
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <div
                    className="size-4.5 rounded-full border border-foreground/25 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: chromaColor || "#FFFFFF" }}
                  >
                    <div className="size-2 rounded-full bg-card border border-foreground/25" />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-3 border border-border bg-popover text-popover-foreground shadow-md rounded-md animate-none"
                  align="end"
                >
                  <ColorPicker
                    value={color(chromaColor || "#FFFFFF")
                      .hsv()
                      .array()}
                    onChange={(val) => {
                      const [h, s, v] = val as number[];
                      const rgb = color({ h, s, v }).rgb().array();
                      onColorChange(
                        `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`,
                      );
                    }}
                    className="w-full"
                  >
                    <div className="flex flex-col gap-3">
                      <ColorPickerSelection className="min-h-32 w-full rounded-md shadow-sm" />
                      <div className="flex flex-col gap-2">
                        <ColorPickerHue />
                        <ColorPickerEyeDropper />
                      </div>
                      <div className="flex gap-1">
                        <ColorPickerFormat />
                        <ColorPickerFormat />
                        <ColorPickerFormat />
                      </div>
                      <ColorPickerOutput className="text-center" />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>

              {/* Color text input block */}
              <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-muted/60 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all w-24">
                <input
                  type="text"
                  value={chromaColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-xs text-foreground focus:outline-none focus:ring-0 text-left font-semibold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Similarity */}
          <div className="flex items-center gap-3.5">
            <span className="text-xs text-muted-foreground w-16 select-none font-medium">
              Similarity
            </span>

            {/* Value Input Box */}
            <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[80px] px-2.5 transition-all">
              <input
                type="text"
                value={`${sim.localValue}%`}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                  const parsed = parseInt(cleanVal);
                  if (!isNaN(parsed)) {
                    sim.handleDirectSet(Math.min(100, Math.max(0, parsed)));
                  } else if (cleanVal === "") {
                    sim.handleDirectSet(0);
                  }
                }}
                className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
              />
            </div>

            {/* Slider */}
            <Slider
              value={[sim.localValue]}
              onValueChange={(v) => sim.handleChange(v[0])}
              onValueCommit={(v) => sim.handleCommit(v[0])}
              max={100}
              step={1}
              className="flex-1 cursor-pointer"
            />
          </div>

          {/* Spill */}
          <div className="flex items-center gap-3.5">
            <span className="text-xs text-muted-foreground w-16 select-none font-medium">
              Spill
            </span>

            {/* Value Input Box */}
            <div className="relative flex items-center bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 rounded-lg h-8 w-[80px] px-2.5 transition-all">
              <input
                type="text"
                value={`${sp.localValue}%`}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                  const parsed = parseInt(cleanVal);
                  if (!isNaN(parsed)) {
                    sp.handleDirectSet(Math.min(100, Math.max(0, parsed)));
                  } else if (cleanVal === "") {
                    sp.handleDirectSet(0);
                  }
                }}
                className="w-full text-center bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none p-0"
              />
            </div>

            {/* Slider */}
            <Slider
              value={[sp.localValue]}
              onValueChange={(v) => sp.handleChange(v[0])}
              onValueCommit={(v) => sp.handleCommit(v[0])}
              max={100}
              step={1}
              className="flex-1 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
