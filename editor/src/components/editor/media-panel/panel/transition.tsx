import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTransitionOptions } from "@openvideo/engine-pixi";
import { Icons } from "@/components/shared/icons";
import { core } from "@/lib/project";
import Draggable from "@/components/shared/draggable";

const TRANSITION_DURATION_DEFAULT = 2_000_000;

const gridClasses = `
  grid
  grid-cols-[repeat(auto-fill,minmax(80px,1fr))]
  gap-4
  justify-items-center
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    transitionKey: effectKey,
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
          onClick={async () => {
            await core.clip.add({
              type: "Transition",
              name: effect.label,
              transitionKey: effect.key,
              duration: TRANSITION_DURATION_DEFAULT,
            });
          }}
        />
      ))}
    </>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

const PanelTransition = () => {
  return (
    <div className="p-4 h-full">
      <ScrollArea className="h-full">
        <div className={gridClasses}>
          <TransitionDefault />
        </div>
      </ScrollArea>
    </div>
  );
};

export default PanelTransition;
