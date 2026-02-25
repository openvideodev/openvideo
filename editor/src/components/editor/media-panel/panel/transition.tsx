import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/stores/studio-store";
import { useTransitionStore } from "@/stores/transition-store";
import { getTransitionOptions } from "openvideo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PanelTransition = () => {
  const { studio } = useStudioStore();
  const { customTransitions } = useTransitionStore();
  const TRANSITION_DURATION_DEFAULT = 2_000_000;

  const [hovered, setHovered] = useState<Record<string, boolean>>({});

  // Combine built-in options with custom ones
  const allTransitions = getTransitionOptions();

  const presets = useMemo(
    () => allTransitions.filter((t) => !t.isCustom),
    [allTransitions],
  );
  const custom = useMemo(
    () => allTransitions.filter((t) => t.isCustom),
    [allTransitions],
  );

  const renderTransitionList = (list: typeof allTransitions) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 justify-items-center">
      {list.map((effect) => {
        const isHovered = hovered[effect.key];

        return (
          <div
            key={effect.key}
            className="flex w-full items-center gap-2 flex-col group cursor-pointer"
            onMouseEnter={() =>
              setHovered((prev) => ({ ...prev, [effect.key]: true }))
            }
            onMouseLeave={() =>
              setHovered((prev) => ({ ...prev, [effect.key]: false }))
            }
            onClick={() => {
              if (!studio) return;
              studio.addTransition(effect.key, TRANSITION_DURATION_DEFAULT);
            }}
          >
            <div className="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
              <img
                src={effect.previewStatic}
                loading="lazy"
                className="
                  absolute inset-0 w-full h-full object-cover rounded-sm
                  transition-opacity duration-150
                  opacity-100 group-hover:opacity-0
                "
              />

              {isHovered && (
                <img
                  src={effect.previewDynamic}
                  className="
                    absolute inset-0 w-full h-full object-cover rounded-sm
                    transition-opacity duration-150
                    opacity-0 group-hover:opacity-100
                  "
                />
              )}
              <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
                {effect.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="py-4 h-full flex flex-col gap-4">
      <Tabs
        defaultValue="presets"
        className="w-full flex-1 flex flex-col min-h-0"
      >
        <div className="px-4">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="presets" className="text-xs">
              Presets
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">
              Custom
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1 mt-4 px-4">
          <TabsContent value="presets" className="mt-0">
            {renderTransitionList(presets)}
          </TabsContent>
          <TabsContent value="custom" className="mt-0">
            {custom.length > 0 ? (
              renderTransitionList(custom)
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                <p className="text-sm">No custom transitions yet</p>
                <p className="text-xs">
                  Create them from the Clip Properties panel
                </p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default PanelTransition;
