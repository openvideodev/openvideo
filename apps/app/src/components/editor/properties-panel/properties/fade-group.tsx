"use client";

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
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Fade
        </label>
      </div>

      {/* Fade In */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Fade-in duration</label>
        <div className="flex items-center gap-3">
          <Slider
            value={[fadeInDuration]}
            onValueChange={(v) => onFadeInChange(v[0])}
            min={0}
            max={max}
            step={100}
            className="flex-1"
          />
          <InputGroup className="w-24">
            <NumberInput
              value={fadeInDuration}
              onChange={(val) => onFadeInChange(val || 0)}
              className="text-center text-xs"
              step={100}
            />
            <InputGroupAddon align="inline-end">ms</InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Fade Out */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Fade-out duration</label>
        <div className="flex items-center gap-3">
          <Slider
            value={[fadeOutDuration]}
            onValueChange={(v) => onFadeOutChange(v[0])}
            min={0}
            max={max}
            step={100}
            className="flex-1"
          />
          <InputGroup className="w-24">
            <NumberInput
              value={fadeOutDuration}
              onChange={(val) => onFadeOutChange(val || 0)}
              className="text-center text-xs"
              step={100}
            />
            <InputGroupAddon align="inline-end">ms</InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
