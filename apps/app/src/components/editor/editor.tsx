"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import PanelAssets from "@/components/editor/media-panel/panel/assets";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import Header from "@/components/editor/header";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Assistant from "./assistant/assistant";
import { core } from "@/lib/project";
import { IProject } from "@openvideo/core";
import { trpc } from "@/lib/trpc";
import type { schema } from "@openvideo/db";
import { useProjectStore } from "@/stores/project-store";
import { data } from "./data";

// Infer Space type from the Drizzle schema (matches what tRPC returns)
type Space = typeof schema.space.$inferSelect;

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
    isCopilotVisible,
    editorMode,
  } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);

  // File upload for Playground mode
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // useEffect(() => {
  //   setTimeout(() => {
  //     core.project.import(data);
  //   }, 1000);
  // }, []);

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

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-100">
          <Loading />
        </div>
      )}
      <Header />
      <div className="flex-1 min-h-0 min-w-0">
        {editorMode === "editor" && (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
            {/* Left Column: Media Panel */}
            <ResizablePanel
              defaultSize={toolsPanel}
              minSize={15}
              maxSize={40}
              onResize={setToolsPanel}
              className="max-w-7xl relative overflow-visible! bg-card min-w-[450px]"
            >
              <MediaPanel />
              <FloatingControl />
            </ResizablePanel>

            <ResizableHandle className="bg-border/90" />

            {/* Middle Column: Preview + Timeline */}
            <ResizablePanel
              defaultSize={isCopilotVisible ? 100 - copilotPanel - toolsPanel : 100 - toolsPanel}
              minSize={40}
              className="min-w-0 min-h-0"
            >
              <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
                {/* Canvas Panel */}
                <ResizablePanel
                  defaultSize={mainContent}
                  minSize={30}
                  maxSize={85}
                  onResize={setMainContent}
                  className="min-h-0"
                >
                  <CanvasPanel
                    onReady={() => {
                      setIsReady(true);
                    }}
                  />
                </ResizablePanel>

                <ResizableHandle className="bg-border/90" />

                {/* Timeline Panel */}
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
            </ResizablePanel>
            {isCopilotVisible && (
              <>
                <ResizableHandle className="bg-border/90" />
                {/* Right Column: Chat Copilot */}
                <ResizablePanel
                  defaultSize={copilotPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={setCopilotPanel}
                  className="max-w-4xl min-w-[360px] relative overflow-visible! bg-card min-w-0"
                >
                  <Assistant />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}

        {editorMode === "playground" && (
          <div className="h-full w-full relative bg-card">
            {/* Hidden file input for upload */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={(e) => {
                // Handle file upload
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  setIsUploading(true);
                  // Upload logic here
                  setTimeout(() => setIsUploading(false), 1000);
                }
              }}
            />
            {/* Full Space Assets View */}
            <div className="h-full w-full overflow-auto">
              <PanelAssets showGenerator={true} showHeader={true} />
            </div>
          </div>
        )}

        {editorMode === "agent" && (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
            {/* Left: Assets Only (no tabs) */}
            <ResizablePanel
              defaultSize={100 - copilotPanel}
              minSize={15}
              // maxSize={40}
              onResize={setToolsPanel}
              className="bg-card min-w-0"
            >
              {/* Assets list without tabs */}
              <div className="h-full overflow-auto">
                <PanelAssets />
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-border/90" />

            {/* Right: Assistant with fixed initial size (25% - same as Editor copilot default) */}
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={50}
              className="max-w-4xl min-w-[360px] min-w-0"
            >
              <Assistant />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
