"use client";

import { Button } from "@/components/ui/button";
import { FlipHorizontalIcon, FlipVerticalIcon } from "@phosphor-icons/react";

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
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Flip</span>
      </div>

      {/* Row containing flip toggle buttons side by side */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={x ? "secondary" : "ghost"}
          onClick={() => onChange({ ...value, x: !x })}
          className={`h-8 text-xs font-semibold flex items-center justify-center gap-2 border border-border/40 w-full rounded-lg transition-all shadow-none ${
            x ? "bg-secondary text-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          <FlipHorizontalIcon className="size-4" />
          <span>Horizontal</span>
        </Button>

        <Button
          type="button"
          variant={y ? "secondary" : "ghost"}
          onClick={() => onChange({ ...value, y: !y })}
          className={`h-8 text-xs font-semibold flex items-center justify-center gap-2 border border-border/40 w-full rounded-lg transition-all shadow-none ${
            y ? "bg-secondary text-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          <FlipVerticalIcon className="size-4" />
          <span>Vertical</span>
        </Button>
      </div>
    </div>
  );
}
