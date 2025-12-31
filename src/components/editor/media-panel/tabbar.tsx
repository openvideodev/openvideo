'use client';

import { cn } from '@/lib/utils';
import { type Tab, tabs, useMediaPanelStore } from './store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEffect, useRef, useState } from 'react';

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const checkScrollPosition = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowTopFade(scrollTop > 0);
    setShowBottomFade(scrollTop < scrollHeight - clientHeight - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    checkScrollPosition();
    element.addEventListener('scroll', checkScrollPosition);

    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex items-center justify-center py-1.5 px-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          const isActive = activeTab === tabKey;
          return (
            <div
              className={cn(
                'flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              )}
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
            >
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <tab.icon className="size-5" />
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
  );
}
