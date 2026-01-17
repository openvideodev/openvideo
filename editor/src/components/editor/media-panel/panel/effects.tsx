import React, { useState } from 'react';
import { Effect, GL_EFFECT_OPTIONS } from '@designcombo/video';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';

const PanelEffect = () => {
  const { studio } = useStudioStore();
  const EFFECT_DURATION_DEFAULT = 5000000;

  const [hovered, setHovered] = useState<Record<string, boolean>>({});
  return (
    <div className="py-4 h-full">
      <ScrollArea className="h-full px-4">
        <div
          className="
        grid
        grid-cols-[repeat(auto-fill,minmax(80px,1fr))]
        gap-4
        justify-items-center
      "
        >
          {GL_EFFECT_OPTIONS.map((effect) => {
            const isHovered = hovered[effect.key];

            return (
              <div
                key={effect.key}
                className="flex w-full items-center gap-2 flex-col group cursor-pointer"
                onMouseEnter={() =>
                  setHovered((prev) => ({ ...prev, [effect.key]: true }))
                }
                onMouseLeave={() =>
                  setHovered((prev) => ({ ...prev, [effect.key]: false }))
                }
                onClick={() => {
                  if (!studio) return;
                  const clip = new Effect(effect.key);
                  clip.duration = EFFECT_DURATION_DEFAULT;
                  studio.addClip(clip);
                }}
              >
                <div className="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
                  <img
                    src={effect.previewStatic}
                    loading="lazy"
                    className="
                      absolute inset-0 w-full h-full object-cover rounded-sm
                      transition-opacity duration-150
                      opacity-100 group-hover:opacity-0
                    "
                  />

                  {isHovered && (
                    <img
                      src={effect.previewDynamic}
                      className="
                        absolute inset-0 w-full h-full object-cover rounded-sm
                        transition-opacity duration-150
                        opacity-0 group-hover:opacity-100
                      "
                    />
                  )}
                  <div className="absolute bottom-0 left-0 w-full p-2 bg-linear-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
                    {effect.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PanelEffect;
