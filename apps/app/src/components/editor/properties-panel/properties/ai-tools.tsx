"use client";

import { IconEar, IconActivity, IconMicrophone } from "@tabler/icons-react";
import { Switch } from "@/components/ui/switch";

interface AiToolsPropertyProps {
  noiseReduction: boolean;
  enhanceVoice: boolean;
  beatsDetection: boolean;
  onNoiseReductionChange: (val: boolean) => void;
  onEnhanceVoiceChange: (val: boolean) => void;
  onBeatsDetectionChange: (val: boolean) => void;
}

export function AiToolsProperty({
  noiseReduction,
  enhanceVoice,
  beatsDetection,
  onNoiseReductionChange,
  onEnhanceVoiceChange,
  onBeatsDetectionChange,
}: AiToolsPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-12 flex items-center">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Ai tools
        </label>
      </div>
      <div className="flex flex-col gap-2">
        {/* Noise Reduction */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-border/60 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-background/80">
                <IconEar className="size-4 text-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Noise Reduction</span>
                <span className="text-xs text-muted-foreground">Reduce background noise</span>
              </div>
            </div>
            <Switch checked={noiseReduction} onCheckedChange={onNoiseReductionChange} />
          </div>
        </div>

        {/* Enhance Voice */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-border/60 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-background/80">
                <IconMicrophone className="size-4 text-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Enhance Voice</span>
                <span className="text-xs text-muted-foreground">Clarify spoken frequencies</span>
              </div>
            </div>
            <Switch checked={enhanceVoice} onCheckedChange={onEnhanceVoiceChange} />
          </div>
        </div>

        {/* Beats Detection */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-border/60 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-background/80">
                <IconActivity className="size-4 text-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Beats Detection</span>
                <span className="text-xs text-muted-foreground">Detect and snap to beats</span>
              </div>
            </div>
            <Switch checked={beatsDetection} onCheckedChange={onBeatsDetectionChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
