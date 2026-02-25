import * as React from "react";
import { IClip } from "openvideo";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { useTransitionStore } from "@/stores/transition-store";
import { getTransitionOptions } from "openvideo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/stores/studio-store";
import {
  Loader2,
  Plus,
  Timer,
  Pencil,
  Trash2,
  EllipsisVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useLayoutStore from "../store/use-layout-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface TransitionPropertiesProps {
  clip: IClip;
}

const LOADED_CACHE: Record<string, { static: boolean; dynamic: boolean }> = {};
let LAST_SCROLL_POS = 0;

export function TransitionProperties({ clip }: TransitionPropertiesProps) {
  const transitionClip = clip as any;
  const { studio, selectedClips } = useStudioStore();
  const { customTransitions } = useTransitionStore();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { setOpenTransitionDialog } = useLayoutStore();

  const [loaded, setLoaded] = React.useState(LOADED_CACHE);
  const [localDuration, setLocalDuration] = React.useState(
    transitionClip.duration / 1_000_000,
  );

  React.useEffect(() => {
    setLocalDuration(transitionClip.duration / 1_000_000);
  }, [transitionClip.duration]);

  React.useLayoutEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (viewport) {
      viewport.scrollTop = LAST_SCROLL_POS;
    }
  }, []);

  const markLoaded = (key: string, type: "static" | "dynamic") => {
    if (LOADED_CACHE[key]?.[type]) return;
    LOADED_CACHE[key] = {
      ...LOADED_CACHE[key],
      [type]: true,
    };
    setLoaded({ ...LOADED_CACHE });
  };

  const fromClip = studio?.timeline.getClipById(transitionClip.fromClipId);
  const toClip = studio?.timeline.getClipById(transitionClip.toClipId);

  const minFromToDuration = Math.min(
    fromClip?.duration ?? Infinity,
    toClip?.duration ?? Infinity,
  );

  const maxDurationMicro =
    minFromToDuration === Infinity ? 10_000_000 : minFromToDuration * 0.25;
  const minDurationMicro = 100_000; // 0.1s

  const handleUpdate = async (updates: any) => {
    if (!studio || !transitionClip.fromClipId || !transitionClip.toClipId)
      return;

    let newDuration = updates.duration ?? transitionClip.duration;
    const newKey = updates.key ?? transitionClip.transitionEffect.key;

    if (newDuration !== undefined || updates.key !== undefined) {
      newDuration = Math.max(
        minDurationMicro,
        Math.min(maxDurationMicro, newDuration),
      );

      const transitionStart = toClip!.display.from - newDuration / 2;
      const transitionEnd = transitionStart + newDuration;
      const transitionMeta = {
        key: newKey,
        name: newKey,
        duration: newDuration,
        fromClipId: transitionClip.fromClipId,
        toClipId: transitionClip.toClipId,
        start: Math.max(0, transitionStart),
        end: transitionEnd,
      };

      // Clear cached transition renderers if the key or duration changed
      if (
        newKey !== transitionClip.transitionEffect.key ||
        newDuration !== transitionClip.duration
      ) {
        const transKey = `${transitionClip.fromClipId}_${transitionClip.toClipId}`;
        if ((studio as any).transitionRenderers.has(transKey)) {
          (studio as any).transitionRenderers.get(transKey)?.destroy();
          (studio as any).transitionRenderers.delete(transKey);
        }
      }

      // Update the transition clip and related clips in a single batch
      const clipUpdates: any = {
        duration: newDuration,
        display: { from: Math.max(0, transitionStart), to: transitionEnd },
      };

      if (updates.key) {
        clipUpdates.transitionEffect = {
          id: transitionClip.transitionEffect.id,
          key: newKey,
          name: newKey,
        };
      }

      const updatesList = [
        {
          id: transitionClip.id,
          updates: clipUpdates,
        },
      ];

      if (fromClip) {
        updatesList.push({
          id: fromClip.id,
          updates: { transition: transitionMeta } as any,
        });
      }
      if (toClip) {
        updatesList.push({
          id: toClip.id,
          updates: { transition: transitionMeta } as any,
        });
      }

      await studio.updateClips(updatesList);

      studio.seek(studio.currentTime);
    }
  };

  const maxDurationInSeconds = maxDurationMicro / 1_000_000;
  const minDurationInSeconds = minDurationMicro / 1_000_000;

  const allTransitions = getTransitionOptions();

  const presets = React.useMemo(
    () => allTransitions.filter((t) => !t.isCustom),
    [allTransitions],
  );
  const custom = React.useMemo(
    () => allTransitions.filter((t) => t.isCustom),
    [allTransitions],
  );

  const { removeCustomTransition, setEditingTransitionId } =
    useTransitionStore();

  const renderTransitionList = (list: typeof allTransitions, type: string) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 justify-items-center">
      {list.map((effect) => {
        const isReady =
          loaded[effect.key]?.static && loaded[effect.key]?.dynamic;

        return (
          <div
            key={effect.key}
            className="flex w-full items-center gap-2 flex-col group cursor-pointer relative"
            onClick={() => {
              if (!studio) return;
              handleUpdate({ key: effect.key });
            }}
          >
            <div className="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
              {type === "custom" ? (
                <div className="absolute inset-0 bg-secondary flex group-hover:bg-secondary/80 transition-colors">
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-6 backdrop-blur-sm"
                        >
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransitionId(effect.key);
                              setOpenTransitionDialog(true);
                            }}
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `Are you sure you want to delete "${effect.label}"?`,
                                )
                              ) {
                                removeCustomTransition(effect.key);
                              }
                            }}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ) : (
                <>
                  {!isReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                  )}

                  <img
                    src={effect.previewStatic}
                    onLoad={() => markLoaded(effect.key, "static")}
                    loading="lazy"
                    className="
                  absolute inset-0 w-full h-full object-cover rounded-sm
                  transition-opacity duration-150
                  opacity-100 group-hover:opacity-0
                "
                  />

                  <img
                    src={effect.previewDynamic}
                    onLoad={() => markLoaded(effect.key, "dynamic")}
                    loading="lazy"
                    className="
                  absolute inset-0 w-full h-full object-cover rounded-sm
                  transition-opacity duration-150
                  opacity-0 group-hover:opacity-100
                "
                  />
                </>
              )}

              <div
                className={`absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 ${type === "custom" ? "opacity-100" : "group-hover:opacity-0"}`}
              >
                {effect.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full min-h-0">
      {/* Duration Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Duration
        </label>
        <div className="flex gap-2">
          <div className="flex items-center gap-4 flex-1">
            <Timer className="size-4 text-muted-foreground" />
            <Slider
              value={[localDuration]}
              onValueChange={(v) => setLocalDuration(v[0])}
              onValueCommit={(v) =>
                handleUpdate({ duration: v[0] * 1_000_000 })
              }
              max={maxDurationInSeconds}
              min={minDurationInSeconds}
              step={0.1}
              className="flex-1"
            />
            <InputGroup className="w-20">
              <InputGroupInput
                type="number"
                value={localDuration.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalDuration(val);
                  handleUpdate({
                    duration: val * 1_000_000,
                  });
                }}
                className="text-sm p-0 text-center"
              />
              <InputGroupAddon align="inline-end" className="p-0 pr-2">
                <span className="text-[10px] text-muted-foreground">s</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setOpenTransitionDialog(true)}
          >
            <Plus className="size-3" />
            Add Custom
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="presets"
        className="w-full flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="presets" className="text-xs">
              Presets
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">
              Custom
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea
          ref={scrollRef}
          onScrollCapture={() => {
            const viewport = scrollRef.current?.querySelector(
              "[data-radix-scroll-area-viewport]",
            );
            if (viewport) {
              LAST_SCROLL_POS = viewport.scrollTop;
            }
          }}
          className="flex-1 mt-4"
        >
          <TabsContent value="presets" className="mt-0">
            {renderTransitionList(presets, "presets")}
          </TabsContent>
          <TabsContent value="custom" className="mt-0">
            {custom.length > 0 ? (
              renderTransitionList(custom, "custom")
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                <p className="text-sm">No custom transitions yet</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setOpenTransitionDialog(true)}
                  className="mt-1"
                >
                  Create your first one
                </Button>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
