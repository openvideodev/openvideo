"use client";
import { useState, useEffect } from "react";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import { Timeline } from "@/components/editor/timeline";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import { useRef } from "react";
import Header from "@/components/editor/header";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "openvideo";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Assistant from "./assistant/assistant";
import { useParams, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { usePresence } from "@/hooks/use-presence";
import { CollaborativeCursors } from "@/components/editor/collaborative-cursors";
import { throttle } from "lodash";
import { useCallback, useMemo } from "react";

export default function Editor() {
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
  } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);

  const params = useParams();
  const projectId = (params.projectId as string) || "playground";

  const { data: session } = authClient.useSession();

  const [anonId] = useState(() => {
    if (typeof window === "undefined") return "anon-temp";
    const key = "ov-anon-id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = "anon-" + Math.random().toString(36).substring(7);
      sessionStorage.setItem(key, id);
    }
    return id;
  });

  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "session-temp";
    const key = "ov-session-id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).substring(7);
      sessionStorage.setItem(key, id);
    }
    return id;
  });

  const userId = session?.user?.id || anonId;
  const userName =
    session?.user?.name?.trim() || session?.user?.email || "Anonymous";
  const userAvatar = session?.user?.image || undefined;

  const { members, trackCursor } = usePresence({
    projectId,
    userId,
    sessionId,
    name: userName,
    avatar: userAvatar,
    enabled: true,
  });

  const throttledTrackCursor = useMemo(
    () => throttle(trackCursor, 50),
    [trackCursor],
  );

  const centralPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!centralPanelRef.current) return;

      const rect = centralPanelRef.current.getBoundingClientRect();

      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (x >= -0.05 && x <= 1.05 && y >= -0.05 && y <= 1.05) {
        throttledTrackCursor({ x, y });
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, [throttledTrackCursor]);

  // 🔹 Check WebCodecs support
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden relative">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header presenceMembers={members} userId={userId} sessionId={sessionId} />
      <div
        className={`flex-1 min-h-0 min-w-0 ${
          !session ? "" : ""
        }`}
      >
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full gap-0"
        >
          {/* Left Column: Media Panel */}
          <ResizablePanel
            defaultSize={toolsPanel}
            minSize={15}
            maxSize={40}
            onResize={setToolsPanel}
            className="max-w-7xl relative overflow-visible! bg-card min-w-0"
          >
            <MediaPanel />
            <FloatingControl />
          </ResizablePanel>

          <ResizableHandle className="bg-border/90" />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={
              isCopilotVisible
                ? 100 - copilotPanel - toolsPanel
                : 100 - toolsPanel
            }
            minSize={40}
            className="min-w-0 min-h-0 relative overflow-hidden flex flex-col"
          >
            <div
              ref={centralPanelRef}
              className="absolute inset-0 pointer-events-none"
            />
            {/* Collaborative Cursors Overlay - Absolute positioning will keep it on top */}
            <CollaborativeCursors
              members={members}
              currentSessionId={sessionId}
            />

            <ResizablePanelGroup
              direction="vertical"
              className="h-full w-full gap-0"
            >
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
                className="max-w-7xl relative overflow-visible! bg-card min-w-0"
              >
                {/* Chat copilot */}
                <Assistant />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
