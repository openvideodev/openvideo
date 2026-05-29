"use client";

import { RefreshCw, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  title?: string;
  isConnected?: boolean;
  onRefresh?: () => void;
  onNewChat?: () => void;
}

export function ChatHeader({
  title = "Director",
  isConnected = true,
  onRefresh,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm tracking-wide font-medium">{title}</span>
        <div className="flex items-center gap-1.5 ml-1">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500",
            )}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="sr-only">Refresh</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onNewChat}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span className="sr-only">New chat</span>
        </Button>
      </div>
    </div>
  );
}
