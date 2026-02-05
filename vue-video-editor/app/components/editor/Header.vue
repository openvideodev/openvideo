<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Download,
  Upload,
  FilePlus,
  Keyboard,
  Share2,
} from 'lucide-vue-next';
import { ref } from 'vue';
import { Icons } from '../shared/icons';
import { LogoIcons } from '../shared/logos';

// Mock store state
const canUndo = ref(false);
const canRedo = ref(false);

const handleNew = () => {
  const confirmed = window.confirm(
    'Are you sure you want to start a new project? Unsaved changes will be lost.'
  );
  if (confirmed) {
    console.log('New project started');
  }
};

const handleExportJSON = () => {
  console.log('Export JSON');
};

const handleImportJSON = () => {
  console.log('Import JSON');
};

const toggleCopilot = () => {
  console.log('Toggle Copilot');
};
</script>

<template>
  <header class="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10 border-b">
    <!-- Left Section -->
    <div class="flex items-center gap-2">
      <div class="pointer-events-auto flex h-9 w-9 bg-primary/20 items-center justify-center rounded-md">
        <!-- Logo -->
        <LogoIcons.scenify class="w-6 h-6" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost">File</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48">
          <DropdownMenuItem @click="handleExportJSON">
            <Download class="mr-2 h-4 w-4" />
            <span>Export (to JSON)</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleImportJSON">
            <Upload class="mr-2 h-4 w-4" />
            <span>Import from JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleNew">
            <FilePlus class="mr-2 h-4 w-4" />
            <span>Clear or New project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="pointer-events-auto flex h-10 items-center px-1.5">
        <Button
          variant="ghost"
          size="icon"
          :disabled="!canUndo"
        >
          <Icons.undo class="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :disabled="!canRedo"
          class="text-muted-foreground"
        >
          <Icons.redo class="size-5" />
        </Button>
      </div>
    </div>

    <!-- Center Section -->
    <div class="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      Untitled video
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <div class="flex items-center mr-2">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Keyboard class="size-5" />
        </Button>
      </div>
      
      <a href="https://discord.gg/SCfMrQx8kr" target="_blank">
        <Button class="h-7 rounded-lg" variant="outline">
          <LogoIcons.discord class="w-6 h-6 mr-2" />
          <span class="hidden md:block">Join Us</span>
        </Button>
      </a>

      <Button
        class="flex h-7 gap-1 border border-border"
        variant="outline"
        size="sm"
      >
        <Share2 class="w-4 h-4 mr-1" />
        <span class="hidden md:block">Share</span>
      </Button>
      <Button
        size="sm"
        class="gap-2 rounded-full"
      >
        Download
      </Button>
    </div>
  </header>
</template>
