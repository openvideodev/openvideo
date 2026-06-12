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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import color from "color";
import { useStore } from "zustand";
import { core, projectStore } from "@/lib/project";
import { useProjectStore } from "@/stores/project-store";

export function CanvasGroupProperty() {
  const [colorOpen, setColorOpen] = useState(false);
  const { canvasSize, aspectRatio, setCanvasSize } = useProjectStore();

  const width = canvasSize.width;
  const height = canvasSize.height;

  const onWidthChange = (val: number) => {
    setCanvasSize({ width: val, height: canvasSize.height }, "custom");
  };

  const onHeightChange = (val: number) => {
    setCanvasSize({ width: canvasSize.width, height: val }, "custom");
  };

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
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Canvas Settings</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        {/* Width */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Width</span>
          <InputGroup className="w-[130px]">
            <NumberInput
              value={width}
              onChange={onWidthChange}
              className="pl-2 bg-transparent text-xs!"
            />
            <InputGroupAddon align="inline-end">
              <span className="text-[10px] text-muted-foreground">px</span>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Height */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Height</span>
          <InputGroup className="w-[130px]">
            <NumberInput
              value={height}
              onChange={onHeightChange}
              className="pl-2 bg-transparent text-xs!"
            />
            <InputGroupAddon align="inline-end">
              <span className="text-[10px] text-muted-foreground">px</span>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Aspect Ratio</span>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
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
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Background</span>
          <InputGroup className="w-[130px] h-7">
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                    <div
                      className="h-5 w-5 rounded-sm border border-input shadow-sm animate-none"
                      style={{ backgroundColor: backgroundColor || "#111111" }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 animate-none" align="start">
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
            </InputGroupAddon>
            <InputGroupInput
              value={(backgroundColor || "#111111").toUpperCase()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onBackgroundColorChange(e.target.value)
              }
              className="text-xs! p-0 font-mono"
            />
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
