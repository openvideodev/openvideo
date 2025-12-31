import { useState } from 'react';
import {
  IconDownload,
  IconExternalLink,
  IconDots,
  IconPlus,
  IconUpload,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudioStore } from '@/stores/studio-store';
import { Log, type IClip } from '@designcombo/video';
import { ExportModal } from './export-modal';

export default function Header() {
  const { studio } = useStudioStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    <header className="relative flex h-14 w-full shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleNew}>
              <IconPlus className="mr-2 size-4" />
              New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportJSON}>
              <IconUpload className="mr-2 size-4" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>
              <IconDownload className="mr-2 size-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center Section */}
      <div className="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        Untitled video
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-2 rounded-full"
          onClick={() => setIsExportModalOpen(true)}
        >
          Download
        </Button>

        <ExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <IconExternalLink className="size-4" />
          <span className="sr-only">Share</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <IconDots className="size-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </div>
    </header>
  );
}
