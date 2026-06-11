"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CaptionPositionPropertyProps {
  value: "top" | "center" | "bottom";
  onChange: (value: "top" | "center" | "bottom") => void;
}

export function CaptionPositionProperty({ value, onChange }: CaptionPositionPropertyProps) {
  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Position</span>
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
          <span className="text-xs text-muted-foreground">Position</span>
          <Select value={value} onValueChange={(v) => onChange(v as any)}>
            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
              <SelectValue placeholder="Vertical Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
