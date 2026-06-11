"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface FadeGroupPropertyProps {
  fadeInDuration: number;
  fadeOutDuration: number;
  onFadeInChange: (val: number) => void;
  onFadeOutChange: (val: number) => void;
  max?: number;
}

export function FadeGroupProperty({
  fadeInDuration,
  fadeOutDuration,
  onFadeInChange,
  onFadeOutChange,
  max = 5000,
}: FadeGroupPropertyProps) {
  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Fade</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        {/* Fade In */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Fade-in</span>
          <div className="flex items-center gap-2 w-[130px]">
            <Slider
              value={[fadeInDuration]}
              onValueChange={(v) => onFadeInChange(v[0])}
              min={0}
              max={max}
              step={100}
              className="flex-1"
            />
            <InputGroup className="w-16">
              <NumberInput
                value={fadeInDuration}
                onChange={(val) => onFadeInChange(val || 0)}
                className="pl-1 bg-transparent text-xs!"
                step={100}
              />
              <InputGroupAddon align="inline-end">
                <span className="text-[10px] text-muted-foreground">ms</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        {/* Fade Out */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Fade-out</span>
          <div className="flex items-center gap-2 w-[130px]">
            <Slider
              value={[fadeOutDuration]}
              onValueChange={(v) => onFadeOutChange(v[0])}
              min={0}
              max={max}
              step={100}
              className="flex-1"
            />
            <InputGroup className="w-16">
              <NumberInput
                value={fadeOutDuration}
                onChange={(val) => onFadeOutChange(val || 0)}
                className="pl-1 bg-transparent text-xs!"
                step={100}
              />
              <InputGroupAddon align="inline-end">
                <span className="text-[10px] text-muted-foreground">ms</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
