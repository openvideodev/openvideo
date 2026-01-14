'use client';
import { useState } from 'react';
import { MediaPanel } from '@/components/editor/media-panel';
import { PreviewPanel } from '@/components/editor/preview-panel';
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

  const [isReady, setIsReady] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header />
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Column: Media Panel */}
          <ResizablePanel
            defaultSize={toolsPanel}
            minSize={15}
            maxSize={40}
            onResize={setToolsPanel}
            className="max-w-96 rounded-sm relative overflow-visible!"
          >
            <MediaPanel />
            <FloatingControl />
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={100 - toolsPanel - propertiesPanel}
            minSize={40}
            className="min-w-0 min-h-0"
          >
            <ResizablePanelGroup direction="vertical" className="h-full w-full">
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
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
