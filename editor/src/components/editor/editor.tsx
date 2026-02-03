'use client';
// import * as Sentry from '@sentry/nextjs';
// import { usePostHog } from 'posthog-js/react';
import { useState, useEffect } from 'react';
import { MediaPanel } from '@/components/editor/media-panel';
import { CanvasPanel } from '@/components/editor/canvas-panel';
import { Timeline } from '@/components/editor/timeline';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { usePanelStore } from '@/stores/panel-store';
import Header from '@/components/editor/header';
import { Loading } from '@/components/editor/loading';
import FloatingControl from '@/components/editor/floating-controls/floating-control';
import { Compositor } from 'openvideo';
import { WebCodecsUnsupportedModal } from '@/components/editor/webcodecs-unsupported-modal';
import Assistant from './assistant/assistant';

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

  // const { studio } = useStudioStore();
  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);
  // const posthog = usePostHog();

  // // Sentry and PostHog tracking for Editor mount
  // useEffect(() => {
  //   Sentry.addBreadcrumb({
  //     category: 'editor',
  //     message: 'Editor component mounted',
  //     level: 'info',
  //   });
  //   posthog.capture('editor_viewed', { schemaId, projectId });
  // }, [posthog, schemaId, projectId]);

  // Check WebCodecs support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

  // useEffect(() => {
  //   if (!studio) return;
  //   if (design) {
  //     studio.loadFromJSON(design);
  //   }
  // }, [design]);

  // useEffect(() => {
  //   if (!studio || !schemaId || !projectId) return;

  //   const saveScene = debounce(async () => {
  //     try {
  //       const json = studio.exportToJSON();
  //       await fetch('/api/scenes', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           schemaId,
  //           projectId,
  //           sceneData: json,
  //         }),
  //       });
  //       console.log('Scene saved automatically');
  //     } catch (error) {
  //       console.error('Failed to auto-save scene:', error);
  //     }
  //   }, 1000); // Debounce for 1 second

  //   // Listen to changes that should trigger a save
  //   const eventsToListen = [
  //     'history:changed',
  //     'clip:added',
  //     'clip:removed',
  //     'clip:updated',
  //     'clip:moved',
  //     'track:added',
  //     'track:removed',
  //     'clips:removed',
  //     'clip:replaced',
  //   ];

  //   eventsToListen.forEach((event) => {
  //     studio.on(event, saveScene);
  //   });

  //   return () => {
  //     saveScene.cancel();
  //     eventsToListen.forEach((event) => {
  //       studio.off(event, saveScene);
  //     });
  //   };
  // }, [studio, schemaId, projectId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden space-y-1.5">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header />
      <div className="flex-1 min-h-0 min-w-0 px-2 pb-2">
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

          <ResizableHandle className="bg-transparent w-1.5" />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={
              isCopilotVisible
                ? 100 - copilotPanel - toolsPanel
                : 100 - toolsPanel
            }
            minSize={40}
            className="min-w-0 min-h-0"
          >
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

              <ResizableHandle className="bg-transparent !h-1.5" />

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
              <ResizableHandle className="bg-transparent w-1.5" />
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
