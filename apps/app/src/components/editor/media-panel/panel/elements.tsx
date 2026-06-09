"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { createShapeClip, type ShapeElement } from "@/lib/shape-utils";
import { core } from "@/lib/project";

const ELEMENTS: ShapeElement[] = [
  { id: "rectangle", name: "Rectangle", shapeType: "rectangle", icon: "□" },
];

export default function PanelElements() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAdd = async (element: ShapeElement) => {
    setSelectedId(element.id);

    try {
      // Create ShapeClip instance
      const shapeClip = createShapeClip(element);

      // Add to core system
      await core.clip.add(shapeClip);

      console.log("Added shape:", element.name, "with ID:", shapeClip.id);
    } catch (error) {
      console.error("Failed to add shape:", error);
    }

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
              onClick={() => handleAdd(element)}
              className={cn(
                "group relative aspect-square rounded-lg border overflow-hidden",
                "bg-secondary/30 border-border/40",
                "hover:border-border hover:bg-secondary/50",
                "transition-all duration-150",
                selectedId === element.id && "ring-2 ring-primary border-primary",
              )}
            >
              <div className="w-full h-full flex items-center justify-center p-3">
                <span className="text-4xl text-foreground/60 invert-[0.35]">{element.icon}</span>
              </div>
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
