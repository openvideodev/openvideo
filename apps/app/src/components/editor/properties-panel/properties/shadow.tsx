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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@phosphor-icons/react";
import color from "color";

interface ShadowPropertyProps {
  open: boolean;
  onAdd: () => void;
  onRemove: () => void;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  onOffsetXChange: (val: number) => void;
  onOffsetYChange: (val: number) => void;
  onBlurChange: (val: number) => void;
  onColorChange: (val: string) => void;
}

export function ShadowProperty({
  open,
  onAdd,
  onRemove,
  offsetX,
  offsetY,
  blur,
  color: shadowColor,
  onOffsetXChange,
  onOffsetYChange,
  onBlurChange,
  onColorChange,
}: ShadowPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between my-2">
      {/* Header */}
      <span className="text-xs font-semibold text-foreground/85">Shadow</span>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <Switch
          checked={open}
          onCheckedChange={(checked) => {
            if (checked) onAdd();
            else onRemove();
          }}
        />

        {open && (
          <Popover modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="2" y1="14" x2="6" y2="14" />
                  <line x1="10" y1="8" x2="14" y2="8" />
                  <line x1="18" y1="16" x2="22" y2="16" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[280px] p-4 border border-border bg-popover text-popover-foreground shadow-md rounded-md flex flex-col gap-3.5 animate-none"
              align="end"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-semibold text-foreground/85">
                  <span>Shadow</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 text-muted-foreground"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              </div>

              {/* Position X / Y */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Position</span>
                <div className="flex gap-2 w-[160px]">
                  <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all flex-1">
                    <span className="text-xs font-semibold text-muted-foreground select-none w-3">
                      X
                    </span>
                    <NumberInput
                      value={Math.round(offsetX || 0)}
                      onChange={onOffsetXChange}
                      className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all flex-1">
                    <span className="text-xs font-semibold text-muted-foreground select-none w-3">
                      Y
                    </span>
                    <NumberInput
                      value={Math.round(offsetY || 0)}
                      onChange={onOffsetYChange}
                      className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
              </div>

              {/* Blur */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Blur</span>
                <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all w-[160px]">
                  <span className="text-xs font-semibold text-muted-foreground select-none w-3">
                    #
                  </span>
                  <NumberInput
                    value={blur || 0}
                    onChange={onBlurChange}
                    className="w-full bg-transparent border-none p-0 text-xs! text-foreground focus:outline-none focus:ring-0 text-left font-semibold pl-0 h-full shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Color</span>

                <div className="flex items-center gap-2">
                  <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                    <PopoverTrigger asChild>
                      <div
                        className="size-4.5 rounded-full border border-foreground/25 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: shadowColor || "#000000" }}
                      >
                        <div className="size-2 rounded-full bg-card border border-foreground/25" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-3 border border-border bg-popover text-popover-foreground shadow-md rounded-md animate-none"
                      align="end"
                    >
                      <ColorPicker
                        value={shadowColor}
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

                  {/* Hex color code text input block */}
                  <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-muted/60 border border-border/40 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50 transition-all w-[96px]">
                    <input
                      type="text"
                      value={(shadowColor || "#000000").toUpperCase()}
                      onChange={(e) => onColorChange(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-xs text-foreground focus:outline-none focus:ring-0 text-left font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Remove button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRemove();
                }}
                className="w-full h-8 text-xs font-semibold gap-2 border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-none"
              >
                <TrashIcon className="size-3.5" />
                Remove
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
