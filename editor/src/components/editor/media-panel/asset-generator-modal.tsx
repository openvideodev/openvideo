"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGeneratorModalStore } from "@/stores/generator-modal-store";
import { useGeneratedStore } from "@/stores/generated-store";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
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
  IconBox,
  IconLayoutGrid,
  IconScale,
  IconClock,
  IconPlus,
  IconMinus,
  IconCoin,
  IconStack,
  IconArrowUp,
  IconSparkles,
  IconDeviceMobile,
  IconCheck,
} from "@tabler/icons-react";
import { SettingsIcon } from "lucide-react";

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
  // {
  //   id: 'motion-graphic',
  //   label: 'Motion Graphic',
  //   icon: IconSquareRoundedLetterM,
  //   placeholder: "Describe the motion graphic animation you want…",
  // },
  // {
  //   id: 'upscale',
  //   label: 'Upscale',
  //   icon: IconArrowsMaximize,
  //   placeholder: "Paste a URL or describe the asset to upscale…",
  // },
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

const RATIOS = ["1:1", "16:9", "9:16"];
const DURATIONS = [5, 10, 15, 30, 60];
const MODELS = ["Nano Banana 2", "Nano Banana Turbo", "Standard Model 1"];

const STORAGE_KEY = "designcombo_uploads";
const PROJECT_ID = "local-uploads";

// Mock visual resources for simulation
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
];
const MOCK_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-31742-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-flowing-neon-glowing-lines-background-31744-large.mp4",
];

const SURPRISE_PROMPTS = [
  "Sunlight filtering through trees and a gentle stream flowing",
  "A futuristic cyberpunk street lined with glowing neon signs at midnight",
  "A majestic dragon perched on a misty mountain peak during sunset",
  "A cozy library with a fireplace burning and rain pattering on the window",
  "An astronaut floating in deep space, looking at a beautiful distant galaxy",
  "A cute baby panda playing in a bamboo forest, stylized 3D render",
  "Lofi chill beach scene with slow moving waves under a pastel pink sky",
];

export function AssetGeneratorModal() {
  const { isOpen, close } = useGeneratorModalStore();
  const { addAsset } = useGeneratedStore();

  const [selectedType, setSelectedType] = useState<GenerateAssetType>("video");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(true);
  const [activePills, setActivePills] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("Nano Banana 2");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [quantity, setQuantity] = useState(1);

  // Type popover state
  const [typeOpen, setTypeOpen] = useState(false);
  // Ratio popover state
  const [ratioOpen, setRatioOpen] = useState(false);
  // Duration popover state
  const [durationOpen, setDurationOpen] = useState(false);
  // Model popover state
  const [modelOpen, setModelOpen] = useState(false);

  const currentTypeOption = ASSET_TYPES.find((t) => t.id === selectedType)!;
  const CurrentIcon = currentTypeOption.icon;

  // Toggle pills
  const handlePillClick = (pill: string) => {
    setActivePills((prev) =>
      prev.includes(pill) ? prev.filter((p) => p !== pill) : [...prev, pill],
    );
  };

  const handleSurpriseMe = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const randomIndex = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    setPrompt(SURPRISE_PROMPTS[randomIndex]);
  };

  // Cost calculation
  const getCost = () => {
    switch (selectedType) {
      case "video":
        return 40 * quantity;
      case "image":
        return 10 * quantity;
      case "motion-graphic":
        return 20 * quantity;
      case "upscale":
        return 15 * quantity;
      case "lip-sync":
        return 30 * quantity;
      case "voiceover":
        return 5 * quantity;
      case "music":
        return 15 * quantity;
      case "sfx":
        return 5 * quantity;
      default:
        return 10;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      if (["voiceover", "music", "sfx"].includes(selectedType)) {
        // Real ElevenLabs API generation
        let endpoint = "/api/elevenlabs/voiceover";
        let bodyPayload: any = { text: prompt };

        if (selectedType === "music") {
          endpoint = "/api/elevenlabs/music";
          bodyPayload = { text: prompt, duration: selectedDuration };
        } else if (selectedType === "sfx") {
          endpoint = "/api/elevenlabs/sfx";
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate ${selectedType}`);
        }

        const data = await response.json();

        addAsset({
          id: crypto.randomUUID(),
          url: data.url,
          text: prompt,
          type: selectedType as any,
          createdAt: Date.now(),
        });

        toast.success(`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} generated!`);
        // Notify any listeners (e.g. panels) to reload
        window.dispatchEvent(new CustomEvent("asset-generated"));
      } else {
        // Simulate video/image generation and save to OPFS/LocalStorage
        await new Promise((r) => setTimeout(r, 2000));

        const isImg = selectedType === "image";
        const mockUrls = isImg ? MOCK_IMAGES : MOCK_VIDEOS;
        const mockUrl = mockUrls[Math.floor(Math.random() * mockUrls.length)];

        const id = crypto.randomUUID();
        const type = isImg ? "image" : "video";

        try {
          const res = await fetch(mockUrl);
          const blob = await res.blob();
          const file = new File([blob], `${selectedType}-${id}.${isImg ? "jpg" : "mp4"}`, {
            type: blob.type,
          });

          if (storageService.isOPFSSupported()) {
            await storageService.saveMediaFile({
              projectId: PROJECT_ID,
              mediaItem: { id, file, name: file.name, type, url: mockUrl },
            });
          }
        } catch (opfsErr) {
          console.warn("Failed to save to OPFS, falling back to LocalStorage", opfsErr);
        }

        // Always save to LocalStorage list
        const stored = localStorage.getItem(STORAGE_KEY);
        const uploadsList = stored ? JSON.parse(stored) : [];
        const newAsset = {
          id,
          name: `${selectedType}-${id.slice(0, 8)}`,
          src: mockUrl,
          type,
          createdAt: Date.now(),
        };
        const updated = [newAsset, ...uploadsList];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        toast.success(
          `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} generated and added to uploads!`,
        );
        // Notify Assets panel to refresh
        window.dispatchEvent(new CustomEvent("asset-generated"));
      }

      setPrompt("");
      close();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to generate ${selectedType}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="backdrop-blur-none"
        className="sm:max-w-2xl w-full p-6 bg-card border border-border rounded-sm shadow-2xl focus-visible:outline-none focus:outline-none text-foreground select-none overflow-visible animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogTitle className="sr-only">AI Asset Generator</DialogTitle>
        <DialogDescription className="sr-only">
          Generate assets such as videos, images, and audio using AI.
        </DialogDescription>

        <div className="w-full h-full flex flex-col gap-4">
          {/* Text Input Prompt */}
          <div className="w-full min-h-[90px] relative flex flex-col py-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full flex-1 bg-transparent resize-none focus:outline-none placeholder:text-transparent text-sm leading-relaxed border-0 text-foreground p-0 focus:ring-0 focus-visible:ring-0 z-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            {!prompt && (
              <div className="absolute inset-0 text-sm text-muted-foreground/45 leading-relaxed pointer-events-none select-none z-0">
                Describe your video idea... (e.g., 'Sunlight filtering through trees and a gentle
                stream flowing') or{" "}
                <span
                  onClick={handleSurpriseMe}
                  className="text-foreground hover:text-muted-foreground font-medium cursor-pointer underline decoration-dotted pointer-events-auto transition-colors"
                >
                  surprise me!
                </span>
              </div>
            )}
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-border/50 my-1 w-full" />

          {/* Bottom Toolbar */}

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between gap-4 w-full px-1 pt-1">
            {/* Left selectors */}
            <div className="flex items-center gap-5 flex-wrap">
              {/* Media Type Dropdown Selector */}
              <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0"
                  >
                    <CurrentIcon className="size-[18px] shrink-0" stroke={1.5} />
                    <span>{currentTypeOption.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  sideOffset={6}
                  className="p-1 w-52 bg-popover border border-border shadow-2xl rounded-xl overflow-hidden text-popover-foreground"
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
                          setTypeOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors duration-150",
                          isSelected
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <OptionIcon className="size-4 shrink-0" stroke={1.5} />
                          <span className="text-left">{option.label}</span>
                        </div>
                        {isSelected && <IconCheck className="size-3.5 shrink-0" stroke={3} />}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>

              {/* Model Selector */}
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0"
                  >
                    <SettingsIcon className="size-[18px] shrink-0" strokeWidth={1.5} />
                    <span>{selectedModel}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  className="p-1 w-44 bg-popover border border-border shadow-2xl rounded-xl text-popover-foreground text-xs"
                >
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedModel(m);
                        setModelOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                        selectedModel === m
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <span className="text-left">{m}</span>
                      {selectedModel === m && (
                        <IconCheck className="size-3.5 shrink-0" stroke={3} />
                      )}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Aspect Ratio Selector */}
              {["video", "image", "motion-graphic"].includes(selectedType) && (
                <Popover open={ratioOpen} onOpenChange={setRatioOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0"
                    >
                      <IconDeviceMobile className="size-[18px] shrink-0" stroke={1.5} />
                      <span>{selectedRatio}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="p-1 w-28 bg-popover border border-border shadow-2xl rounded-xl text-popover-foreground text-xs"
                  >
                    {RATIOS.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSelectedRatio(r);
                          setRatioOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                          selectedRatio === r
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <span className="text-left">{r}</span>
                        {selectedRatio === r && (
                          <IconCheck className="size-3.5 shrink-0" stroke={3} />
                        )}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}

              {/* Duration Selector for audio/music AND video */}
              {["video", "motion-graphic", "music", "voiceover", "sfx"].includes(selectedType) && (
                <Popover open={durationOpen} onOpenChange={setDurationOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0"
                    >
                      <span>{selectedDuration}s</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="p-1 w-28 bg-popover border border-border shadow-2xl rounded-xl text-popover-foreground text-xs"
                  >
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setSelectedDuration(d);
                          setDurationOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                          selectedDuration === d
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <span className="text-left">{d}s</span>
                        {selectedDuration === d && (
                          <IconCheck className="size-3.5 shrink-0" stroke={3} />
                        )}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}

              {/* Quantity Selector */}
              {["image"].includes(selectedType) && (
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-0.5 hover:text-foreground transition-colors"
                  >
                    <IconMinus className="size-4 stroke-[2.5]" />
                  </button>
                  <span className="text-xs font-semibold w-3 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="p-0.5 hover:text-foreground transition-colors"
                  >
                    <IconPlus className="size-4 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Generate Button */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Token Credits cost */}
              {selectedType !== "video" && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold px-2">
                  <IconCoin className="size-4 shrink-0" />
                  <span>{getCost()}</span>
                </div>
              )}

              {/* Generate Button */}
              <Button
                className="h-9 px-4 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-semibold flex items-center justify-center border-0 shadow-sm shrink-0 transition-colors"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
              >
                {loading && <IconLoader2 className="size-4 animate-spin mr-2" />}
                Generate
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
