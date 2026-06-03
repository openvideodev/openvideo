"use client";

import {
  IconChevronLeft,
  IconPencil,
  IconRobot,
  IconPlayerPlay,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconKeyboard,
  IconDownload,
  IconSparkles,
  IconSearch,
  IconPlus,
  IconPaperclip,
  IconUpload,
  IconArrowUp,
  IconPhoto,
  IconLetterT,
  IconSubtitles,
  IconShape,
  IconFilter,
  IconTrash,
  IconCopy,
  IconZoomOut,
  IconZoomIn,
  IconScissors,
  IconRefresh,
} from "@tabler/icons-react";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "./ui/button";
import { HoverBorderGradient } from "./ui/hover-border-gradient";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "./ui/input-group";

// ==================== SUBCOMPONENTS ====================

function FakeHeader() {
  return (
    <header className="flex h-12 w-full shrink-0 items-center px-4 bg-card z-10 border-b">
      {/* Left: Project Navigation */}
      <div className="flex items-center gap-4 w-[280px]">
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <IconChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Projects</span>
        </button>

        <div className="w-px h-4 bg-border hidden sm:block" />

        <span className="text-sm font-semibold text-foreground hidden sm:inline">My Project</span>
      </div>

      {/* Center: Mode Switcher */}
      <div className="flex-1 flex justify-center min-w-0">
        <Tabs value="editor">
          <TabsList className="h-8 bg-muted/50 border-0 lg:opacity-100 opacity-0">
            <TabsTrigger
              value="editor"
              className="hidden lg:flex text-xs gap-1.5 px-3 h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <IconPencil className="h-3.5 w-3.5" />
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="hidden lg:flex text-xs gap-1.5 px-3 h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <IconRobot className="h-3.5 w-3.5" />
              Agent
            </TabsTrigger>
            <TabsTrigger
              value="playground"
              className="hidden lg:flex text-xs gap-1.5 px-3 h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <IconPlayerPlay className="h-3.5 w-3.5" />
              Playground
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 w-[280px]">
        {/* History Controls - hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-30">
            <IconArrowBackUp className="h-4 w-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-30">
            <IconArrowForwardUp className="h-4 w-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* Help & Export */}
        <div className="flex items-center gap-1">
          <button className="hidden sm:flex p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <IconKeyboard className="h-4 w-4" />
          </button>

          <button className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-foreground text-background text-xs font-medium rounded-md hover:bg-foreground/90 transition-colors">
            <IconDownload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function FakeAssetImage({ inUse = false, color }: { inUse?: boolean; color?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] rounded-md border overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-200 group",
        inUse
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/40 hover:border-border/60",
      )}
    >
      {inUse && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary text-[8px] text-primary-foreground rounded font-medium z-10 shadow-sm">
          In Use
        </div>
      )}
      {/* Fake image content with gradient */}
      <div
        className={cn(
          "h-full w-full relative",
          color || "bg-gradient-to-br from-muted to-muted/50",
        )}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
    </div>
  );
}

function FakeMediaPanel() {
  const tabs = [
    { icon: IconPhoto, label: "Assets", active: true },
    { icon: IconLetterT, label: "Text", active: false },
    { icon: IconSubtitles, label: "Captions", active: false },
    { icon: Icons.transition, label: "Transitions", active: false },
    { icon: IconSparkles, label: "Effects", active: false },
    { icon: IconShape, label: "Elements", active: false },
  ];

  return (
    <div className="w-72 hidden sm:flex border-r border-border/30 flex-col bg-card/20 shrink-0">
      {/* Tab Bar - matching real tabbar styling */}
      <div className="relative flex items-center py-2 px-2 border-b border-border/30">
        <div className="overflow-x-auto scrollbar-hidden w-full">
          <div className="flex items-center gap-2 w-fit mx-auto px-4">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                className={cn(
                  "flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200",
                  tab.active
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                )}
              >
                <tab.icon className="size-4.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 w-full px-4 py-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            placeholder="Search assets..."
            className="w-full h-9 pl-9 pr-3 text-[13px] bg-secondary/50 border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border focus:bg-background transition-all"
          />
        </div>

        {/* Filter Dropdown */}
        <Button
          variant="outline"
          className="h-9 w-9 p-0 shrink-0 bg-secondary/50 hover:bg-secondary border-border/60 text-foreground flex items-center justify-center rounded-lg transition-colors"
        >
          <IconFilter size={15} />
        </Button>
      </div>

      {/* Asset Grid - 2x2 layout matching screenshot */}
      <div className="p-3 flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-2 gap-2">
          <FakeAssetImage inUse color="bg-gradient-to-br from-stone-600/80 to-stone-700" />
          <FakeAssetImage color="bg-gradient-to-br from-amber-800/60 to-stone-700" />
          <FakeAssetImage color="bg-gradient-to-br from-emerald-800/50 to-stone-700" />
          <FakeAssetImage color="bg-gradient-to-br from-blue-800/50 to-stone-700" />
        </div>
      </div>

      {/* Bottom Prompt Input - matching asset generator expandable */}
      <div className={cn("shrink-0 bg-card p-3")}>
        <div className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2">
          <button className="flex flex-1 items-center gap-3 text-left">
            <IconSparkles className="size-4 shrink-0 text-primary" stroke={1.5} />
            <span className="text-sm text-muted-foreground">What you want to create</span>
          </button>
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <IconUpload className="size-4" stroke={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FakeTimelinePanel() {
  return (
    <div className="flex flex-col bg-card h-64">
      {/* Transport Controls Bar */}
      <div className="h-10 border-b border-border/30 grid grid-cols-3 items-center px-2 sm:px-3 bg-card/20 shrink-0">
        {/* Left: Track tools - hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors">
            <IconTrash className="size-4" />
          </button>
          <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors">
            <IconScissors className="size-4" />
          </button>
          <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors">
            <IconCopy className="size-4" />
          </button>
        </div>

        {/* Center: Playback controls - always centered */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 col-span-3 sm:col-span-1 pointer-events-auto">
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 5v14l-12 -7z" />
              <path d="M4 5l0 14" />
            </svg>
          </button>
          <button className="p-1.5 text-foreground hover:bg-muted/50 rounded transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
            </svg>
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5v14l12 -7z" />
              <path d="M20 5l0 14" />
            </svg>
          </button>
          <span className="text-xs text-muted-foreground font-mono ml-1 sm:ml-2 tabular-nums hidden xs:inline">
            00:06 | 00:10
          </span>
        </div>

        {/* Right: Zoom controls - hidden on small screens */}
        <div className="hidden sm:flex items-center justify-end gap-1 sm:gap-2">
          <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors">
            <IconZoomOut className="size-4" />
          </button>
          <div className="hidden md:block w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-muted-foreground/60 rounded-full" />
          </div>
          <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors">
            <IconZoomIn className="size-4" />
          </button>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div className="h-6 border-b border-border/30 flex items-end relative bg-card/10 shrink-0">
        <div className="w-4 border-r border-border/30 h-full" />
        <div className="flex-1 relative h-full flex items-end overflow-hidden pr-4">
          <div className="flex-1 relative h-full flex items-end overflow-hidden">
            {Array.from({ length: 11 }, (_, i) => (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${i * 16}%` }}
              >
                <span className="text-[9px] text-muted-foreground/60 tabular-nums mb-0.5">{`00:${String(i).padStart(2, "0")}`}</span>
                <div className="w-px h-2 bg-border/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Playhead line - full height across ruler and tracks */}
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white z-20">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-sm" />
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track label column */}
        <div className="w-4  border-border/30  shrink-0" />

        {/* Track content */}
        <div className="flex-1 relative p-2 space-y-2">
          {/* Video Track with clip */}
          <div className="h-14 relative bg-[#111111]">
            <div className="absolute left-[10%] right-[20%] h-full flex rounded-xs overflow-hidden bg-[#222222] border-input border-2"></div>
          </div>

          {/* Text Track */}
          <div className="h-8 relative bg-[#111111]">
            <div className="absolute left-[15%] right-[50%] h-full bg-[#222222] rounded-xs flex items-center px-3 border-input border-2"></div>
          </div>
          {/* Video Track with clip */}
          <div className="h-10 relative bg-[#111111]">
            <div className="absolute left-[0%] right-[20%] h-full flex rounded-xs overflow-hidden bg-[#222222] border-input border-2"></div>
          </div>
        </div>

        {/* Playhead line extension into tracks */}
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/80 z-10 pointer-events-none" />
      </div>
    </div>
  );
}

function FakeCanvasPanel() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-0 bg-[#111111]">
      <div className="relative h-full aspect-[9/16] max-w-md bg-black rounded-lg overflow-hidden shadow-2xl">
        <img
          src="/im1.webp"
          alt="Video preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export function FakeAssistantPanel() {
  return (
    <div className="w-72 hidden lg:flex border-l border-border/30 flex-col bg-card/20 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm tracking-wide font-medium">Director</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
              )}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span className="sr-only">New chat</span>
          </Button>
        </div>
      </div>

      {/* Chat - Skeleton/Placeholder Style */}
      <div className="flex-1 p-4 space-y-6 overflow-hidden">
        {/* User message bubble skeleton */}
        <div className="flex justify-end">
          <div className="bg-muted/40 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] space-y-2">
            <div className="h-2.5 w-40 bg-muted-foreground/20 rounded-full" />
            <div className="h-2.5 w-32 bg-muted-foreground/20 rounded-full" />
          </div>
        </div>

        {/* Assistant response skeleton */}
        <div className="space-y-2">
          <div className="h-2 w-48 bg-muted-foreground/15 rounded-full" />
          <div className="h-2 w-40 bg-muted-foreground/15 rounded-full" />
          <div className="h-2 w-24 bg-muted-foreground/15 rounded-full" />
        </div>

        {/* Planning indicator */}
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <svg
            className="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
          <span className="text-xs">Planning the next effect...</span>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 md:p-3 pt-0 space-y-4 shrink-0">
        <HoverBorderGradient containerClassName="rounded-sm w-full" className="w-full bg-card">
          <InputGroup
            className="rounded-sm border-none has-disabled:opacity-100"
            style={{ backgroundColor: "#141414" }}
          >
            <InputGroupTextarea
              placeholder="Ask me anything..."
              className="min-h-16 max-h-[200px] border-none focus-visible:ring-0"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="ghost" className="rounded-lg text-foreground">
                <IconPaperclip className="w-4 h-4" />
              </InputGroupButton>
              <InputGroupButton
                variant="default"
                className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
                size="icon-xs"
              >
                <IconArrowUp className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </HoverBorderGradient>
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT ====================

function FakeCenterColumn() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <FakeCanvasPanel />
      <FakeTimelinePanel />
    </div>
  );
}

export function FakeEditor() {
  return (
    <div className="h-full w-full bg-card flex flex-col text-sm overflow-hidden">
      <FakeHeader />

      <div className="flex-1 flex min-h-0">
        <FakeMediaPanel />
        <FakeCenterColumn />
        <FakeAssistantPanel />
      </div>
    </div>
  );
}
