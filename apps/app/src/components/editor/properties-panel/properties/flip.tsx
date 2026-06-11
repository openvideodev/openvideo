"use client";

import { IconFlipHorizontal, IconFlipVertical } from "@tabler/icons-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";

export interface FlipValues {
  x: boolean;
  y: boolean;
}

interface FlipPropertyProps {
  value: FlipValues;
  onChange: (flip: FlipValues) => void;
}

export function FlipProperty({ value, onChange }: FlipPropertyProps) {
  const { x, y } = value;

  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Flip</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Flip</span>
          <div className="flex items-center gap-2 w-[130px]">
            <Toggle
              pressed={x}
              onPressedChange={(pressed) => onChange({ ...value, x: pressed })}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs bg-secondary border rounded-md"
            >
              <IconFlipHorizontal className="size-3.5 mr-1" />
              <span>X</span>
            </Toggle>
            <Toggle
              pressed={y}
              onPressedChange={(pressed) => onChange({ ...value, y: pressed })}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs bg-secondary border rounded-md"
            >
              <IconFlipVertical className="size-3.5 mr-1" />
              <span>Y</span>
            </Toggle>
          </div>
        </div>
      </div>
    </div>
  );
}
