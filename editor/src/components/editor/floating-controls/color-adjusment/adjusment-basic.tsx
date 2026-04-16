import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import useLayoutStore from "../../store/use-layout-store";
import { useStudioStore } from "@/stores/studio-store";

type ColorAdjustment = "saturation" | "temperature" | "hue";
type LightAdjustment =
  | "brightness"
  | "contrast"
  | "shine"
  | "highlight"
  | "shadow";
type EffectsAdjustment = "sharpness" | "vignette" | "fade" | "grain";

interface ColorValue {
  saturation: number;
  temperature: number;
  hue: number;
}

interface LightValue {
  brightness: number;
  contrast: number;
  shine: number;
  highlight: number;
  shadow: number;
}

interface EffectsValue {
  sharpness: number;
  vignette: number;
  fade: number;
  grain: number;
}

const AdjusmentBasic = () => {
  const { floatingControlData } = useLayoutStore();
  const { studio } = useStudioStore();
  const { clipId } = floatingControlData || {};
  const clip = studio?.getClipById(clipId) as any;

  const [colorValue, setColorValue] = useState<ColorValue>({
    saturation: clip?.colorAdjustment?.basic?.saturation ?? 0,
    temperature: clip?.colorAdjustment?.basic?.temperature ?? 0,
    hue: clip?.colorAdjustment?.basic?.hue ?? 0,
  });

  const [lightValue, setLightValue] = useState<LightValue>({
    brightness: clip?.colorAdjustment?.basic?.brightness ?? 0,
    contrast: clip?.colorAdjustment?.basic?.contrast ?? 0,
    shine: clip?.colorAdjustment?.basic?.shine ?? 0,
    highlight: clip?.colorAdjustment?.basic?.highlight ?? 0,
    shadow: clip?.colorAdjustment?.basic?.shadow ?? 0,
  });

  const [effectsValue, setEffectsValue] = useState<EffectsValue>({
    sharpness: clip?.colorAdjustment?.basic?.sharpness ?? 0,
    vignette: clip?.colorAdjustment?.basic?.vignette ?? 0,
    fade: clip?.colorAdjustment?.basic?.fade ?? 0,
    grain: clip?.colorAdjustment?.basic?.grain ?? 0,
  });

  // Update state when clip changes
  useEffect(() => {
    if (clip?.colorAdjustment?.basic) {
      setColorValue({
        saturation: clip.colorAdjustment.basic.saturation ?? 0,
        temperature: clip.colorAdjustment.basic.temperature ?? 0,
        hue: clip.colorAdjustment.basic.hue ?? 0,
      });
      setLightValue({
        brightness: clip.colorAdjustment.basic.brightness ?? 0,
        contrast: clip.colorAdjustment.basic.contrast ?? 0,
        shine: clip.colorAdjustment.basic.shine ?? 0,
        highlight: clip.colorAdjustment.basic.highlight ?? 0,
        shadow: clip.colorAdjustment.basic.shadow ?? 0,
      });
      setEffectsValue({
        sharpness: clip.colorAdjustment.basic.sharpness ?? 0,
        vignette: clip.colorAdjustment.basic.vignette ?? 0,
        fade: clip.colorAdjustment.basic.fade ?? 0,
        grain: clip.colorAdjustment.basic.grain ?? 0,
      });
    }
  }, [clip?.colorAdjustment?.basic]);

  // Update clip when values change
  const updateClip = useCallback((updates: Partial<ColorValue>) => {
    if (!clip) return;
    
    const newColorValue = { ...colorValue, ...updates };
    setColorValue(newColorValue);
    
    clip.update({
      colorAdjustment: {
        enabled: true,
        type: 'basic',
        basic: {
          ...(clip.colorAdjustment?.basic ?? {}),
          ...newColorValue,
          ...lightValue,
          ...effectsValue,
        },
        hsl: clip.colorAdjustment?.hsl,
        curves: clip.colorAdjustment?.curves,
      },
    });
  }, [clip, colorValue, lightValue, effectsValue]);

  const updateLightClip = useCallback(
    (updates: Partial<LightValue>) => {
      if (!clip) return;

      const newLightValue = { ...lightValue, ...updates };
      setLightValue(newLightValue);

      clip.update({
        colorAdjustment: {
          enabled: true,
          type: "basic",
          basic: {
            ...(clip.colorAdjustment?.basic ?? {}),
            ...colorValue,
            ...newLightValue,
            ...effectsValue,
          },
          hsl: clip.colorAdjustment?.hsl,
          curves: clip.colorAdjustment?.curves,
        },
      });
    },
    [clip, lightValue, colorValue, effectsValue],
  );

  const updateEffectsClip = useCallback(
    (updates: Partial<EffectsValue>) => {
      if (!clip) return;

      const newEffectsValue = { ...effectsValue, ...updates };
      setEffectsValue(newEffectsValue);

      clip.update({
        colorAdjustment: {
          enabled: true,
          type: "basic",
          basic: {
            ...(clip.colorAdjustment?.basic ?? {}),
            ...colorValue,
            ...lightValue,
            ...newEffectsValue,
          },
          hsl: clip.colorAdjustment?.hsl,
          curves: clip.colorAdjustment?.curves,
        },
      });
    },
    [clip, effectsValue, colorValue, lightValue],
  );

  const min = -100;
  const max = 100;

  const effectsMinMax = {
    sharpness: { min: 0, max: 100 },
    vignette: { min: -100, max: 100 },
    fade: { min: 0, max: 100 },
    grain: { min: 0, max: 100 },
  };

  const getRangeStyle = useCallback(
    (value: number, customMin?: number, customMax?: number) => {
      const effectiveMin = customMin ?? min;
      const effectiveMax = customMax ?? max;
      const effectiveRange = effectiveMax - effectiveMin;
      const effectiveCenterPercent = Math.abs(effectiveMin) / effectiveRange;

      if (value >= 0) {
        const width =
          (value / effectiveMax) * (1 - effectiveCenterPercent) * 100;
        return {
          left: `${effectiveCenterPercent * 100}%`,
          width: `${width}%`,
        };
      } else {
        const width =
          (Math.abs(value) / Math.abs(effectiveMin)) *
          effectiveCenterPercent *
          100;
        return {
          left: `${(effectiveCenterPercent - width / 100) * 100}%`,
          width: `${width}%`,
        };
      }
    },
    [min, max],
  );

  const colorSliderStyles = useMemo(
    () => ({
      saturation: getRangeStyle(colorValue.saturation),
      temperature: getRangeStyle(colorValue.temperature),
      hue: getRangeStyle(colorValue.hue),
    }),
    [colorValue, getRangeStyle],
  );

  const lightSliderStyles = useMemo(
    () => ({
      brightness: getRangeStyle(lightValue.brightness),
      contrast: getRangeStyle(lightValue.contrast),
      shine: getRangeStyle(lightValue.shine),
      highlight: getRangeStyle(lightValue.highlight),
      shadow: getRangeStyle(lightValue.shadow),
    }),
    [lightValue, getRangeStyle],
  );

  const effectsSliderStyles = useMemo(
    () => ({
      vignette: getRangeStyle(
        effectsValue.vignette,
        effectsMinMax.vignette.min,
        effectsMinMax.vignette.max,
      ),
    }),
    [effectsValue.vignette, getRangeStyle],
  );

  const handleColorSliderChange = useCallback(
    (type: ColorAdjustment, value: number[]) => {
      updateClip({ [type]: value[0] });
    },
    [updateClip],
  );

  const handleColorInputChange = useCallback(
    (type: ColorAdjustment, value: string) => {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        updateClip({ [type]: Math.min(max, Math.max(min, numValue)) });
      }
    },
    [updateClip],
  );

  const handleLightSliderChange = useCallback(
    (type: LightAdjustment, value: number[]) => {
      updateLightClip({ [type]: value[0] });
    },
    [updateLightClip],
  );

  const handleLightInputChange = useCallback(
    (type: LightAdjustment, value: string) => {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        updateLightClip({ [type]: Math.min(max, Math.max(min, numValue)) });
      }
    },
    [min, max, updateLightClip],
  );

  const handleEffectsSliderChange = useCallback(
    (type: EffectsAdjustment, value: number[]) => {
      updateEffectsClip({ [type]: value[0] });
    },
    [updateEffectsClip],
  );

  const handleEffectsInputChange = useCallback(
    (type: EffectsAdjustment, value: string) => {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        const { min: effectMin, max: effectMax } = effectsMinMax[type];
        updateEffectsClip({
          [type]: Math.min(effectMax, Math.max(effectMin, numValue)),
        });
      }
    },
    [updateEffectsClip],
  );

  const colorControls: Array<{
    id: ColorAdjustment;
    label: string;
    value: number;
  }> = [
    { id: "saturation", label: "Saturation", value: colorValue.saturation },
    { id: "temperature", label: "Temperature", value: colorValue.temperature },
    { id: "hue", label: "Hue", value: colorValue.hue },
  ];

  const lightControls: Array<{
    id: LightAdjustment;
    label: string;
    value: number;
  }> = [
    { id: "brightness", label: "Brightness", value: lightValue.brightness },
    { id: "contrast", label: "Contrast", value: lightValue.contrast },
    { id: "shine", label: "Shine", value: lightValue.shine },
    { id: "highlight", label: "Highlight", value: lightValue.highlight },
    { id: "shadow", label: "Shadow", value: lightValue.shadow },
  ];

  const effectsControls: Array<{
    id: EffectsAdjustment;
    label: string;
    value: number;
    min: number;
    max: number;
    useCustomStyle?: boolean;
  }> = [
    {
      id: "sharpness",
      label: "Sharpness",
      value: effectsValue.sharpness,
      min: 0,
      max: 100,
      useCustomStyle: false,
    },
    {
      id: "vignette",
      label: "Vignette",
      value: effectsValue.vignette,
      min: -100,
      max: 100,
      useCustomStyle: true,
    },
    {
      id: "fade",
      label: "Fade",
      value: effectsValue.fade,
      min: 0,
      max: 100,
      useCustomStyle: false,
    },
    {
      id: "grain",
      label: "Grain",
      value: effectsValue.grain,
      min: 0,
      max: 100,
      useCustomStyle: false,
    },
  ];

  return (
    <ScrollArea className="h-[500px] w-full">
      <div className="pb-4">
        {/* COLOR SECTION */}
        <div className="px-2">
          <label className="text-xs font-semibold uppercase tracking-wider">
            Color
          </label>

          {colorControls.map(({ id, label, value }) => (
            <div key={id} className="mt-2">
              <span className="text-[10px] text-muted-foreground">{label}</span>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <style>{`
                  .slider-color-${id} [data-slot="slider"] {
                    justify-content: center;
                  }
                  .slider-color-${id} [data-slot="slider-range"] {
                    left: ${colorSliderStyles[id].left} !important;
                    width: ${colorSliderStyles[id].width} !important;
                  }
                `}</style>

                  <Slider
                    value={[value]}
                    onValueChange={(newValue) =>
                      handleColorSliderChange(id, newValue)
                    }
                    min={min}
                    max={max}
                    step={1}
                    className={`slider-color-${id} w-full`}
                  />
                </div>

                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleColorInputChange(id, e.target.value)}
                  min={min}
                  max={max}
                  step={1}
                  className="w-20 text-[10px]"
                />
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* LIGHTNESS SECTION */}
        <div className="px-2">
          <label className="text-xs font-semibold uppercase tracking-wider">
            Lightness
          </label>

          {lightControls.map(({ id, label, value }) => (
            <div key={id} className="mt-2">
              <span className="text-[10px] text-muted-foreground">{label}</span>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <style>{`
                  .slider-light-${id} [data-slot="slider"] {
                    justify-content: center;
                  }
                  .slider-light-${id} [data-slot="slider-range"] {
                    left: ${lightSliderStyles[id].left} !important;
                    width: ${lightSliderStyles[id].width} !important;
                  }
                `}</style>

                  <Slider
                    value={[value]}
                    onValueChange={(newValue) =>
                      handleLightSliderChange(id, newValue)
                    }
                    min={min}
                    max={max}
                    step={1}
                    className={`slider-light-${id} w-full`}
                  />
                </div>

                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleLightInputChange(id, e.target.value)}
                  min={min}
                  max={max}
                  step={1}
                  className="w-20 text-[10px]"
                />
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* EFFECTS SECTION */}
        <div className="px-2">
          <label className="text-xs font-semibold uppercase tracking-wider">
            Effects
          </label>

          {effectsControls.map(
            ({
              id,
              label,
              value,
              min: effectMin,
              max: effectMax,
              useCustomStyle,
            }) => (
              <div key={id} className="mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1">
                    {useCustomStyle ? (
                      <>
                        <style>{`
              .slider-effects-${id} [data-slot="slider"] {
                justify-content: center;
              }
              .slider-effects-${id} [data-slot="slider-range"] {
                left: ${effectsSliderStyles.vignette.left} !important;
                width: ${effectsSliderStyles.vignette.width} !important;
              }
            `}</style>
                        <Slider
                          value={[value]}
                          onValueChange={(newValue) =>
                            handleEffectsSliderChange(id, newValue)
                          }
                          min={effectMin}
                          max={effectMax}
                          step={1}
                          className={`slider-effects-${id} w-full`}
                        />
                      </>
                    ) : (
                      <Slider
                        value={[value]}
                        onValueChange={(newValue) =>
                          handleEffectsSliderChange(id, newValue)
                        }
                        min={effectMin}
                        max={effectMax}
                        step={1}
                        className="w-full"
                      />
                    )}
                  </div>

                  <Input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      handleEffectsInputChange(id, e.target.value)
                    }
                    min={effectMin}
                    max={effectMax}
                    step={1}
                    className="w-20 text-[10px]"
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

export default AdjusmentBasic;
