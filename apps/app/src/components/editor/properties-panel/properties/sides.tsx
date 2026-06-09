"use client";

import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface SidesPropertyProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function SidesProperty({
  value,
  onChange,
  min = 3,
  max = 20,
  label = "Sides",
}: SidesPropertyProps) {
  return (
    <div className="flex flex-col">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      </div>

      <div className="flex items-center gap-4 pb-4">
        <Slider
          value={[value || min]}
          onValueChange={(v) => onChange(Math.round(v[0]))}
          min={min}
          max={max}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-24">
          <NumberInput
            value={value || min}
            onChange={(v) => onChange(Math.round(Math.max(min, Math.min(max, v))))}
            className="p-0 text-center"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">#</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
