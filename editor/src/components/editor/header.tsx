import { useState } from 'react';
import { IconShare } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { usePanelStore } from '@/stores/panel-store';
import { Log, type IClip } from 'openvideo';
import { ExportModal } from './export-modal';
import { LogoIcons } from '../shared/logos';
import Link from 'next/link';
import { Icons } from '../shared/icons';
import {
  Keyboard,
  FileJson,
  FilePlus,
  Download,
  Upload,
  MessageSquare,
} from 'lucide-react';
import { ShortcutsModal } from './shortcuts-modal';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { studio } = useStudioStore();
  const { toggleCopilot, isCopilotVisible } = usePanelStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!studio) return;

    setCanUndo(studio.history.canUndo());
    setCanRedo(studio.history.canRedo());

    const handleHistoryChange = ({
      canUndo,
      canRedo,
    }: {
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    };

    studio.on('history:changed', handleHistoryChange);

    return () => {
      studio.off('history:changed', handleHistoryChange);
    };
  }, [studio]);

  const handleNew = () => {
    if (!studio) return;
    const confirmed = window.confirm(
      'Are you sure you want to start a new project? Unsaved changes will be lost.'
    );
    if (confirmed) {
      studio.clear();
    }
  };

  const handleExportJSON = () => {
    if (!studio) return;

    try {
      // Get all clips from studio
      const clips = (studio as any).clips as IClip[];
      if (clips.length === 0) {
        alert('No clips to export');
        return;
      }

      // Export to JSON
      const json = studio.exportToJSON();
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download the JSON file
      const aEl = document.createElement('a');
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `combo-project-${Date.now()}.json`;
      aEl.click();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error('Export to JSON error:', error);
      alert('Failed to export to JSON: ' + (error as Error).message);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json.clips || !Array.isArray(json.clips)) {
          throw new Error('Invalid JSON format: missing clips array');
        }

        if (!studio) {
          throw new Error('Studio not initialized');
        }

        // Filter out clips with empty sources (except Text, Caption, and Effect)
        const validClips = json.clips.filter((clipJSON: any) => {
          if (
            clipJSON.type === 'Text' ||
            clipJSON.type === 'Caption' ||
            clipJSON.type === 'Effect' ||
            clipJSON.type === 'Transition'
          ) {
            return true;
          }
          return clipJSON.src && clipJSON.src.trim() !== '';
        });

        if (validClips.length === 0) {
          throw new Error(
            'No valid clips found in JSON. All clips have empty source URLs.'
          );
        }

        const validJson = { ...json, clips: validClips };
        await studio.loadFromJSON(validJson);
      } catch (error) {
        Log.error('Load from JSON error:', error);
        alert('Failed to load from JSON: ' + (error as Error).message);
      } finally {
        document.body.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <div className="pointer-events-auto flex h-9 w-9 bg-primary/20 items-center justify-center rounded-md ">
          <LogoIcons.scenify width={24} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">File</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleExportJSON}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export (to JSON)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportJSON}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Import from JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNew}>
              <FilePlus className="mr-2 h-4 w-4" />
              <span>Clear or New project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className=" pointer-events-auto flex h-10 items-center px-1.5">
          <Button
            onClick={() => studio?.undo()}
            disabled={!canUndo}
            variant="ghost"
            size="icon"
          >
            <Icons.undo className="size-5" />
          </Button>
          <Button
            onClick={() => studio?.redo()}
            disabled={!canRedo}
            className="text-muted-foreground"
            variant="ghost"
            size="icon"
          >
            <Icons.redo className="size-5" />
          </Button>
        </div>
      </div>

      {/* Center Section */}
      <div className="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        Untitled video
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsShortcutsModalOpen(true)}
          >
            <Keyboard className="size-5" />
          </Button>

          <Button
            size={'sm'}
            variant="outline"
            onClick={toggleCopilot}
            className="h-7"
            title="Toggle Chat Copilot"
          >
            <Icons.ai className="size-5" />
            <span className="hidden md:block">AI Chat</span>
          </Button>
        </div>
        <Link href="https://discord.gg/SCfMrQx8kr" target="_blank">
          <Button className="h-7 rounded-lg" variant={'outline'}>
            <LogoIcons.discord className="w-6 h-6" />
            <span className="hidden md:block">Join Us</span>
          </Button>
        </Link>

        <ExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />
        <ShortcutsModal
          open={isShortcutsModalOpen}
          onOpenChange={setIsShortcutsModalOpen}
        />

        <Button
          className="flex h-7 gap-1 border border-border"
          variant="outline"
          size={'sm'}
        >
          <IconShare width={18} />{' '}
          <span className="hidden md:block">Share</span>
        </Button>
        <Button
          size="sm"
          className="gap-2 rounded-full"
          onClick={() => setIsExportModalOpen(true)}
        >
          Download
        </Button>
      </div>
    </header>
  );
}
