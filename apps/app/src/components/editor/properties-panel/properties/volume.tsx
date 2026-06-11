"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Volume</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Volume</span>
          <div className="flex items-center gap-2 w-[130px]">
            <Slider
              value={[percentage]}
              onValueChange={(v) => onChange(v[0] / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
            <InputGroup className="w-14">
              <NumberInput
                value={percentage}
                onChange={(val) => onChange((val || 0) / 100)}
                className="pl-1 bg-transparent text-xs!"
              />
              <InputGroupAddon align="inline-end">
                <span className="text-[10px] text-muted-foreground">%</span>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
