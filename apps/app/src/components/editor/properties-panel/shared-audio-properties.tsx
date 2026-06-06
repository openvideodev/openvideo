import * as React from "react";
import { IClip } from "@openvideo/engine-pixi";
import {
  IconVolume,
  IconEar,
  IconActivity,
  IconMicrophone,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/ui/number-input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useStore } from "zustand";
import { projectStore, core } from "@/lib/project";

interface SharedAudioPropertiesProps {
  clip: IClip;
}

export function SharedAudioProperties({ clip }: SharedAudioPropertiesProps) {
  const coreClipBase = useStore(projectStore, (s) => s.clips[clip.id]);
  const coreClip = coreClipBase ?? clip;

  if (!coreClip) return null;

  const handleUpdate = (updates: any) => {
    core.clip.update(clip.id, updates);
  };

  const timing = coreClip.timing || {
    display: { from: 0, to: 0 },
    trim: { from: 0, to: 0 },
    duration: 0,
    playbackRate: 1,
  };

  const fadeIn = timing.fadeIn || { duration: 0, curve: "linear" };
  const fadeOut = timing.fadeOut || { duration: 0, curve: "linear" };

  const handleFadeInDurationChange = (val: number) => {
    const newFadeIn = val > 0 ? { duration: val, curve: "linear" } : undefined;
    handleUpdate({
      timing: {
        ...timing,
        fadeIn: newFadeIn,
      },
    });
  };

  const handleFadeOutDurationChange = (val: number) => {
    const newFadeOut = val > 0 ? { duration: val, curve: "linear" } : undefined;
    handleUpdate({
      timing: {
        ...timing,
        fadeOut: newFadeOut,
      },
    });
  };

  // UI-only feature metadata helpers
  const metadata = coreClip.metadata || {};
  const isNoiseReduction = !!metadata.noiseReduction;
  const isBeatsDetection = !!metadata.beatsDetection;
  const isEnhanceVoice = !!metadata.enhanceVoice;

  const toggleMetadata = (key: string, val: boolean) => {
    handleUpdate({
      metadata: {
        ...metadata,
        [key]: val,
      },
    });
  };

  return (
    <FieldGroup className="flex flex-col gap-5">
      {/* Volume Section */}
      <Field>
        <FieldLabel>Volume</FieldLabel>
        <div className="flex items-center gap-4">
          <IconVolume className="size-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[Math.round((coreClip.volume ?? 1) * 100)]}
            onValueChange={(v) => handleUpdate({ volume: v[0] / 100 })}
            max={100}
            step={1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <NumberInput
              value={Math.round((coreClip.volume ?? 1) * 100)}
              onChange={(val) => handleUpdate({ volume: (val || 0) / 100 })}
              className="p-0 text-center text-sm"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">%</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Field>

      {/* Fade In Section */}
      <Field>
        <FieldLabel>Fade In</FieldLabel>
        <div className="flex items-center gap-4">
          <IconTrendingUp className="size-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[fadeIn.duration]}
            onValueChange={(v) => handleFadeInDurationChange(v[0])}
            min={0}
            max={5000}
            step={100}
            className="flex-1"
          />
          <InputGroup className="w-24">
            <NumberInput
              value={fadeIn.duration}
              onChange={(val) => handleFadeInDurationChange(val || 0)}
              className="p-0 text-center text-xs"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">ms</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Field>

      {/* Fade Out Section */}
      <Field>
        <FieldLabel>Fade Out</FieldLabel>
        <div className="flex items-center gap-4">
          <IconTrendingDown className="size-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[fadeOut.duration]}
            onValueChange={(v) => handleFadeOutDurationChange(v[0])}
            min={0}
            max={5000}
            step={100}
            className="flex-1"
          />
          <InputGroup className="w-24">
            <NumberInput
              value={fadeOut.duration}
              onChange={(val) => handleFadeOutDurationChange(val || 0)}
              className="p-0 text-center text-xs"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">ms</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Field>

      {/* Audio Features Section */}
      <FieldGroup>
        <FieldLabel>Audio Features</FieldLabel>

        {/* Noise Reduction */}
        <Field>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconEar className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Noise Reduction</span>
                <span className="text-[10px] text-muted-foreground">Reduce background noise</span>
              </div>
            </div>
            <Switch
              checked={isNoiseReduction}
              onCheckedChange={(checked) => toggleMetadata("noiseReduction", checked)}
            />
          </div>
        </Field>

        {/* Enhance Voice */}
        <Field>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconMicrophone className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Enhance Voice</span>
                <span className="text-[10px] text-muted-foreground">
                  Clarify spoken frequencies
                </span>
              </div>
            </div>
            <Switch
              checked={isEnhanceVoice}
              onCheckedChange={(checked) => toggleMetadata("enhanceVoice", checked)}
            />
          </div>
        </Field>

        {/* Beats Detection */}
        <Field>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconActivity className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Beats Detection</span>
                <span className="text-[10px] text-muted-foreground">Detect and snap to beats</span>
              </div>
            </div>
            <Switch
              checked={isBeatsDetection}
              onCheckedChange={(checked) => toggleMetadata("beatsDetection", checked)}
            />
          </div>
        </Field>
      </FieldGroup>
    </FieldGroup>
  );
}
