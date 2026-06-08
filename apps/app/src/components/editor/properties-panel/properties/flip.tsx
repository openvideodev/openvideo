"use client";

import { IconFlipHorizontal, IconFlipVertical } from "@tabler/icons-react";

import { Toggle } from "@/components/ui/toggle";

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
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Flip
        </label>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Toggle
          pressed={x}
          onPressedChange={(pressed) => onChange({ ...value, x: pressed })}
          variant="outline"
          size="sm"
          className="flex-1 h-8"
        >
          <IconFlipHorizontal className="size-4 mr-2" />
          <span className="text-xs">Flip X</span>
        </Toggle>
        <Toggle
          pressed={y}
          onPressedChange={(pressed) => onChange({ ...value, y: pressed })}
          variant="outline"
          size="sm"
          className="flex-1 h-8"
        >
          <IconFlipVertical className="size-4 mr-2" />
          <span className="text-xs">Flip Y</span>
        </Toggle>
      </div>
    </div>
  );
}
