import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import useLayoutStore from "../../store/use-layout-store";
import { useStudioStore } from "@/stores/studio-store";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type HslAdjustment = "hue" | "saturation" | "lightness";

interface HslValue {
  hue: number;
  saturation: number;
  lightness: number;
}

type HslByColor = Record<string, HslValue>;

const HSL_SWATCHES = [
  "#d64343",
  "#e59d2b",
  "#f8e436",
  "#44d43f",
  "#3dcddd",
  "#4596ff",
  "#8e57ff",
  "#cf39f9",
];

const ADJUSTMENT_LIMITS: Record<HslAdjustment, { min: number; max: number }> = {
  hue: { min: -180, max: 180 },
  saturation: { min: -100, max: 100 },
  lightness: { min: -100, max: 100 },
};

const DEFAULT_HSL_VALUE: HslValue = {
  hue: 0,
  saturation: 0,
  lightness: 0,
};

const normalizeHex = (color: string) => {
  const hex = color.trim().toLowerCase();
  if (!hex.startsWith("#")) return hex;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
};

const hexToRgb = (
  hex: string,
): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHex(hex);
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const colorDistance = (a: string, b: string) => {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return Number.MAX_SAFE_INTEGER;
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  return dr * dr + dg * dg + db * db;
};

const findClosestSwatch = (color: string | undefined) => {
  if (!color) return HSL_SWATCHES[0];
  let closest = HSL_SWATCHES[0];
  let minDistance = Number.MAX_SAFE_INTEGER;
  for (const swatch of HSL_SWATCHES) {
    const distance = colorDistance(color, swatch);
    if (distance < minDistance) {
      minDistance = distance;
      closest = swatch;
    }
  }
  return closest;
};

const AdjusmentHsl = () => {
  const { floatingControlData } = useLayoutStore();
  const { studio } = useStudioStore();
  const { clipId } = floatingControlData || {};
  const clip = studio?.getClipById(clipId) as any;

  const [selectedColor, setSelectedColor] = useState(() =>
    findClosestSwatch(clip?.colorAdjustment?.hsl?.selectedColor),
  );
  const [hslValue, setHslValue] = useState<HslValue>(DEFAULT_HSL_VALUE);

  const getHslFromClipByColor = useCallback(
    (color: string): HslValue => {
      const hsl = clip?.colorAdjustment?.hsl;
      const byColor = (hsl?.byColor ?? {}) as HslByColor;
      const normalizedColor = normalizeHex(color);
      return byColor[normalizedColor] ?? DEFAULT_HSL_VALUE;
    },
    [clip],
  );

  useEffect(() => {
    if (!clip) return;
    const prevByColor = (clip?.colorAdjustment?.hsl?.byColor ?? {}) as HslByColor;
    clip.update({
      colorAdjustment: {
        enabled: true,
        type: "hsl",
        basic: clip?.colorAdjustment?.basic,
        hsl: {
          selectedColor,
          byColor: {
            ...prevByColor,
            [selectedColor]: hslValue,
          },
        },
        curves: clip?.colorAdjustment?.curves,
      },
    });
  }, [clip, selectedColor, hslValue]);

  const getRangeStyle = useCallback(
    (value: number, customMin?: number, customMax?: number) => {
      const effectiveMin = customMin ?? -100;
      const effectiveMax = customMax ?? 100;
      const effectiveRange = effectiveMax - effectiveMin;
      const effectiveCenterPercent = Math.abs(effectiveMin) / effectiveRange;

      if (value >= 0) {
        const width =
          (value / effectiveMax) * (1 - effectiveCenterPercent) * 100;
        return {
          left: `${effectiveCenterPercent * 100}%`,
          width: `${width}%`,
        };
      }

      const width =
        (Math.abs(value) / Math.abs(effectiveMin)) *
        effectiveCenterPercent *
        100;
      return {
        left: `${(effectiveCenterPercent - width / 100) * 100}%`,
        width: `${width}%`,
      };
    },
    [],
  );

  const sliderStyles = useMemo(
    () => ({
      hue: getRangeStyle(
        hslValue.hue,
        ADJUSTMENT_LIMITS.hue.min,
        ADJUSTMENT_LIMITS.hue.max,
      ),
      saturation: getRangeStyle(
        hslValue.saturation,
        ADJUSTMENT_LIMITS.saturation.min,
        ADJUSTMENT_LIMITS.saturation.max,
      ),
      lightness: getRangeStyle(
        hslValue.lightness,
        ADJUSTMENT_LIMITS.lightness.min,
        ADJUSTMENT_LIMITS.lightness.max,
      ),
    }),
    [getRangeStyle, hslValue],
  );

  const handleSliderChange = useCallback(
    (type: HslAdjustment, value: number[]) => {
      setHslValue((prev) => ({ ...prev, [type]: value[0] }));
    },
    [],
  );

  const handleInputChange = useCallback(
    (type: HslAdjustment, value: string) => {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        const { min, max } = ADJUSTMENT_LIMITS[type];
        setHslValue((prev) => ({
          ...prev,
          [type]: Math.min(max, Math.max(min, numValue)),
        }));
      }
    },
    [],
  );

  const handleSwatchSelect = useCallback(
    (color: string) => {
      const normalizedColor = normalizeHex(color);
      const swatchValue = getHslFromClipByColor(normalizedColor);
      setSelectedColor(normalizedColor);
      setHslValue(swatchValue);
    },
    [getHslFromClipByColor],
  );

  const handleReset = useCallback(() => {
    setHslValue(DEFAULT_HSL_VALUE);
    
    // Reset all colors in the clip
    Promise.resolve().then(() => {
      clip?.update({
        colorAdjustment: {
          enabled: true,
          type: "hsl",
          basic: clip?.colorAdjustment?.basic,
          hsl: {
            selectedColor,
            byColor: {},
          },
          curves: clip?.colorAdjustment?.curves,
        },
      });
    });
  }, [clip, selectedColor]);

  const controls: Array<{ id: HslAdjustment; label: string; value: number }> = [
    { id: "hue", label: "Hue", value: hslValue.hue },
    { id: "saturation", label: "Saturation", value: hslValue.saturation },
    { id: "lightness", label: "Lightness", value: hslValue.lightness },
  ];

  return (
    <ScrollArea className="max-h-[500px] w-full">
      <div className="pb-4">
        <div className="px-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider">
            Basic
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="px-2">
          <label className="text-[10px] text-muted-foreground">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {HSL_SWATCHES.map((color) => (
              <div
                key={color}
                style={{ backgroundColor: color }}
                className={`h-6 w-6 rounded-sm transition-all ${
                  selectedColor === normalizeHex(color)
                    ? "ring-2 ring-offset-1 ring-blue-500 scale-110"
                    : ""
                }`}
                onClick={() => handleSwatchSelect(color)}
              />
            ))}
          </div>
        </div>

        <div className="px-2">
          {controls.map(({ id, label, value }) => (
            <div key={id} className="mt-2">
              <span className="text-[10px] text-muted-foreground">{label}</span>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <style>{`
                    .slider-hsl-${id} [data-slot="slider"] {
                      justify-content: center;
                    }
                    .slider-hsl-${id} [data-slot="slider-range"] {
                      left: ${sliderStyles[id].left} !important;
                      width: ${sliderStyles[id].width} !important;
                    }
                  `}</style>

                  <Slider
                    value={[value]}
                    onValueChange={(newValue) =>
                      handleSliderChange(id, newValue)
                    }
                    min={ADJUSTMENT_LIMITS[id].min}
                    max={ADJUSTMENT_LIMITS[id].max}
                    step={1}
                    className={`slider-hsl-${id} w-full`}
                  />
                </div>

                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange(id, e.target.value)}
                  min={ADJUSTMENT_LIMITS[id].min}
                  max={ADJUSTMENT_LIMITS[id].max}
                  step={1}
                  className="w-20 text-[10px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default AdjusmentHsl;
