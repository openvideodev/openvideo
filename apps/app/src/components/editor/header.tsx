"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/project-store";
import { Log } from "@openvideo/engine-pixi";
import { ExportModal } from "./export-modal";
import Link from "next/link";
import {
  IconKeyboard,
  IconChevronLeft,
  IconPencil,
  IconRobot,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDownload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { ShortcutsModal } from "./shortcuts-modal";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AutosizeInput from "../ui/autosize-input";
import { authClient } from "@/lib/auth-client";
import { core, projectStore } from "@/lib/project";
import { useStore } from "zustand";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePanelStore } from "@/stores/panel-store";

export default function Header() {
  const { aspectRatio, setCanvasSize } = useProjectStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: session } = authClient.useSession();
  const { projectName, setProjectName } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(projectName || "Untitled video");
  const { editorMode, setEditorMode } = usePanelStore();

  // Sync title with store when project name changes externally (like on initial load)
  useEffect(() => {
    if (projectName && projectName !== title) {
      setTitle(projectName);
    }
  }, [projectName]);

  const handleApplyCustomSize = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      setCanvasSize({ width: w, height: h }, "Custom");
    } else {
      toast.error("Invalid dimensions");
    }
  };

  const handleGetStarted = (route: string) => {
    router.push(route);
  };

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  // Track undo/redo availability from Core store history
  const canUndo = useStore(projectStore, (s) => s.history.length > 0);
  const canRedo = useStore(projectStore, (s) => s.future.length > 0);

  // NOTE: canUndo/canRedo state now sourced from core.store

  const handleExportJSON = () => {
    try {
      const json = core.project.export();
      if (Object.keys(json.clips).length === 0) {
        alert("No clips to export");
        return;
      }

      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const aEl = document.createElement("a");
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `${projectName || "project"}-${Date.now()}.json`;
      aEl.click();

      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error("Export to JSON error:", error);
      alert("Failed to export to JSON: " + (error as Error).message);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);
        core.project.import(json);
        toast.success("Project imported successfully");
      } catch (error) {
        Log.error("Load from JSON error:", error);
        alert("Failed to load from JSON: " + (error as Error).message);
      } finally {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <header className="flex h-12 w-full shrink-0 items-center px-4 bg-card z-10 border-b">
      {/* Left: Project Navigation */}
      <div className="flex items-center gap-4 w-[280px]">
        <button
          onClick={() => router.push("/spaces")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Projects</span>
        </button>

        <div className="w-px h-4 bg-border" />

        <AutosizeInput
          name="title"
          value={title}
          onChange={handleTitleChange}
          width={140}
          inputClassName="border-none bg-transparent px-0 py-1 text-sm font-semibold text-foreground focus:outline-none"
        />
        <Button onClick={() => console.log(core.project.export())}>Debug</Button>
      </div>

      {/* Center: Mode Switcher */}
      <div className="flex-1 flex justify-center">
        <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "editor" | "agent")}>
          <TabsList className="h-8 bg-muted/50 border-0">
            <TabsTrigger
              value="editor"
              className="text-xs gap-1.5 px-3 h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <IconPencil className="h-3.5 w-3.5" />
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="text-xs gap-1.5 px-3 h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <IconRobot className="h-3.5 w-3.5" />
              Agent
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-3 w-[280px]">
        {/* History Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => core.undo()}
            disabled={!canUndo}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-30"
          >
            <IconArrowBackUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => core.redo()}
            disabled={!canRedo}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-30"
          >
            <IconArrowForwardUp className="h-4 w-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Help & Export */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <IconKeyboard className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-md hover:bg-foreground/90 transition-colors"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Export
          </button>
        </div>

        <ExportModal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} />
        <ShortcutsModal open={isShortcutsModalOpen} onOpenChange={setIsShortcutsModalOpen} />
      </div>
    </header>
  );
}
