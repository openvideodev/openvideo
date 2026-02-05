<script setup lang="ts">
import { useMediaPanelStore, type Tab } from '~/composables/useMediaPanelStore';
import { useStudioStore } from '~/composables/useStudioStore';
import TabBar from './TabBar.vue'; // Relative import
import { Separator } from '@/components/ui/separator';
import PanelUploads from './PanelUploads.vue';
import PanelImages from './PanelImages.vue';
import PanelVideos from './PanelVideos.vue';
import PanelMusic from './PanelMusic.vue';
import PanelVoiceovers from './PanelVoiceovers.vue';
import PanelSFX from './PanelSFX.vue';
import PanelText from './PanelText.vue';
import PanelCaptions from './PanelCaptions.vue';
import PanelTransitions from './PanelTransitions.vue';
import PanelEffects from './PanelEffects.vue';
import PanelElements from './PanelElements.vue';
// import { PropertiesPanel } from '../properties-panel'; // Check how to import this
import PropertiesPanel from '../properties-panel/PropertiesPanel.vue';

const { state: mediaState, setShowProperties: setMediaShowProperties } = useMediaPanelStore();
const { state: studioState, setSelectedClips: setStudioSelectedClips } = useStudioStore();

// Watch studio changes to attach listeners
const studio = computed(() => studioState.value.studio);
const selectedClips = ref<any[]>([]); // Typed as any[] for now matching React's usage or IClip[]

const viewMap: Record<Tab, any> = {
  uploads: PanelUploads,
  images: PanelImages,
  videos: PanelVideos,
  music: PanelMusic,
  voiceovers: PanelVoiceovers,
  sfx: PanelSFX,
  text: PanelText,
  captions: PanelCaptions,
  transitions: PanelTransitions,
  effects: PanelEffects,
  elements: PanelElements,
};

const handleSelection = (data: any) => {
  selectedClips.value = data.selected;
  setStudioSelectedClips(data.selected);
  setMediaShowProperties(true);
};

const handleClear = () => {
  selectedClips.value = [];
  setStudioSelectedClips([]); // Should we clear it in store too? React does set properties show false
  setMediaShowProperties(false);
};

// We need to watch for studio instance changes to attach listeners
watch(studio, (newStudio, oldStudio) => {
  if (oldStudio) {
    oldStudio.off('selection:created', handleSelection);
    oldStudio.off('selection:updated', handleSelection);
    oldStudio.off('selection:cleared', handleClear);
  }

  if (newStudio) {
    newStudio.on('selection:created', handleSelection);
    newStudio.on('selection:updated', handleSelection);
    newStudio.on('selection:cleared', handleClear);
  }
}, { immediate: true });

onUnmounted(() => {
  if (studio.value) {
    studio.value.off('selection:created', handleSelection);
    studio.value.off('selection:updated', handleSelection);
    studio.value.off('selection:cleared', handleClear);
  }
});

// If active tab changes, hide properties
watch(() => mediaState.value.activeTab, (newTab) => {
  if (newTab) {
    setMediaShowProperties(false);
  }
});

const activeComponent = computed(() => {
  return viewMap[mediaState.value.activeTab];
});
</script>

<template>
  <div class="h-full flex flex-col bg-card rounded-sm overflow-hidden w-full">
    <div class="flex-none">
      <TabBar />
    </div>
    <Separator orientation="horizontal" />
    <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
      <PropertiesPanel
        v-if="selectedClips.length > 0 && mediaState.showProperties"
        :selected-clips="selectedClips"
      />
      <component :is="activeComponent" v-else />
    </div>
  </div>
</template>
