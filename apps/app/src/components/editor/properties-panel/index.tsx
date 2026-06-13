import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PropertiesPanelContent } from "./properties-panel";
import { useStudioStore } from "@/stores/studio-store";

export function PropertiesPanel() {
  const { selectedClips } = useStudioStore();

  if (selectedClips.length > 1) {
    return (
      <div className="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
        <div className="text-lg font-medium">Group</div>
      </div>
    );
  }

  const clip = selectedClips.length === 0 ? ({ type: "Scene" } as any) : selectedClips[0];

  return (
    <ScrollArea className="h-full">
      <div
        className={cn(
          "flex flex-col gap-4 p-4 transition-opacity bg-background h-full",
          clip.locked && "opacity-50 pointer-events-none select-none",
        )}
      >
        <PropertiesPanelContent clip={clip} />
      </div>
    </ScrollArea>
  );
}
