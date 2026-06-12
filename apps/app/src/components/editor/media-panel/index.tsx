"use client";

import { cn } from "@/lib/utils";
import { TabBar } from "./tabbar";
import { tabs, useMediaPanelStore, type Tab } from "./store";
import { Separator } from "@/components/ui/separator";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";
import { IconX } from "@tabler/icons-react";

const viewMap: Record<Tab, React.ReactNode> = {
  assets: <PanelAssets showHeader={false} />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab, isOpen, setIsOpen, showLabels } = useMediaPanelStore();

  return (
    <div
      className={cn("h-full bg-card rounded-sm relative shrink-0", showLabels ? "w-16" : "w-11")}
    >
      <TabBar />
      {isOpen && (
        <div className="absolute left-full top-0 bottom-0 w-[360px] bg-card border-r border-t border-b shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="h-12 items-center flex justify-between px-4 shrink-0">
            <span className="text-sm font-medium">{tabs[activeTab].label}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <IconX className="size-4" />
            </button>
          </div>
          <Separator />
          <div className="flex-1 overflow-auto">{viewMap[activeTab]}</div>
        </div>
      )}
    </div>
  );
}
