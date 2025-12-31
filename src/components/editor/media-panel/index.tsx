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
import { useStudioStore } from '@/stores/studio-store';
import { PropertiesPanel } from '../properties-panel';

export function MediaPanel() {
  const { activeTab, showProperties } = useMediaPanelStore();
  const { selectedClips } = useStudioStore();

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

  return (
    <div className="h-full flex flex-col bg-panel">
      <div className="flex-none">
        <TabBar />
      </div>
      <Separator orientation="horizontal" />
      <div className="flex-1 overflow-hidden" id="panel-content">
        {selectedClips.length > 0 && showProperties ? (
          <PropertiesPanel />
        ) : (
          <div className="h-full overflow-y-auto">{viewMap[activeTab]}</div>
        )}
      </div>
    </div>
  );
}
