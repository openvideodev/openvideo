"use client";

import { ColorPicker, ColorPickerSelection, ColorPickerHue } from "@/components/ui/color-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import color from "color";

interface CaptionColors {
  appeared?: string;
  active?: string;
  activeFill?: string;
  background?: string;
  keyword?: string;
}

interface CaptionColorsPropertyProps {
  captionColors: CaptionColors;
  setColors: (colors: Partial<CaptionColors>) => void;
}

export function CaptionColorsProperty({ captionColors, setColors }: CaptionColorsPropertyProps) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Caption Colors
        </label>
      </div>

      {(
        [
          { key: "appeared", label: "Appeared", fallback: "#ffffff" },
          { key: "active", label: "Active", fallback: "#ffffff" },
          { key: "activeFill", label: "Active Fill", fallback: "#FF5700" },
          { key: "background", label: "Background", fallback: "" },
          { key: "keyword", label: "Keyword", fallback: "#ffffff" },
        ] as const
      ).map(({ key, label, fallback }) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors[key] || fallback || "transparent",
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent
                  className="w-48 p-3 h-48"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <ColorPickerPanel onChange={(hex) => setColors({ [key]: hex })} />
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors[key]?.toUpperCase() || fallback.toUpperCase()}
              onChange={(e) => setColors({ [key]: e.target.value })}
              className="text-sm p-0 text-[10px] font-mono"
              placeholder={fallback ? undefined : "Transparent"}
            />
          </InputGroup>
        </div>
      ))}
    </div>
  );
}

function ColorPickerPanel({ onChange }: { onChange: (hex: string) => void }) {
  return (
    <ColorPicker
      onChange={(colorValue) => onChange(color.rgb(colorValue).hex())}
      className="w-full h-56 flex flex-col gap-3"
    >
      <ColorPickerSelection />
      <div className="flex items-center gap-3">
        <ColorPickerHue className="flex-1" />
      </div>
    </ColorPicker>
  );
}
