"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { IconEdit, IconTrash, IconPlus, IconKeyframe } from "@tabler/icons-react";
import { SectionHeader } from "./section-header";
import { Badge } from "@/components/ui/badge";

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
  onRemove,
  onEdit,
  onDelete,
}: AnimationsPropertyProps) {
  const hasAnimations = animations.length > 0;

  return (
    <Collapsible open={hasAnimations}>
      <SectionHeader
        title="Animations"
        hasContent={hasAnimations}
        onAdd={onAdd}
        onRemove={onRemove}
      />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs h-8 hover:bg-secondary/60"
            onClick={onAdd}
          >
            <IconPlus className="size-3.5" />
            Add Animation
          </Button>
          <div className="flex flex-col gap-2 mt-1">
            {animations.map((anim, index) => {
              const durationMs = (anim.options?.duration ?? 0) / 1e6;
              const durationText =
                durationMs < 1
                  ? `${Math.round(durationMs * 1000)}ms`
                  : `${Math.round(durationMs * 10) / 10}s`;

              return (
                <div
                  key={anim.options?.id ?? anim.id}
                  className="flex items-center gap-2 p-2.5 bg-secondary/20 hover:bg-secondary/30 rounded-lg group border border-transparent hover:border-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary shrink-0">
                    <IconKeyframe className="size-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize truncate">{anim.type}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                        {durationText}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate">#{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:bg-secondary"
                      onClick={() => onEdit(anim.id)}
                    >
                      <IconEdit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:bg-secondary text-muted-foreground hover:text-red-400"
                      onClick={() => onDelete(anim.id)}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
