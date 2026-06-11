"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import color from "color";

interface FillPropertyProps {
  color: string;
  onColorChange: (color: string) => void;
}

export function FillProperty({ color: fillColor, onColorChange }: FillPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Fill</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        {/* Color row */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Color</span>
          <InputGroup className="w-[130px] h-7">
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                    <div
                      className="h-5 w-5 rounded-sm border border-input shadow-sm"
                      style={{ backgroundColor: fillColor || "#3b82f6" }}
                    />
                  </InputGroupButton>
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
            </InputGroupAddon>
            <InputGroupInput
              value={(fillColor || "#3b82f6").toUpperCase()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onColorChange(e.target.value)}
              className="text-xs! p-0"
            />
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
