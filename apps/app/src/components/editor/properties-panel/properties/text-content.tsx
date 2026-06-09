"use client";

import { Textarea } from "@/components/ui/textarea";

interface TextContentPropertyProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextContentProperty({ value, onChange }: TextContentPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Content
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none text-sm min-h-[80px] bg-background border border-input focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Enter text..."
      />
    </div>
  );
}
