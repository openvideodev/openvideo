"use client";

import { TabBar } from "./tabbar";
import { tabs, useMediaPanelStore, type Tab } from "./store";
import { Separator } from "@/components/ui/separator";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";

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

  return (
    <div className="h-full flex flex-row bg-card rounded-sm overflow-hidden w-full">
      <div className="flex-none">
        <TabBar />
      </div>
      <Separator orientation="vertical" />
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <div className="h-12 items-center flex px-4">
          <span className="text-sm font-medium">{tabs[activeTab].label}</span>
        </div>
        <Separator />
        <div className="flex-1 overflow-auto">{viewMap[activeTab]}</div>
      </div>
    </div>
  );
}
