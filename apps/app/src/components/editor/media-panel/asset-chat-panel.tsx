"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  IconLoader2,
  IconVideo,
  IconPhoto,
  IconSquareRoundedLetterM,
  IconArrowsMaximize,
  IconUser,
  IconMicrophone,
  IconMusic,
  IconWaveSine,
  IconChevronDown,
} from "@tabler/icons-react";

export type GenerateAssetType =
  | "video"
  | "image"
  | "motion-graphic"
  | "upscale"
  | "lip-sync"
  | "voiceover"
  | "music"
  | "sfx";

interface AssetTypeOption {
  id: GenerateAssetType;
  label: string;
  icon: React.FC<{ className?: string; size?: number; stroke?: number }>;
  placeholder: string;
}

const ASSET_TYPES: AssetTypeOption[] = [
  {
    id: "video",
    label: "Video",
    icon: IconVideo,
    placeholder:
      "Describe your video idea… (e.g., 'Sunlight filtering through trees and a gentle stream flowing') or surprise me!",
  },
  {
    id: "image",
    label: "Image",
    icon: IconPhoto,
    placeholder: "Describe the image you want to generate…",
  },
  {
    id: "motion-graphic",
    label: "Motion Graphic",
    icon: IconSquareRoundedLetterM,
    placeholder: "Describe the motion graphic animation you want…",
  },
  {
    id: "upscale",
    label: "Upscale",
    icon: IconArrowsMaximize,
    placeholder: "Paste a URL or describe the asset to upscale…",
  },
  {
    id: "lip-sync",
    label: "Lip Sync",
    icon: IconUser,
    placeholder: "Describe the character and dialogue for lip sync…",
  },
  {
    id: "voiceover",
    label: "Voiceover",
    icon: IconMicrophone,
    placeholder: "Enter the text you want to convert to voiceover…",
  },
  {
    id: "music",
    label: "Music",
    icon: IconMusic,
    placeholder: "Describe the music mood or style you want to generate…",
  },
  {
    id: "sfx",
    label: "SFX",
    icon: IconWaveSine,
    placeholder: "Describe the sound effect you want to generate…",
  },
];

export const AssetChatPanel = () => {
  const [selectedType, setSelectedType] = useState<GenerateAssetType>("video");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const current = ASSET_TYPES.find((t) => t.id === selectedType)!;
  const Icon = current.icon;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    // TODO: wire up actual generation per type
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border-t border-input">
      {/* Prompt area */}
      <div className="flex-1 px-4 pt-3 pb-1 overflow-hidden">
        <Textarea
          placeholder={current.placeholder}
          className="resize-none text-sm w-full h-full !bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 shadow-none placeholder:text-muted-foreground/50 leading-relaxed"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="flex-none flex items-center justify-between px-3 pb-3 pt-1 gap-2">
        {/* Type selector dropdown */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border",
                open
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-white/5 border-white/8 text-muted-foreground hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{current.label}</span>
              <IconChevronDown
                className={cn("size-3 transition-transform duration-150", open && "rotate-180")}
              />
            </button>
          </PopoverTrigger>

          {/* Dropdown — opens upward */}
          <PopoverContent
            side="top"
            align="start"
            sideOffset={6}
            className="p-0 w-52 bg-popover border border-white/10 shadow-xl rounded-lg overflow-hidden"
          >
            {ASSET_TYPES.map((option) => {
              const isSelected = selectedType === option.id;
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    isSelected
                      ? "bg-white/8 text-white"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white/90",
                  )}
                >
                  <OptionIcon className="size-[15px] shrink-0" stroke={1.5} />
                  <span className="flex-1 text-left font-medium">{option.label}</span>
                  {/* Radio indicator */}
                  <span
                    className={cn(
                      "size-[15px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-white" : "border-white/30",
                    )}
                  >
                    {isSelected && <span className="size-[7px] rounded-full bg-white block" />}
                  </span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>

        {/* Generate button */}
        <Button
          className="h-8 px-5 rounded-full text-xs font-semibold shrink-0"
          size="sm"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? <IconLoader2 className="size-3.5 animate-spin" /> : "Generate"}
        </Button>
      </div>
    </div>
  );
};
