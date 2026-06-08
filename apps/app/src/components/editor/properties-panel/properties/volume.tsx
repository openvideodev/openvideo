"use client";

import { IconVolume } from "@tabler/icons-react";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface VolumePropertyProps {
  value: number;
  onChange: (val: number) => void;
}

export function VolumeProperty({ value, onChange }: VolumePropertyProps) {
  const percentage = Math.round((value ?? 1) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Volume
        </label>
      </div>

      <div className="flex items-center gap-4 pb-4">
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
            onChange={(val) => onChange((val || 0) / 100)}
            className="p-0 text-center text-sm"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
