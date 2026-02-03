"use client";
import React, { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import useLayoutStore from "../store/use-layout-store";
import { useStudioStore } from "@/stores/studio-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  IconArrowRight,
  IconArrowLeft,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const ANIMATION_TYPES = [
  { value: "none", label: "None" },
  { value: "slideIn", label: "Slide In" },
  // { value: 'scaleIn', label: 'Scale In' }, // Not implemented
];

const EASING_TYPES = [
  { value: "linear", label: "Linear" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "backOut", label: "Back Out" },
];

export default function AnimationPropertiesPicker() {
  const { setFloatingControl } = useLayoutStore();
  const { selectedClips } = useStudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  const clip = selectedClips[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is on a portal (like SelectContent)
      if (
        (event.target as HTMLElement).closest("[data-radix-portal]") ||
        (event.target as HTMLElement).closest('[role="listbox"]')
      ) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFloatingControl("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setFloatingControl]);

  useEffect(() => {
    if (!clip) return;
    const onPropsChange = () => setTick((t) => t + 1);
    clip.on("propsChange", onPropsChange);
    return () => {
      clip.off("propsChange", onPropsChange);
    };
  }, [clip]);

  if (!clip) return null;

  // Helper to get/set first animation
  const animation = clip.animations?.[0];
  const type = animation?.type || "none";

  const updateAnimation = (updates: Partial<any>) => {
    let newAnimations = [...(clip.animations || [])];

    if (newAnimations.length === 0) {
      if (updates.type === "none") return;
      newAnimations = [
        {
          id: Math.random().toString(36).substr(2, 9),
          type: updates.type || "slideIn",
          duration: 1000,
          delay: 0,
          easing: "easeOut",
          params: {
            direction: "left",
            distance: 0.5,
          },
          scope: "element",
        },
      ];
    }

    if (newAnimations.length > 0) {
      if (updates.type === "none") {
        newAnimations = [];
      } else {
        newAnimations[0] = {
          ...newAnimations[0],
          ...updates,
          params: {
            ...newAnimations[0].params,
            ...(updates.params || {}),
          },
          textParams: {
            ...newAnimations[0].textParams,
            ...(updates.textParams || {}),
          },
        };
      }
    } else if (updates.type && updates.type !== "none") {
      newAnimations = [
        {
          id: Math.random().toString(36).substr(2, 9),
          type: updates.type,
          duration: 1000,
          delay: 0,
          easing: "easeOut",
          params: { direction: "left", distance: 0.5 },
          scope: "element",
        },
      ];
    }

    (clip as any).update({ animations: newAnimations });
  };

  const handleTypeChange = (value: string) => {
    updateAnimation({ type: value });
  };

  return (
    <div
      ref={containerRef}
      className="absolute left-full top-0 z-200 ml-2 w-72 border bg-background p-0 shadow-xl rounded-md"
    >
      <div className="handle flex items-center justify-between px-4 py-3 pb-0">
        <p className="text-sm font-bold">In Animation</p>
        <div className="h-4 w-4" onClick={() => setFloatingControl("")}>
          <XIcon className="h-3 w-3 cursor-pointer font-extrabold text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="h-[auto] max-h-[500px] w-full p-4">
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col gap-2">
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Animation" />
              </SelectTrigger>
              <SelectContent className="z-[250]">
                {ANIMATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type !== "none" && animation && (
            <>
              <div className="flex flex-col gap-3">
                {/* Duration & Delay Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">
                      Duration
                    </label>
                    <InputGroup>
                      <InputGroupInput
                        type="number"
                        value={animation.duration / 1000}
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value);
                          updateAnimation({
                            duration: value * 1000,
                          });
                        }}
                        step={0.1}
                        min={0}
                      />
                      <InputGroupAddon>s</InputGroupAddon>
                    </InputGroup>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">
                      Delay
                    </label>
                    <InputGroup>
                      <InputGroupInput
                        type="number"
                        value={animation.delay / 1000}
                        onChange={(e) =>
                          updateAnimation({
                            delay: parseFloat(e.target.value) * 1000,
                          })
                        }
                        step={0.1}
                        min={0}
                      />
                      <InputGroupAddon>s</InputGroupAddon>
                    </InputGroup>
                  </div>
                </div>

                {/* Easing */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Easing
                  </label>
                  <Select
                    value={animation.easing}
                    onValueChange={(v) => updateAnimation({ easing: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[250]">
                      {EASING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Directions */}
                {["slideIn", "wipeIn"].includes(type) && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-muted-foreground">
                        Direction
                      </label>
                      <div className="flex bg-input/30 rounded-md p-1 gap-1">
                        {[
                          { icon: IconArrowRight, value: "left" },
                          { icon: IconArrowLeft, value: "right" },
                          { icon: IconArrowDown, value: "top" },
                          { icon: IconArrowUp, value: "bottom" },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() =>
                              updateAnimation({
                                params: { direction: item.value },
                              })
                            }
                            className={cn(
                              "flex-1 flex items-center justify-center rounded-sm py-1 transition-colors",
                              animation.params?.direction === item.value
                                ? "bg-white/10 text-white"
                                : "text-muted-foreground hover:bg-white/5",
                            )}
                          >
                            <item.icon className="size-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">
                        Distance
                      </label>
                      <InputGroup>
                        <InputGroupInput
                          type="number"
                          value={animation.params?.distance ?? 0.5}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value);
                            updateAnimation({
                              params: { distance: value },
                            });
                          }}
                          step={0.1}
                          min={0}
                        />
                      </InputGroup>
                    </div>
                  </>
                )}

                {/* Text Specific Options */}
                {clip.type === "Text" && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold">
                        Text Options
                      </label>

                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          Scope
                        </label>
                        <Select
                          value={animation.scope || "element"}
                          onValueChange={(v) => updateAnimation({ scope: v })}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[250]">
                            <SelectItem value="element">Whole</SelectItem>
                            <SelectItem value="words">Words</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {animation.scope === "words" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">
                              Overlap
                            </label>
                            <InputGroup>
                              <InputGroupInput
                                type="number"
                                value={animation.textParams?.overlap ?? 0}
                                onChange={(e) =>
                                  updateAnimation({
                                    textParams: {
                                      overlap: parseFloat(e.target.value),
                                    },
                                  })
                                }
                                step={0.1}
                                min={0}
                                max={1}
                              />
                            </InputGroup>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">
                              Order
                            </label>
                            <Select
                              value={animation.textParams?.order || "forward"}
                              onValueChange={(v) =>
                                updateAnimation({ textParams: { order: v } })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[250]">
                                <SelectItem value="forward">Forward</SelectItem>
                                <SelectItem value="backward">
                                  Backward
                                </SelectItem>
                                <SelectItem value="random">Random</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
