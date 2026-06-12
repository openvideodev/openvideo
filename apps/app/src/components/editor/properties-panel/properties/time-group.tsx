"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studio-store";

export function TimeGroupProperty() {
  const [trimContent, setTrimContent] = useState(false);
  const studio = useStudioStore((state) => state.studio);
  const maxDuration = studio?.getMaxDuration() || 0;
  const durationSec = maxDuration / 1e6;

  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Time</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col gap-2.5">
        {/* Length Row */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Length</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium px-2.5 py-1 bg-secondary border rounded-md text-foreground min-w-[60px] text-center select-none">
              {durationSec.toFixed(1)}s
            </span>
            <div className="flex items-center border rounded-md overflow-hidden bg-secondary">
              <button className="px-2 py-1 text-muted-foreground hover:text-white hover:bg-white/5 text-xs transition-colors border-r cursor-pointer select-none">
                —
              </button>
              <button className="px-2 py-1 text-muted-foreground hover:text-white hover:bg-white/5 text-xs transition-colors cursor-pointer select-none">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Trim Content Checkbox */}
        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id="trim-content"
            checked={trimContent}
            onChange={(e) => setTrimContent(e.target.checked)}
            className="rounded border-white/20 bg-secondary text-blue-600 focus:ring-0 focus:ring-offset-0 size-3.5 cursor-pointer"
          />
          <label
            htmlFor="trim-content"
            className="text-xs text-muted-foreground select-none cursor-pointer"
          >
            Trim content
          </label>
        </div>
      </div>
    </div>
  );
}
