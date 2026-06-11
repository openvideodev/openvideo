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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
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
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Chroma Key</span>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            setOpen(checked);
          }}
        />
      </div>

      {enabled && (
        <div className="py-1 flex flex-col">
          {/* Key Color */}
          <div className="flex items-center justify-between py-1 gap-4">
            <span className="text-xs text-muted-foreground">Key Color</span>
            <InputGroup className="w-[130px] h-7">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                      <div
                        className="h-5 w-5 rounded-sm border border-input shadow-sm"
                        style={{ backgroundColor: chromaColor || "#FFFFFF" }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
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
              </InputGroupAddon>
              <InputGroupInput
                value={chromaColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-xs! p-0 font-mono"
              />
            </InputGroup>
          </div>

          {/* Similarity */}
          <div className="flex items-center justify-between py-1 gap-4">
            <span className="text-xs text-muted-foreground">Similarity</span>
            <div className="flex items-center gap-2 w-[130px]">
              <Slider
                value={[(similarity ?? 0.1) * 100]}
                onValueChange={(v) => onSimilarityChange(v[0] / 100)}
                max={100}
                step={1}
                className="flex-1"
              />
              <InputGroup className="w-14">
                <NumberInput
                  value={Math.round((similarity ?? 0.1) * 100)}
                  onChange={(val) => onSimilarityChange((val || 0) / 100)}
                  className="pl-1 bg-transparent text-xs!"
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-[10px] text-muted-foreground">%</span>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          {/* Spill */}
          <div className="flex items-center justify-between py-1 gap-4">
            <span className="text-xs text-muted-foreground">Spill</span>
            <div className="flex items-center gap-2 w-[130px]">
              <Slider
                value={[(spill ?? 0.05) * 100]}
                onValueChange={(v) => onSpillChange(v[0] / 100)}
                max={100}
                step={1}
                className="flex-1"
              />
              <InputGroup className="w-14">
                <NumberInput
                  value={Math.round((spill ?? 0.05) * 100)}
                  onChange={(val) => onSpillChange((val || 0) / 100)}
                  className="pl-1 bg-transparent text-xs!"
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-[10px] text-muted-foreground">%</span>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
