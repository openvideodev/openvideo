"use client";

import { useState } from "react";
import { IconBlur, IconRuler2 } from "@tabler/icons-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionHeader } from "./section-header";
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
    <Collapsible open={open}>
      <SectionHeader title="Shadow" hasContent={open} onAdd={onAdd} onRemove={onRemove} />
      <CollapsibleContent className="pb-4">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRuler2 className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={Math.round(offsetX || 0)} onChange={onOffsetXChange} />
            </InputGroup>

            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRuler2 className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={Math.round(offsetY || 0)} onChange={onOffsetYChange} />
            </InputGroup>
          </div>

          <div className="flex gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <IconBlur className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={blur || 0} onChange={onBlurChange} />
            </InputGroup>

            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                      <div
                        className="h-4 ml-2 w-4 border border-white/10 shadow-sm"
                        style={{
                          backgroundColor: shadowColor || "#000000",
                        }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <ColorPicker
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
                value={(shadowColor || "#000000").toUpperCase()}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-sm p-0 text-[10px] font-mono"
              />
              <InputGroupAddon align="inline-end" className="border-l border-white/5 pl-2">
                <span className="text-[10px]">100%</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
