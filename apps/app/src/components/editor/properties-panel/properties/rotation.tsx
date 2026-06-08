"use client";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface RotationPropertyProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}

export function RotationProperty({ value, onChange, max = 360 }: RotationPropertyProps) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Rotation
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Slider
          value={[Math.round(value)]}
          onValueChange={(v) => onChange(v[0])}
          max={max}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-24">
          <NumberInput value={Math.round(value)} onChange={onChange} className="p-0 text-center" />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-xs text-muted-foreground">°</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
