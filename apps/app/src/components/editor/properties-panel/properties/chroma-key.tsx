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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import color from "color";

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between h-12">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Chroma Key
        </label>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            setOpen(checked);
          }}
        />
      </div>

      {enabled && (
        <div className="flex flex-col gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 p-2 rounded-md border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                style={{ borderColor: chromaColor }}
              >
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: chromaColor }} />
                <span className="text-xs">Key Color</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{chromaColor}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <ColorPicker
                value={color(chromaColor).hsv().array()}
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

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Similarity</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((similarity ?? 0.1) * 100)}%
              </span>
            </div>
            <Slider
              value={[(similarity ?? 0.1) * 100]}
              onValueChange={(v) => onSimilarityChange(v[0] / 100)}
              max={100}
              step={1}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Spill</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((spill ?? 0.05) * 100)}%
              </span>
            </div>
            <Slider
              value={[(spill ?? 0.05) * 100]}
              onValueChange={(v) => onSpillChange(v[0] / 100)}
              max={100}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}
