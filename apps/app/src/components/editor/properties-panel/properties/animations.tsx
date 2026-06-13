"use client";

import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { TrashIcon } from "@phosphor-icons/react";

interface Animation {
  id: string;
  type: string;
  options?: {
    id?: string;
    duration?: number;
    [key: string]: any;
  };
}

interface AnimationsPropertyProps {
  animations: Animation[];
  onAdd: () => void;
  onRemove: () => void;
  onEdit: (animationId: string) => void;
  onDelete: (animationId: string) => void;
}

export function AnimationsProperty({
  animations,
  onAdd,
  onEdit,
  onDelete,
}: AnimationsPropertyProps) {
  const hasAnimations = animations.length > 0;

  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col gap-3.5 my-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/85">Animation</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAdd}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <IconPlus className="size-4" />
        </Button>
      </div>

      {/* Row containing animations list */}
      {hasAnimations && (
        <div className="flex flex-col gap-2">
          {animations.map((anim) => {
            const isOut = anim.type.toLowerCase().includes("out");
            const dirText = isOut ? "OUT" : "IN";
            // Clean anim name
            const animName =
              anim.type
                .replace(/fadeIn|fadeOut|scaleIn|scaleOut|slideIn|slideOut/gi, (m) => {
                  if (m.toLowerCase().startsWith("fade")) return "Fade";
                  if (m.toLowerCase().startsWith("scale")) return "Scale";
                  if (m.toLowerCase().startsWith("slide")) return "Slide";
                  return m;
                })
                .charAt(0)
                .toUpperCase() + anim.type.slice(1).replace(/in|out/gi, "");

            return (
              <div key={anim.id} className="flex items-center gap-2 w-full">
                {/* Dropdown pill */}
                <button
                  type="button"
                  onClick={() => onEdit(anim.id)}
                  className="flex-1 flex items-center justify-between px-3 h-8 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/40 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                      {dirText}
                    </span>
                    <span className="capitalize">{animName || anim.type}</span>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 text-muted-foreground shrink-0"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Settings / Edit Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(anim.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="2" y1="14" x2="6" y2="14" />
                    <line x1="10" y1="8" x2="14" y2="8" />
                    <line x1="18" y1="16" x2="22" y2="16" />
                  </svg>
                </Button>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(anim.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
