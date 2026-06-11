"use client";

import { IconSparkles } from "@tabler/icons-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">AI Tools</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col gap-2">
        {/* Noise Reduction */}
        <div
          className={cn(
            "p-3 rounded-lg border transition-all duration-300",
            noiseReduction
              ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.05)]"
              : "bg-secondary/30 border-border/40 hover:border-border/60",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Noise Reduction</span>
              <span className="text-[10px] text-muted-foreground">Reduce background noise</span>
            </div>
            <Switch
              checked={noiseReduction}
              onCheckedChange={onNoiseReductionChange}
              className="data-[state=checked]:bg-violet-500"
            />
          </div>
        </div>

        {/* Enhance Voice */}
        <div
          className={cn(
            "p-3 rounded-lg border transition-all duration-300",
            enhanceVoice
              ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.05)]"
              : "bg-secondary/30 border-border/40 hover:border-border/60",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Enhance Voice</span>
              <span className="text-[10px] text-muted-foreground">Clarify spoken frequencies</span>
            </div>
            <Switch
              checked={enhanceVoice}
              onCheckedChange={onEnhanceVoiceChange}
              className="data-[state=checked]:bg-violet-500"
            />
          </div>
        </div>

        {/* Beats Detection */}
        <div
          className={cn(
            "p-3 rounded-lg border transition-all duration-300",
            beatsDetection
              ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.05)]"
              : "bg-secondary/30 border-border/40 hover:border-border/60",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Beats Detection</span>
              <span className="text-[10px] text-muted-foreground">Detect and snap to beats</span>
            </div>
            <Switch
              checked={beatsDetection}
              onCheckedChange={onBeatsDetectionChange}
              className="data-[state=checked]:bg-violet-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
