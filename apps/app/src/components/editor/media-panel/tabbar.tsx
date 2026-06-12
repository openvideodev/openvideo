"use client";

import { cn } from "@/lib/utils";
import { type Tab, tabs, useMediaPanelStore } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconMenu, IconPlus, IconCopy, IconMenu2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project-store";
import { trpc } from "@/lib/trpc";
import { core } from "@/lib/project";
import { toast } from "sonner";
import { LogoIcons } from "@/components/shared/logos";

export function TabBar() {
  const { activeTab, setActiveTab, isOpen, setIsOpen, showLabels, setShowLabels } =
    useMediaPanelStore();
  const router = useRouter();
  const { projectName, canvasSize, fps } = useProjectStore();

  const createProjectMutation = trpc.space.create.useMutation();

  const handleCreateNewProject = () => {
    toast.promise(
      createProjectMutation.mutateAsync({
        name: "Untitled video",
        width: 1080,
        height: 1920,
        fps: 30,
        scene: { tracks: [], clips: {}, settings: {} },
      }),
      {
        loading: "Creating project...",
        success: (newProject) => {
          router.push(`/edit/${newProject.id}`);
          return "Project created successfully!";
        },
        error: "Failed to create project",
      },
    );
  };

  const handleDuplicateProject = () => {
    const sceneJson = core.project.export();
    toast.promise(
      createProjectMutation.mutateAsync({
        name: `${projectName} (Copy)`,
        width: canvasSize.width,
        height: canvasSize.height,
        fps: fps,
        scene: sceneJson,
      }),
      {
        loading: "Duplicating project...",
        success: (newProject) => {
          router.push(`/edit/${newProject.id}`);
          return "Project duplicated successfully!";
        },
        error: "Failed to duplicate project",
      },
    );
  };

  return (
    <div className="relative flex flex-col items-center py-2 px-1 gap-3 w-full h-full border border-r">
      {/* Brand Logo & Menu */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Stylized K Logo */}
        <div className="h-8 w-9 flex items-center justify-center font-bold text-xl text-white tracking-tighter select-none font-serif italic cursor-default">
          <LogoIcons.scenify className="size-6.5" />
        </div>

        {/* Hamburger Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-9 w-9 cursor-pointer rounded-sm text-muted-foreground hover:bg-white/5 hover:text-white transition-all duration-200 focus:outline-none">
              <IconMenu2 className="size-4.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-48 bg-card border border-white/10 z-50 shadow-xl"
          >
            <DropdownMenuItem
              onClick={handleCreateNewProject}
              className="cursor-pointer text-xs py-2 gap-2"
            >
              <span>New Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDuplicateProject}
              className="cursor-pointer text-xs py-2 gap-2"
            >
              <span>Duplicate Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowLabels(!showLabels)}
              className="cursor-pointer text-xs py-2 gap-2"
            >
              <span>{showLabels ? "Hide labels" : "Show labels"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs list */}
      <div className="flex flex-col items-center gap-1.5">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          const isActive = activeTab === tabKey && isOpen;
          return (
            <div
              className={cn(
                "flex flex-col items-center justify-center flex-none cursor-pointer rounded-sm transition-all duration-200 w-full",
                showLabels ? "py-1.5 px-0.5 gap-2" : "h-9",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
              onClick={() => {
                if (activeTab === tabKey && isOpen) {
                  setIsOpen(false);
                } else {
                  setActiveTab(tabKey);
                }
              }}
              key={tabKey}
            >
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <tab.icon className={showLabels ? "size-[18px]" : "size-4.5"} />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={8}>
                  {tab.label}
                </TooltipContent>
              </Tooltip>
              {showLabels && (
                <span className="text-[9px] font-normal leading-none mt-0.5 select-none text-center truncate max-w-full px-0.5">
                  {tab.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
