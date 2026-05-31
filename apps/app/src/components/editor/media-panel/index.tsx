"use client";

import { TabBar } from "./tabbar";
import { useMediaPanelStore, type Tab } from "./store";
import { Separator } from "@/components/ui/separator";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";
import { PropertiesPanel } from "../properties-panel";
import { useEffect, useState } from "react";
import { useStudioStore } from "@/stores/studio-store";

const viewMap: Record<Tab, React.ReactNode> = {
  assets: <PanelAssets showHeader={false} />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();
  const { selectedClips } = useStudioStore();
  const [showProperties, setShowProperties] = useState(false);

  // Show properties panel when a clip is selected, unless we're on a specific tab that should stay visible
  useEffect(() => {
    if (selectedClips.length > 0) {
      setShowProperties(true);
    } else {
      setShowProperties(false);
    }
  }, [selectedClips]);

  useEffect(() => {
    if (activeTab) {
      setShowProperties(false);
    }
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-card rounded-sm overflow-hidden w-full">
      <div className="flex-none">
        <TabBar />
      </div>
      <Separator orientation="horizontal" />
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {selectedClips.length > 0 && showProperties ? (
          <PropertiesPanel selectedClips={selectedClips} />
        ) : (
          <>{viewMap[activeTab]}</>
        )}
      </div>
    </div>
  );
}
