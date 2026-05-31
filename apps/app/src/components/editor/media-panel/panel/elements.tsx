"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ELEMENTS = [
  { id: "path3", name: "Arrow", src: "https://cdn.scenify.io/svg/path3.svg" },
  { id: "path4", name: "Star", src: "https://cdn.scenify.io/svg/path4.svg" },
  { id: "path5", name: "Heart", src: "https://cdn.scenify.io/svg/path5.svg" },
  { id: "path6", name: "Lightning", src: "https://cdn.scenify.io/svg/path6.svg" },
  { id: "path7", name: "Cloud", src: "https://cdn.scenify.io/svg/path7.svg" },
  { id: "path8", name: "Burst", src: "https://cdn.scenify.io/svg/path8.svg" },
  { id: "path9", name: "Wave", src: "https://cdn.scenify.io/svg/path9.svg" },
  { id: "path10", name: "Spiral", src: "https://cdn.scenify.io/svg/path10.svg" },
  { id: "path11", name: "Blob", src: "https://cdn.scenify.io/svg/path11.svg" },
  { id: "path12", name: "Badge", src: "https://cdn.scenify.io/svg/path12.svg" },
  { id: "path13", name: "Orbit", src: "https://cdn.scenify.io/svg/path13.svg" },
  { id: "path14", name: "Frame", src: "https://cdn.scenify.io/svg/path14.svg" },
];

export default function PanelElements() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAdd = (id: string) => {
    setSelectedId(id);
    // TODO: Add element to canvas
    setTimeout(() => setSelectedId(null), 300);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Grid - matching assets panel auto-fill grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
          {ELEMENTS.map((element) => (
            <button
              key={element.id}
              onClick={() => handleAdd(element.id)}
              className={cn(
                "group relative aspect-square rounded-lg border overflow-hidden",
                "bg-secondary/30 border-border/40",
                "hover:border-border hover:bg-secondary/50",
                "transition-all duration-150",
                selectedId === element.id && "ring-2 ring-primary border-primary",
              )}
            >
              <img
                src={element.src}
                alt={element.name}
                className="w-full h-full object-contain p-3 invert-[0.35]"
                loading="lazy"
              />
              {/* Hover overlay with name */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-medium text-foreground truncate block">
                  {element.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
