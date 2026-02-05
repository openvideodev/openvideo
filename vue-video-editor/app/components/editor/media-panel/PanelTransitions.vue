<script setup lang="ts">
import { ref } from 'vue';
import { GL_TRANSITION_OPTIONS } from 'openvideo';
import { useStudioStore } from '~/composables/useStudioStore';

const { state: studioState } = useStudioStore();
const TRANSITION_DURATION_DEFAULT = 2_000_000;
const hovered = ref<Record<string, boolean>>({});

const setHovered = (key: string, value: boolean) => {
  hovered.value[key] = value;
};

const applyTransition = (effectKey: string) => {
  const studio = studioState.value.studio;
  if (!studio) return;
  studio.addTransition(effectKey, TRANSITION_DURATION_DEFAULT);
};
</script>

<template>
  <div class="py-4 h-full flex flex-col">
    <div class="flex-1 px-4 overflow-y-auto min-h-0">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 justify-items-center">
        <div
          v-for="effect in GL_TRANSITION_OPTIONS"
          :key="effect.key"
          class="flex w-full items-center gap-2 flex-col group cursor-pointer"
          @mouseenter="setHovered(effect.key, true)"
          @mouseleave="setHovered(effect.key, false)"
          @click="applyTransition(effect.key)"
        >
          <div class="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
            <img
              :src="effect.previewStatic"
              loading="lazy"
              class="absolute inset-0 w-full h-full object-cover rounded-sm transition-opacity duration-150"
              :class="hovered[effect.key] ? 'opacity-0' : 'opacity-100'"
            />

            <img
              v-if="hovered[effect.key]"
              :src="effect.previewDynamic"
              class="absolute inset-0 w-full h-full object-cover rounded-sm transition-opacity duration-150"
              :class="hovered[effect.key] ? 'opacity-100' : 'opacity-0'"
            />
            <div class="absolute bottom-0 left-0 w-full p-2 bg-linear-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
              {{ effect.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
