<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { useStudioStore } from '~/composables/useStudioStore';
import { Text, Log } from 'openvideo';

const { state: studioState } = useStudioStore();

const TEXT_PRESETS = [
  {
    name: 'Heading',
    description: 'Heading',
    style: {
      fontSize: 80,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
    },
  },
  {
    name: 'Body text',
    description: 'Body text',
    style: {
      fontSize: 40,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fill: '#ffffff',
    },
  },
  {
    name: 'Modern Bold',
    description: 'MODERN',
    style: {
      fontSize: 60,
      fontFamily: 'Montserrat',
      fontWeight: '900',
      fill: '#ffffff',
      stroke: { color: '#000000', width: 2, join: 'round' },
    },
  },
  {
    name: 'Elegant Serif',
    description: 'Serif Style',
    style: {
      fontSize: 60,
      fontFamily: 'Playfair Display',
      fontWeight: 'normal',
      fontStyle: 'italic',
      fill: '#ffffff',
    },
  },
  {
    name: 'Neon Glow',
    description: 'NEON',
    style: {
      fontSize: 60,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#00ffff',
      dropShadow: {
        color: '#00ffff',
        alpha: 0.8,
        blur: 10,
        angle: 0,
        distance: 0,
      },
    },
  },
  {
    name: 'Handwritten',
    description: 'Script',
    style: {
      fontSize: 70,
      fontFamily: 'Dancing Script',
      fontWeight: 'normal',
      fill: '#ffffff',
    },
  },
];

const handleAddText = async (preset?: (typeof TEXT_PRESETS)[0]) => {
  const studio = studioState.value.studio;
  if (!studio) return;

  try {
    const textClip = new Text(preset ? preset.description : 'Add Text pro', {
      fontSize: preset?.style.fontSize || 124,
      fontFamily: preset?.style.fontFamily || 'Arial',
      align: 'center',
      fontWeight: preset?.style.fontWeight || 'bold',
      fontStyle: (preset?.style as any)?.fontStyle || 'normal',
      fill: preset?.style.fill || '#ffffff',
      stroke: (preset?.style as any)?.stroke || undefined,
      dropShadow: (preset?.style as any)?.dropShadow || undefined,
      wordWrap: true,
      wordWrapWidth: 800,
      fontUrl: (preset?.style as any)?.fontUrl,
    });
    
    textClip.name = preset ? preset.name : 'Text';
    await textClip.ready;
    textClip.display.from = 0;
    textClip.duration = 5e6;
    textClip.display.to = 5e6;
    
    await studio.addClip(textClip);
    await studio.centerClip(textClip);
    
  } catch (error) {
    Log.error('Failed to add text:', error);
  }
};
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="p-4">
      <Button @click="() => handleAddText()" class="w-full h-9">
        Add Text
      </Button>
    </div>
    <div class="flex-1 overflow-y-auto px-4">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 pb-4">
        <button
          v-for="(preset, index) in TEXT_PRESETS"
          :key="index"
          @click="handleAddText(preset)"
          class="aspect-square bg-secondary/50 rounded-lg flex items-center justify-center p-4 hover:bg-secondary transition-colors group relative overflow-hidden border border-border"
        >
          <span
            :style="{
              fontFamily: preset.style.fontFamily,
              fontSize: '12px',
              fontWeight: preset.style.fontWeight,
              color: preset.style.fill,
              textAlign: 'center',
            }"
            class="line-clamp-2"
          >
            {{ preset.description }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
