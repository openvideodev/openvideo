"use client";

import React, { useState } from "react";
import { useStudioStore } from "@/stores/studio-store";

export function TimeGroupProperty() {
  const [trimContent, setTrimContent] = useState(false);
  const studio = useStudioStore((state) => state.studio);
  const maxDuration = studio?.getMaxDuration() || 0;
  const durationSec = maxDuration / 1e6;

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Time</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {/* Length Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground w-16 select-none font-medium">Length</span>
          <div className="flex items-center gap-1.5">
            {/* Value Display Pill */}
            <span className="text-xs font-semibold px-3 py-1 bg-muted/60 border border-border/40 rounded-lg text-foreground min-w-[70px] h-8 flex items-center justify-center select-none">
              {durationSec.toFixed(1)}s
            </span>
            <div className="flex items-center border border-border/40 rounded-lg overflow-hidden bg-muted/60 h-8">
              <button className="px-3 h-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-xs transition-colors border-r border-border/40 cursor-pointer select-none font-semibold">
                —
              </button>
              <button className="px-3 h-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-xs transition-colors cursor-pointer select-none font-semibold">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Trim Content Checkbox */}
        <div className="flex items-center gap-2.5 pt-1">
          <input
            type="checkbox"
            id="trim-content"
            checked={trimContent}
            onChange={(e) => setTrimContent(e.target.checked)}
            className="rounded border-border/50 bg-muted/60 text-blue-600 focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer"
          />
          <label
            htmlFor="trim-content"
            className="text-xs text-muted-foreground font-medium select-none cursor-pointer hover:text-foreground transition-colors"
          >
            Trim content
          </label>
        </div>
      </div>
    </div>
  );
}
