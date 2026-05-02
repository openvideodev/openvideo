import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTransitionOptions, registerCustomTransition } from "@openvideo/engine-pixi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Icons } from "@/components/shared/icons";
import { engine } from "@/lib/project";
import Draggable from "@/components/shared/draggable";

const TRANSITION_DURATION_DEFAULT = 2_000_000;

const gridClasses = `
  grid
  grid-cols-[repeat(auto-fill,minmax(80px,1fr))]
  gap-4
  justify-items-center
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomPreset = {
  id: string;
  name: string;
  category: string;
  data: { label: string; fragment: string };
  published: boolean;
  userId: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Finds the first junction between two adjacent "media" clips (Video or Image)
 * across all Video tracks, sorted by start time.
 */
const findFirstMediaClipUnion = (studio: any) => {
  const tracks = studio.getTracks().filter((t: any) => t.type === "Video" || t.type === "Image");
  const unions: { fromId: string; toId: string; start: number; duration: number }[] = [];

  for (const track of tracks) {
    const clips = track.clipIds
      .map((id: string) => studio.getClipById(id))
      .filter((c: any) => c && (c.type === "Video" || c.type === "Image"))
      .sort((a: any, b: any) => a.display.from - b.display.from);

    for (let i = 0; i < clips.length - 1; i++) {
      const current = clips[i];
      const next = clips[i + 1];

      // Check if they are adjacent (allowing for a small 100ms tolerance for sub-frame gaps)
      const gap = Math.abs(next.display.from - current.display.to);
      if (gap < 100_000) {
        const duration = Math.min(current.duration, next.duration) * 0.25;
        unions.push({
          fromId: current.id,
          toId: next.id,
          start: current.display.to,
          duration,
        });
      }
    }
  }

  if (unions.length === 0) return null;

  // Return the one that starts earliest
  return unions.sort((a, b) => a.start - b.start)[0];
};

// ─── Shared card for built-in transitions ─────────────────────────────────────

type TransitionCardProps = {
  effectKey: string;
  label: string;
  previewStatic: string;
  previewDynamic: string;
  onClick: () => void;
  badge?: string;
};

const TransitionCard = ({
  effectKey,
  label,
  previewStatic,
  previewDynamic,
  onClick,
  badge,
}: TransitionCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const dragData = {
    type: "Transition",
    name: label,
    transitionEffect: {
      id: effectKey,
      key: effectKey,
      name: label,
    },
    duration: TRANSITION_DURATION_DEFAULT,
  };

  return (
    <Draggable
      data={dragData}
      renderCustomPreview={
        <div className="w-12 h-12 bg-black rounded flex items-center justify-center opacity-90 shadow-lg border border-primary/50">
          <Icons.transition className="text-white w-6 h-6" />
        </div>
      }
    >
      <div
        className="flex w-full items-center gap-2 flex-col group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <div className="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
          {previewStatic || previewDynamic ? (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-150"
              style={{
                backgroundImage: `url(${isHovered && previewDynamic ? previewDynamic : previewStatic})`,
              }}
            />
          ) : (
            <div className="text-xs text-muted-foreground text-center px-2 bg-primary/40 h-full w-full"></div>
          )}

          {badge && (
            <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </div>
          )}

          <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
            {label}
          </div>
        </div>
      </div>
    </Draggable>
  );
};

// ─── Default Transitions ──────────────────────────────────────────────────────

const TransitionDefault = () => {
  const allTransitions = getTransitionOptions();

  return (
    <>
      {allTransitions.map((effect) => (
        <TransitionCard
          key={effect.key}
          effectKey={effect.key}
          label={effect.label}
          previewStatic={effect.previewStatic}
          previewDynamic={effect.previewDynamic}
          onClick={() => {
            engine.addClip({
              type: "Transition",
              name: effect.label,
              transitionEffect: {
                id: effect.key,
                key: effect.key,
                name: effect.label,
              },
              duration: TRANSITION_DURATION_DEFAULT,
            });
          }}
        />
      ))}
    </>
  );
};

// ─── Custom Transitions (from DB) ────────────────────────────────────────────

const TransitionCustom = () => {
  const [ownPresets, setOwnPresets] = useState<CustomPreset[]>([]);
  const [publishedPresets, setPublishedPresets] = useState<CustomPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/custom-presets?category=transitions");
        if (!res.ok) throw new Error("Failed to fetch custom transitions");
        const json = await res.json();
        setOwnPresets(json.own ?? []);
        setPublishedPresets(json.published ?? []);
      } catch {
        setError("Could not load custom transitions.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPresets();
  }, []);

  const handleClick = async (preset: CustomPreset) => {
    const key = `custom_transition_${preset.id}`;
    await registerCustomTransition(key, {
      key,
      label: preset.data.label || preset.name,
      fragment: preset.data.fragment,
    } as any);

    await engine.addClip({
      type: "Transition",
      name: preset.data.label || preset.name,
      transitionEffect: {
        id: key,
        key: key,
        name: preset.data.label || preset.name,
      },
      duration: TRANSITION_DURATION_DEFAULT,
      metadata: {
        fragment: preset.data.fragment,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading custom transitions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-destructive">{error}</div>
    );
  }

  if (ownPresets.length === 0 && publishedPresets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <span className="text-xs">No custom transitions yet.</span>
        <span className="text-[10px]">Create one from the Gallery to see it here.</span>
      </div>
    );
  }

  return (
    <>
      {ownPresets.map((preset) => (
        <TransitionCard
          key={preset.id}
          effectKey={preset.id}
          label={preset.data.label || preset.name}
          previewStatic=""
          previewDynamic=""
          onClick={() => handleClick(preset)}
        />
      ))}
      {publishedPresets.map((preset) => (
        <TransitionCard
          key={preset.id}
          effectKey={preset.id}
          label={preset.data.label || preset.name}
          previewStatic=""
          previewDynamic=""
          onClick={() => handleClick(preset)}
          badge="Public"
        />
      ))}
    </>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

const PanelTransition = () => {
  return (
    <div className="p-4 h-full">
      <Tabs defaultValue="default" className="w-full h-full">
        <TabsList className="w-full">
          <TabsTrigger value="default" className="flex-1">
            Default
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            Custom
          </TabsTrigger>
        </TabsList>

        {[
          { value: "default", Component: TransitionDefault },
          { value: "custom", Component: TransitionCustom },
        ].map(({ value, Component }) => (
          <TabsContent key={value} value={value} className="h-full">
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className={gridClasses}>
                <Component />
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PanelTransition;
