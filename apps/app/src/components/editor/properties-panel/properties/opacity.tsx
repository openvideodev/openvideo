"use client";

import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface OpacityPropertyProps {
  value: number;
  onChange: (val: number) => void;
}

export function OpacityProperty({ value, onChange }: OpacityPropertyProps) {
  const percentage = Math.round(value * 100);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Opacity
        </label>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          value={[percentage]}
          onValueChange={(v) => onChange(v[0] / 100)}
          max={100}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-24">
          <NumberInput
            value={percentage}
            onChange={(val) => onChange(val / 100)}
            className="p-0 text-center"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-xs text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
