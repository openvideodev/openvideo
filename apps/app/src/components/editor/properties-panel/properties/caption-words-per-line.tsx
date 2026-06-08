"use client";

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
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Words per line
        </label>
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as WordsPerLineMode)}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder="Words per line" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single">Single</SelectItem>
          <SelectItem value="multiple">Multiple</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
