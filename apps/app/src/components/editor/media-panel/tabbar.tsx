"use client";

import { cn } from "@/lib/utils";
import { type Tab, tabs, useMediaPanelStore } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();

  return (
    <div className="relative flex items-center py-2 px-2">
      <div className="overflow-x-auto scrollbar-hidden w-full">
        <div className="flex items-center gap-2 w-fit mx-auto px-4">
          {(Object.keys(tabs) as Tab[]).map((tabKey) => {
            const tab = tabs[tabKey];
            const isActive = activeTab === tabKey;
            return (
              <div
                className={cn(
                  "flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveTab(tabKey)}
                key={tabKey}
              >
                <Tooltip delayDuration={10}>
                  <TooltipTrigger asChild>
                    <tab.icon className="size-4.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center" sideOffset={8}>
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
