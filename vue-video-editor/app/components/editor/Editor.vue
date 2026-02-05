<script setup lang="ts">
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ref } from 'vue';
import Header from '@/components/editor/Header.vue';
import CanvasPanel from '@/components/editor/CanvasPanel.vue';
import MediaPanel from '@/components/editor/media-panel/MediaPanel.vue';

// State for panel sizes
const toolsPanelSize = ref(30);
const mainContentSize = ref(70);
const timelineSize = ref(25);
const isCopilotVisible = ref(false); // Default to hidden for now

// Placeholder for store actions
const setToolsPanel = (size: number) => {
  toolsPanelSize.value = size;
};
const setCopilotPanel = (size: number) => {
};
const setMainContent = (size: number) => {
  mainContentSize.value = size;
};
const setTimeline = (size: number) => {
  timelineSize.value = size;
};
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-background overflow-hidden space-y-1.5">
    <!-- Header -->
    <Header />

    <div class="flex-1 min-h-0 min-w-0 px-2 pb-2">
      <ResizablePanelGroup
        direction="horizontal"
        class="h-full w-full gap-0"
      >
        <!-- Left Column: Media Panel -->
        <ResizablePanel
          :default-size="toolsPanelSize"
          :min-size="15"
          :max-size="40"
          @resize="setToolsPanel"
          class="relative overflow-visible! bg-card min-w-0 border-r"
        >
          <MediaPanel />
        </ResizablePanel>

        <ResizableHandle class="bg-transparent w-1.5" />

        <!-- Middle Column: Preview + Timeline -->
        <ResizablePanel
          :default-size="isCopilotVisible ? 100 - toolsPanelSize : 100 - toolsPanelSize"
          :min-size="40"
          class="min-w-0 min-h-0"
        >
          <ResizablePanelGroup
            direction="vertical"
            class="h-full w-full gap-0"
          >
            <!-- Canvas Panel -->
            <ResizablePanel
              :default-size="mainContentSize"
              :min-size="30"
              :max-size="85"
              @resize="setMainContent"
              class="min-h-0 border-b"
            >
              <CanvasPanel />
            </ResizablePanel>

            <ResizableHandle class="bg-transparent !h-1.5" />

            <!-- Timeline Panel -->
            <ResizablePanel
              :default-size="timelineSize"
              :min-size="15"
              :max-size="70"
              @resize="setTimeline"
              class="min-h-0"
            >
              <div class="h-full w-full p-4">
                Timeline Panel
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </div>
</template>
