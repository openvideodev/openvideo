"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WordsPerLineMode = "single" | "multiple";

interface CaptionWordsPerLinePropertyProps {
  value: WordsPerLineMode;
  onChange: (value: WordsPerLineMode) => void;
}

export function CaptionWordsPerLineProperty({ value, onChange }: CaptionWordsPerLinePropertyProps) {
  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Words Per Line</span>
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
          <span className="text-xs text-muted-foreground">Words Per Line</span>
          <Select value={value} onValueChange={(v) => onChange(v as WordsPerLineMode)}>
            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
              <SelectValue placeholder="Words per line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="multiple">Multiple</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
