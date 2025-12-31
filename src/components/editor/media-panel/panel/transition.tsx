import { useState } from 'react';
import { GL_TRANSITION_OPTIONS, TransitionClip } from '@designcombo/video';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import { Loader2 } from 'lucide-react';

const PanelTransition = () => {
  const { studio, selectedClips } = useStudioStore();
  const TRANSITION_DURATION_DEFAULT = 2_000_000;

  const [loaded, setLoaded] = useState<
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

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 justify-items-center p-4">
          {GL_TRANSITION_OPTIONS.map((effect) => {
            const isReady =
              loaded[effect.key]?.static && loaded[effect.key]?.dynamic;

            return (
              <div
                key={effect.key}
                className="flex w-full items-center gap-2 flex-col group cursor-pointer"
                onClick={() => {
                  if (!studio) return;

                  studio.addTransition(effect.key, TRANSITION_DURATION_DEFAULT);

                  // const clip = selectedClips[0];
                  // if (clip instanceof TransitionClip) {
                  //   const fromClipId = clip.fromClipId;
                  //   const toClipId = clip.toClipId;
                  //   studio.addTransition(
                  //     effect.key,
                  //     TRANSITION_DURATION_DEFAULT,
                  //     fromClipId,
                  //     toClipId
                  //   );
                  // } else {
                  //   alert('Please select a transition clip');
                  // }
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
};

export default PanelTransition;
