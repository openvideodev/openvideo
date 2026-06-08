"use client";

import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface TransformPropertyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onXChange: (val: number) => void;
  onYChange: (val: number) => void;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
}

export function TransformProperty({
  x,
  y,
  width,
  height,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
}: TransformPropertyProps) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Transform
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">X</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(x)} onChange={onXChange} className="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">Y</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(y)} onChange={onYChange} className="p-0" />
        </InputGroup>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">W</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(width)} onChange={onWidthChange} className="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">H</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(height)} onChange={onHeightChange} className="p-0" />
        </InputGroup>
      </div>
    </div>
  );
}
