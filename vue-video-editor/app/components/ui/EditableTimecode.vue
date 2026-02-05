<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { cn } from '@/lib/utils';
import { formatTimeCode, parseTimeCode, type TimeCode, DEFAULT_FPS } from '~/lib/time';

interface Props {
  time: number;
  duration?: number;
  format?: TimeCode;
  fps?: number;
  className?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  format: 'MM:SS',
  fps: DEFAULT_FPS,
  disabled: false
});

const emit = defineEmits<{
  (e: 'time-change', time: number): void;
}>();

const isEditing = ref(false);
const inputValue = ref('');
const hasError = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const enterPressed = ref(false);

const formattedTime = computed(() => formatTimeCode(props.time, props.format, props.fps));

const startEditing = () => {
  if (props.disabled) return;
  isEditing.value = true;
  inputValue.value = formattedTime.value;
  hasError.value = false;
  enterPressed.value = false;
};

const cancelEditing = () => {
  isEditing.value = false;
  inputValue.value = '';
  hasError.value = false;
  enterPressed.value = false;
};

const applyEdit = () => {
  const parsedTime = parseTimeCode(inputValue.value, props.format, props.fps);

  if (parsedTime === null) {
    hasError.value = true;
    return;
  }

  // Clamp time to valid range
  const clampedTime = Math.max(
    0,
    props.duration !== undefined ? Math.min(props.duration, parsedTime) : parsedTime
  );

  emit('time-change', clampedTime);
  isEditing.value = false;
  inputValue.value = '';
  hasError.value = false;
  enterPressed.value = false;
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    enterPressed.value = true;
    applyEdit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelEditing();
  }
};

const handleInputChange = (e: Event) => {
  inputValue.value = (e.target as HTMLInputElement).value;
  hasError.value = false;
};

const handleBlur = () => {
  // Only apply edit if Enter wasn't pressed (to avoid double processing)
  if (!enterPressed.value && isEditing.value) {
    applyEdit();
  }
};

// Focus input when entering edit mode
watch(isEditing, (val) => {
  if (val) {
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus();
        inputRef.value.select();
      }
    });
  }
});
</script>

<template>
  <input
    v-if="isEditing"
    ref="inputRef"
    type="text"
    :value="inputValue"
    @input="handleInputChange"
    @keydown="handleKeyDown"
    @blur="handleBlur"
    :class="cn(
      'text-xs bg-transparent border-none outline-none',
      'focus:bg-background focus:border focus:border-primary focus:px-1 focus:rounded',
      'tabular-nums text-foreground',
      hasError && 'text-destructive focus:border-destructive',
      className
    )"
    :style="{ width: `${formattedTime.length + 1}ch` }"
    :placeholder="formattedTime"
  />
  <span
    v-else
    @click="startEditing"
    :class="cn(
      'text-xs tabular-nums text-foreground cursor-pointer',
      'hover:bg-muted/50 hover:rounded px-1 -mx-1 transition-colors',
      disabled && 'cursor-default hover:bg-transparent',
      className
    )"
    :title="disabled ? undefined : 'Click to edit time'"
  >
    {{ formattedTime }}
  </span>
</template>
