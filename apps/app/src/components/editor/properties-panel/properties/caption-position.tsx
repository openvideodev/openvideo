"use client";

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
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Position
        </label>
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as any)}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder="Vertical Position" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="top">Top</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="bottom">Bottom</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
