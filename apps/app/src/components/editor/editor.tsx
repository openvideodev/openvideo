"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import { cn } from "@/lib/utils";
import { useMediaPanelStore } from "@/components/editor/media-panel/store";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Assistant from "./assistant/assistant";
import { core } from "@/lib/project";
import { IProject } from "@openvideo/core";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/project-store";
import { data } from "./data";
import { PropertiesPanel } from "./properties-panel";

export default function Editor({
  initialDesign,
}: {
  isDataLoading?: boolean;
  initialDesign?: IProject;
}) {
  const params = useParams();
  const projectId = params?.projectId as string;

  const setProjectId = useProjectStore((state) => state.setProjectId);
  const setSpaceId = useProjectStore((state) => state.setSpaceId);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const resetProject = useProjectStore((state) => state.resetProject);

  const {
    toolsPanel,
    copilotPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setCopilotPanel,
    setMainContent,
    setTimeline,
    editorMode,
  } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      core.project.import(data);
    }, 1000);
  }, []);

  // tRPC query for project data
  const { data: projectData } = trpc.space.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  // Reset store + canvas engine on every route entry / project switch
  useEffect(() => {
    resetProject();
    core.project.new();
  }, [projectId]); // intentionally only depends on projectId — runs on mount and when switching projects

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  useEffect(() => {
    if (projectData) {
      setSpaceId(projectData.id);
      if (projectData.name) {
        setProjectName(projectData.name);
      }
    }
  }, [projectData, setSpaceId, setProjectName]);

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

  // Clear loading screen for non-editor modes (CanvasPanel doesn't mount, onReady never fires)
  useEffect(() => {
    if (editorMode !== "editor") {
      setIsReady(true);
    }
  }, [editorMode]);

  const { showLabels } = useMediaPanelStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-100">
          <Loading />
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
          {/* Top Panel: Sidebar (Tab Bar) + Canvas Preview + Properties Panel */}
          <ResizablePanel
            defaultSize={100 - timeline}
            minSize={30}
            className="min-h-0 overflow-visible!"
          >
            <div className="h-full w-full flex flex-row gap-0 overflow-visible!">
              {/* Left Column: Fixed Tab Bar / Media panel overlay */}
              <MediaPanel />

              <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
                {/* Middle Column: Preview Canvas */}
                <ResizablePanel
                  defaultSize={100 - copilotPanel}
                  minSize={40}
                  className="min-w-0 min-h-0"
                >
                  <CanvasPanel
                    onReady={() => {
                      setIsReady(true);
                    }}
                  />
                </ResizablePanel>

                <ResizableHandle className="bg-border/90" />

                <ResizablePanel
                  defaultSize={copilotPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={setCopilotPanel}
                  className="max-w-4xl min-w-[260px] relative overflow-visible! bg-card min-w-0"
                >
                  <PropertiesPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border/90" />

          {/* Bottom Panel: Timeline (Full width) */}
          <ResizablePanel
            defaultSize={timeline}
            minSize={15}
            maxSize={70}
            onResize={setTimeline}
            className="min-h-0"
          >
            <Timeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating Controls like Caption / Animation pickers */}
      <FloatingControl />

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
