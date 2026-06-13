"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import { IconPlus, IconTrash, IconMenu2 } from "@tabler/icons-react";
import { TrashIcon } from "@phosphor-icons/react";
import color from "color";

interface StrokePropertyProps {
  open: boolean;
  onAdd: () => void;
  onRemove: () => void;
  color: string;
  width: number;
  onColorChange: (val: string) => void;
  onWidthChange: (val: number) => void;
}

export function StrokeProperty({
  open,
  onAdd,
  onRemove,
  color: strokeColor,
  width,
  onColorChange,
  onWidthChange,
}: StrokePropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  if (!open) {
    return (
      <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between my-2">
        <span className="text-xs font-semibold text-foreground/85">Border</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAdd}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <IconPlus className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between my-2">
      <span className="text-xs font-semibold text-foreground/85">Border</span>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all w-24">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            className="size-4 text-muted-foreground shrink-0"
          >
            <line x1="4" y1="4" x2="20" y2="4" strokeWidth="2" />
            <line x1="4" y1="12" x2="20" y2="12" strokeWidth="4" />
            <line x1="4" y1="20" x2="20" y2="20" strokeWidth="5" />
          </svg>
          <NumberInput
            value={width || 0}
            onChange={onWidthChange}
            className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
          />
        </div>

        {/* Color picker popover trigger */}
        <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <div
              className="size-4.5 rounded-full border border-foreground/25 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: strokeColor || "#FFFFFF" }}
            >
              <div className="size-2 rounded-full bg-card border border-foreground/25"></div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-3 border border-border bg-popover text-popover-foreground shadow-md rounded-md animate-none"
            align="end"
          >
            <ColorPicker
              value={strokeColor}
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

        {/* Delete/Remove button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
