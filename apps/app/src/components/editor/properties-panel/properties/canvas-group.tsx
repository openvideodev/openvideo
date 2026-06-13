"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import color from "color";
import { useStore } from "zustand";
import { core, projectStore } from "@/lib/project";
import { useProjectStore } from "@/stores/project-store";

export function CanvasGroupProperty() {
  const [colorOpen, setColorOpen] = useState(false);
  const { canvasSize, aspectRatio, setCanvasSize } = useProjectStore();

  const onAspectRatioChange = (value: string) => {
    if (value === "16:9") {
      setCanvasSize({ width: 1920, height: 1080 }, "16:9");
    } else if (value === "9:16") {
      setCanvasSize({ width: 1080, height: 1920 }, "9:16");
    } else if (value === "1:1") {
      setCanvasSize({ width: 1080, height: 1080 }, "1:1");
    } else if (value === "4:5") {
      setCanvasSize({ width: 1080, height: 1350 }, "4:5");
    } else {
      setCanvasSize(canvasSize, value);
    }
  };

  const backgroundColor = useStore(projectStore, (s) => s.settings.backgroundColor) || "#111111";

  const onBackgroundColorChange = (newColor: string) => {
    core.store.getState().updateSettings({ backgroundColor: newColor });
  };

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Canvas Settings</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {/* Aspect Ratio */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground w-24 select-none font-medium">
            Aspect Ratio
          </span>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className="w-[130px] h-8 bg-muted/60 hover:bg-muted/80 border border-border/40 rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-ring/50 focus:ring-offset-0">
              <SelectValue placeholder="Aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9" className="text-xs">
                16:9 (Landscape)
              </SelectItem>
              <SelectItem value="9:16" className="text-xs">
                9:16 (Vertical)
              </SelectItem>
              <SelectItem value="1:1" className="text-xs">
                1:1 (Square)
              </SelectItem>
              <SelectItem value="4:5" className="text-xs">
                4:5 (Social)
              </SelectItem>
              {aspectRatio === "custom" && (
                <SelectItem value="custom" className="text-xs">
                  Custom
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Background Color */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground w-24 select-none font-medium">
            Background
          </span>
          <div className="flex items-center gap-2">
            {/* Color picker popover trigger */}
            <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <div
                  className="size-4.5 rounded-full border border-foreground/25 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  style={{ backgroundColor: backgroundColor || "#111111" }}
                >
                  <div className="size-2 rounded-full bg-card border border-foreground/25" />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3 border border-border bg-popover text-popover-foreground shadow-md rounded-md animate-none"
                align="end"
              >
                <ColorPicker
                  value={backgroundColor}
                  onChange={(colorValue: any) => {
                    const hexColor = color.rgb(colorValue as number[]).hex();
                    onBackgroundColorChange(hexColor);
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

            {/* Color text input block */}
            <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-muted/60 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all w-24">
              <input
                type="text"
                value={(backgroundColor || "#111111").toUpperCase()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onBackgroundColorChange(e.target.value)
                }
                className="w-full bg-transparent border-none p-0 text-xs text-foreground focus:outline-none focus:ring-0 text-left font-semibold font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
