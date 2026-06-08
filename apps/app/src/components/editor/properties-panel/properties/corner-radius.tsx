"use client";

import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface CornerRadiusPropertyProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function CornerRadiusProperty({ value, onChange, max = 500 }: CornerRadiusPropertyProps) {
  return (
    <div className="flex flex-col">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Corner Radius
        </label>
      </div>

      <div className="flex items-center gap-4 pb-4">
        <Slider
          value={[value || 0]}
          onValueChange={(v) => onChange(v[0])}
          max={max}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-24">
          <NumberInput value={value || 0} onChange={onChange} className="p-0 text-center" />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
