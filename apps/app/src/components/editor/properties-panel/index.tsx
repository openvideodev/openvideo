import { ScrollArea } from "@/components/ui/scroll-area";
import { IClip } from "@openvideo/engine-pixi";
import { cn } from "@/lib/utils";
import { PropertiesPanelContent } from "./properties-panel";

export function PropertiesPanel({ selectedClips }: { selectedClips: IClip[] }) {
  if (selectedClips.length > 1) {
    return (
      <div className="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
        <div className="text-lg font-medium">Group</div>
      </div>
    );
  }

  if (selectedClips.length === 0) return null;

  const clip = selectedClips[0];

  return (
    <ScrollArea className="h-full">
      <div
        className={cn(
          "flex flex-col gap-4 p-4 transition-opacity",
          clip.locked && "opacity-50 pointer-events-none select-none",
        )}
      >
        <PropertiesPanelContent clip={clip} />
      </div>
    </ScrollArea>
  );
}
