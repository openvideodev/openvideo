"use client";

import { useState } from "react";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import color from "color";

interface FillPropertyProps {
  color: string;
  onColorChange: (color: string) => void;
}

export function FillProperty({ color: fillColor, onColorChange }: FillPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Fill
        </label>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {/* Color picker row */}
        <InputGroup>
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <InputGroupAddon
                align="inline-start"
                className="cursor-pointer p-0 border-r border-white/5"
              >
                <div
                  className="w-6 h-6 rounded-sm border border-white/10 m-1"
                  style={{ backgroundColor: fillColor || "#3b82f6" }}
                />
              </InputGroupAddon>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <ColorPicker
                value={fillColor}
                onChange={(colorValue) => {
                  const hexColor = color.rgb(colorValue as number[]).hex();
                  onColorChange(hexColor);
                }}
                className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
              >
                <ColorPickerSelection />
                <div className="flex items-center gap-4">
                  <ColorPickerEyeDropper />
                  <div className="grid w-full gap-1">
                    <ColorPickerHue />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ColorPickerOutput />
                  <ColorPickerFormat />
                </div>
              </ColorPicker>
            </PopoverContent>
          </Popover>
          <input
            type="text"
            value={(fillColor || "#3b82f6").toUpperCase()}
            onChange={(e) => onColorChange(e.target.value)}
            className="flex-1 bg-transparent border-0 px-2 py-1 text-sm font-mono text-[10px] focus:outline-none"
          />
        </InputGroup>
      </div>
    </div>
  );
}
