<script setup lang="ts">
import { useMediaPanelStore, tabs, type Tab } from '~/composables/useMediaPanelStore';
import { cn } from '~/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';

const { state, setActiveTab } = useMediaPanelStore();
const scrollRef = ref<HTMLDivElement | null>(null);
const showLeftFade = ref(false);
const showRightFade = ref(false);

const checkScrollPosition = () => {
  const element = scrollRef.value;
  if (!element) return;

  const { scrollLeft, scrollWidth, clientWidth } = element;
  showLeftFade.value = scrollLeft > 0;
  showRightFade.value = scrollLeft < scrollWidth - clientWidth - 1;
};

onMounted(() => {
  const element = scrollRef.value;
  if (!element) return;

  checkScrollPosition();
  element.addEventListener('scroll', checkScrollPosition);

  const resizeObserver = new ResizeObserver(checkScrollPosition);
  resizeObserver.observe(element);

  onUnmounted(() => {
    element.removeEventListener('scroll', checkScrollPosition);
    resizeObserver.disconnect();
  });
});

const tabKeys = Object.keys(tabs) as Tab[];
</script>

<template>
  <div class="relative flex items-center py-2 px-2 bg-primary/7">
    <div
      v-if="showLeftFade"
      class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none"
    />
    <div ref="scrollRef" class="overflow-x-auto scrollbar-hidden w-full">
      <div class="flex items-center gap-2 w-fit mx-auto px-4">
        <TooltipProvider v-for="tabKey in tabKeys" :key="tabKey">
          <Tooltip :delay-duration="10">
            <TooltipTrigger as-child>
              <div
                :class="cn(
                  'flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200',
                  state.activeTab === tabKey
                    ? 'bg-white/10 text-white'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                )"
                @click="setActiveTab(tabKey)"
              >
                <component :is="tabs[tabKey].icon" class="size-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" :side-offset="8">
              {{ tabs[tabKey].label }}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
    <div
      v-if="showRightFade"
      class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none"
    />
  </div>
</template>

<style scoped>
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
.scrollbar-hidden {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
