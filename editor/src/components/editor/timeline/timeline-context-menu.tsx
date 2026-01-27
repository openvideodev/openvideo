import { useEffect, useState } from 'react';
import type TimelineCanvas from './timeline/canvas';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  Trash2,
  Scissors,
  Download,
  Replace,
  Music,
  Files,
  ScissorsLineDashed,
} from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';
import { usePlaybackStore } from '@/stores/playback-store';

interface TimelineContextMenuProps {
  timelineCanvas: TimelineCanvas | null;
  children: React.ReactNode;
}

export function TimelineContextMenu({
  timelineCanvas,
  children,
}: TimelineContextMenuProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { studio } = useStudioStore();

  useEffect(() => {
    if (!timelineCanvas) return;

    const onSelectionChanged = ({ selectedIds }: { selectedIds: string[] }) => {
      setSelectedIds(selectedIds);
    };

    timelineCanvas.on('selection:changed', onSelectionChanged);

    return () => {
      timelineCanvas.off('selection:changed', onSelectionChanged);
    };
  }, [timelineCanvas]);

  const hasSelection = selectedIds.length > 0;
  const isSingleSelection = selectedIds.length === 1;

  const handleDuplicate = () => {
    studio?.duplicateSelected();
  };

  const handleDelete = () => {
    studio?.deleteSelected();
  };

  const handleSplit = () => {
    const splitTime = usePlaybackStore.getState().currentTime * 1_000_000;
    studio?.splitSelected(splitTime);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!timelineCanvas) return;

    // Ensure we get the correct target by using coordinates relative to canvas
    const canvas = timelineCanvas.canvas;
    const pointer = canvas.getScenePoint(e.nativeEvent);
    // findTarget can take a point object for more accurate detection in some cases
    const target = canvas.findTarget(e.nativeEvent);

    if (target && (target as any).elementId) {
      const clipId = (target as any).elementId;
      const currentSelection = canvas.getActiveObjects();
      const isAlreadySelected = currentSelection.some(
        (obj: any) => obj.elementId === clipId
      );

      if (!isAlreadySelected) {
        timelineCanvas.selectClips([clipId]);
      }
    } else {
      // Clear selection if clicking on empty space
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      // Also need to manually trigger selection:changed since discardActiveObject might not if nothing was selected
      // but we want to ensure our React state updates.
      timelineCanvas.emitSelectionChange();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={handleContextMenu}
        className="h-full w-full"
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {!hasSelection && (
          <ContextMenuItem disabled className="text-muted-foreground text-xs">
            No element selected
          </ContextMenuItem>
        )}

        {hasSelection && (
          <>
            <ContextMenuItem
              onClick={handleSplit}
              disabled={!isSingleSelection}
            >
              <Scissors className="mr-2 h-4 w-4" />
              Split
              <ContextMenuShortcut>S</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem disabled>
              <ScissorsLineDashed className="mr-2 h-4 w-4" />
              Cut
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem disabled>
              <Copy className="mr-2 h-4 w-4" />
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem disabled>
              <Files className="mr-2 h-4 w-4" />
              Paste
              <ContextMenuShortcut>⌘V</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={handleDelete}
              className="text-red-500 font-medium"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
              <ContextMenuShortcut className="text-red-500">
                ⌫
              </ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem disabled>
              <Replace className="mr-2 h-4 w-4" />
              Replace
            </ContextMenuItem>

            <ContextMenuSub>
              <ContextMenuSubTrigger disabled>
                <Download className="mr-2 h-4 w-4" />
                Download clip
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48" />
            </ContextMenuSub>

            <ContextMenuItem disabled>
              <Music className="mr-2 h-4 w-4" />
              Separate audio
              <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
