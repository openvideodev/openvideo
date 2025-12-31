'use client';
import { useEffect, useState } from 'react';
import { MediaPanel } from '@/components/editor/media-panel';
import { PreviewPanel } from '@/components/editor/preview-panel';
import { Timeline } from '@/components/editor/timeline';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { usePanelStore } from '@/stores/panel-store';
import { Assistant } from '@/components/assistant';
import Header from '@/components/editor/header';
import { Loading } from '@/components/editor/loading';
import { ChatPanel } from '@/components/editor/media-panel/chat-panel';
import {
  useMediaPanelStore,
  type Tab,
} from '@/components/editor/media-panel/store';
import { useStudioStore } from '@/stores/studio-store';

export default function Editor() {
  const {
    toolsPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setMainContent,
    setTimeline,
    propertiesPanel,
    setPropertiesPanel,
  } = usePanelStore();

  const { activeTab, showProperties, setShowProperties } = useMediaPanelStore();
  const { selectedClips } = useStudioStore();

  const [isReady, setIsReady] = useState(false);

  // When clips are selected, show properties panel.
  // This is handled here instead of MediaPanel to avoid circular dependency/remount issues
  // where switching to chat layout (hiding properties) causes MediaPanel remount
  // which re-triggers the effect and shows properties again.
  useEffect(() => {
    if (selectedClips.length > 0) {
      setShowProperties(true);
    } else {
      setShowProperties(false);
    }
  }, [selectedClips.length, setShowProperties]);

  // Tabs that should show the chat panel
  const tabsWithChat: Tab[] = ['visuals', 'music', 'sfx', 'voiceovers'];
  const shouldShowChat = tabsWithChat.includes(activeTab) && !showProperties;

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header />
      <div className="flex-1 min-h-0 min-w-0 px-3">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full gap-1"
        >
          {/* Left Column: Media Panel */}
          <ResizablePanel
            defaultSize={toolsPanel}
            minSize={15}
            maxSize={40}
            onResize={setToolsPanel}
            className="min-w-0 rounded-sm"
          >
            {shouldShowChat ? (
              <ResizablePanelGroup direction="vertical" className="gap-1">
                <ResizablePanel defaultSize={75} minSize={30}>
                  <MediaPanel />
                </ResizablePanel>
                <ResizableHandle className="h-[1px] bg-white/5 hover:bg-white/10 transition-colors" />
                <ResizablePanel defaultSize={25} minSize={20}>
                  <ChatPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <MediaPanel />
            )}
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={100 - toolsPanel - propertiesPanel}
            minSize={40}
            className="min-w-0 min-h-0"
          >
            <ResizablePanelGroup
              direction="vertical"
              className="h-full w-full gap-1"
            >
              {/* Preview Panel */}
              <ResizablePanel
                defaultSize={mainContent}
                minSize={30}
                maxSize={85}
                onResize={setMainContent}
                className="min-h-0"
              >
                <PreviewPanel onReady={() => setIsReady(true)} />
              </ResizablePanel>

              <ResizableHandle />

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

          <ResizableHandle />

          {/* Right Column: Properties Panel */}
          <ResizablePanel
            defaultSize={propertiesPanel}
            minSize={15}
            maxSize={40}
            onResize={setPropertiesPanel}
            className="min-w-0"
          >
            <Assistant />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
