'use client';

import { TabBar } from './tabbar';
import { useMediaPanelStore, type Tab } from './store';
import { Separator } from '@/components/ui/separator';
import { PanelVisuals } from './panel/visuals';
import PanelEffect from './panel/effects';
import PanelTransition from './panel/transition';
import PanelText from './panel/text';
import PanelCaptions from './panel/captions';
import PanelMusic from './panel/music';
import PanelVoiceovers from './panel/voiceovers';
import PanelSFX from './panel/sfx';
import PanelElements from './panel/elements';
import { PropertiesPanel } from '../properties-panel';
import { IClip } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studio-store';

const viewMap: Record<Tab, React.ReactNode> = {
  visuals: <PanelVisuals />,
  music: <PanelMusic />,
  voiceovers: <PanelVoiceovers />,
  sfx: <PanelSFX />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();
  const [selectedClips, setSelectedClips] = useState<IClip[]>([]);
  const { studio, setSelectedClips: setStudioSelectedClips } = useStudioStore();

  useEffect(() => {
    if (!studio) return;

    const handleSelection = (data: any) => {
      setSelectedClips(data.selected);
      setStudioSelectedClips(data.selected);
    };

    const handleClear = () => {
      setSelectedClips([]);
    };

    studio.on('selection:created', handleSelection);
    studio.on('selection:updated', handleSelection);
    studio.on('selection:cleared', handleClear);

    return () => {
      studio.off('selection:created', handleSelection);
      studio.off('selection:updated', handleSelection);
      studio.off('selection:cleared', handleClear);
    };
  }, [studio]);

  return (
    <div className="h-full flex flex-col bg-panel">
      <div className="flex-none">
        <TabBar />
      </div>
      <Separator orientation="horizontal" />
      <div className="flex-1 overflow-hidden" id="panel-content">
        {selectedClips.length > 0 ? (
          <PropertiesPanel selectedClips={selectedClips} />
        ) : (
          <div className="h-full overflow-y-auto">{viewMap[activeTab]}</div>
        )}
      </div>
    </div>
  );
}
