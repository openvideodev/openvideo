import * as React from 'react';
import { IClip } from '@designcombo/video';
import { IconVolume, IconGauge, IconMusic } from '@tabler/icons-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Slider } from '@/components/ui/slider';
import { GL_TRANSITION_OPTIONS, Transition } from '@designcombo/video';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import { Loader2 } from 'lucide-react';
interface TransitionPropertiesProps {
  clip: IClip;
}

export function TransitionProperties({ clip }: TransitionPropertiesProps) {
  const transitionClip = clip as any;
  const { studio, selectedClips } = useStudioStore();
  const TRANSITION_DURATION_DEFAULT = 2_000_000;

  const [loaded, setLoaded] = React.useState<
    Record<string, { static: boolean; dynamic: boolean }>
  >({});

  const markLoaded = (key: string, type: 'static' | 'dynamic') => {
    setLoaded((prev) => ({
      ...prev,
      [key]: {
        static: type === 'static' ? true : (prev[key]?.static ?? false),
        dynamic: type === 'dynamic' ? true : (prev[key]?.dynamic ?? false),
      },
    }));
  };

  const handleUpdate = (updates: any) => {
    // audioClip.update(updates);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Volume Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Duration
        </label>
        <div className="flex items-center gap-4">
          <IconVolume className="size-4 text-muted-foreground" />
          <Slider
            value={[50]}
            onValueChange={(v) => handleUpdate({ volume: v[0] / 100 })}
            max={100}
            step={1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <InputGroupInput
              type="number"
              value={50}
              onChange={(e) =>
                handleUpdate({ volume: (parseInt(e.target.value) || 0) / 100 })
              }
              className="text-sm p-0 text-center"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">s</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      <ScrollArea className="h-full">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 justify-items-center">
          {GL_TRANSITION_OPTIONS.map((effect) => {
            const isReady =
              loaded[effect.key]?.static && loaded[effect.key]?.dynamic;

            return (
              <div
                key={effect.key}
                className="flex w-full items-center gap-2 flex-col group cursor-pointer"
                onClick={() => {
                  if (!studio) return;

                  studio.addTransition(
                    effect.key,
                    TRANSITION_DURATION_DEFAULT,
                    transitionClip.fromClipId,
                    transitionClip.toClipId
                  );
                }}
              >
                <div className="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
                  {!isReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                  )}

                  <img
                    src={effect.previewStatic}
                    onLoad={() => markLoaded(effect.key, 'static')}
                    loading="lazy"
                    className="
                      absolute inset-0 w-full h-full object-cover rounded-sm
                      transition-opacity duration-150
                      opacity-100 group-hover:opacity-0
                    "
                  />

                  <img
                    src={effect.previewDynamic}
                    onLoad={() => markLoaded(effect.key, 'dynamic')}
                    loading="lazy"
                    className="
                      absolute inset-0 w-full h-full object-cover rounded-sm
                      transition-opacity duration-150
                      opacity-0 group-hover:opacity-100
                    "
                  />
                  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
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
}
