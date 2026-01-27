import { useEffect, useState } from 'react';
import { Studio, type IClip } from '@designcombo/video';
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
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize,
  AlignHorizontalDistributeCenter,
} from 'lucide-react';

interface StudioContextMenuProps {
  studio: Studio | null;
  children: React.ReactNode;
}

export function StudioContextMenu({
  studio,
  children,
}: StudioContextMenuProps) {
  const [selectedClips, setSelectedClips] = useState<IClip[]>([]);

  useEffect(() => {
    if (!studio) return;

    const updateSelection = () => {
      setSelectedClips(studio.getSelectedClips());
    };

    studio.on('selection:created', updateSelection);
    studio.on('selection:updated', updateSelection);
    studio.on('selection:cleared', updateSelection);

    // Initial check
    updateSelection();

    return () => {
      studio.off('selection:created', updateSelection);
      studio.off('selection:updated', updateSelection);
      studio.off('selection:cleared', updateSelection);
    };
  }, [studio]);

  const hasSelection = selectedClips.length > 0;
  const hasVisualClips = selectedClips.some(
    (c) => c.type === 'Image' || c.type === 'Video'
  );

  const handleDuplicate = () => {
    studio?.duplicateSelected();
  };

  const handleDelete = () => {
    studio?.deleteSelected();
  };

  const handleSplit = () => {
    studio?.splitSelected();
  };

  const handleFlip = (axis: 'X' | 'Y') => {
    if (!studio) return;
    const updates: { id: string; updates: Record<string, any> }[] = [];
    studio.getSelectedClips().forEach((clip) => {
      if (clip.type === 'Image' || clip.type === 'Video') {
        updates.push({
          id: clip.id,
          updates: {
            [axis === 'X' ? 'scaleX' : 'scaleY']:
              ((clip as any)[axis === 'X' ? 'scaleX' : 'scaleY'] || 1) * -1,
          },
        });
      }
    });
    if (updates.length > 0) {
      studio.updateClips(updates);
    }
  };

  const handleScale = (mode: 'fit' | 'cover') => {
    if (!studio) return;
    studio.getSelectedClips().forEach((clip) => {
      if (mode === 'fit') studio.scaleToFit(clip);
      else studio.scaleToCover(clip);
    });
  };

  const handleAlign = (mode: 'center' | 'centerX' | 'centerY') => {
    if (!studio) return;
    studio.getSelectedClips().forEach((clip) => {
      if (mode === 'center') studio.centerClip(clip);
      else if (mode === 'centerX') studio.centerClipH(clip);
      else if (mode === 'centerY') studio.centerClipV(clip);
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-full w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {!hasSelection && (
          <ContextMenuItem disabled className="text-muted-foreground text-xs">
            No clip selected
          </ContextMenuItem>
        )}

        {hasSelection && (
          <>
            <ContextMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSplit}>
              <Scissors className="mr-2 h-4 w-4" />
              Split
              <ContextMenuShortcut>S</ContextMenuShortcut>
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

            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <AlignHorizontalDistributeCenter className="mr-2 h-4 w-4" />
                Alignment
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => handleAlign('center')}>
                  Center
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAlign('centerX')}>
                  Center Horizontally
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAlign('centerY')}>
                  Center Vertically
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            {hasVisualClips && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Maximize className="mr-2 h-4 w-4" />
                  Transform
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem onClick={() => handleScale('fit')}>
                    <Minimize className="mr-2 h-4 w-4" />
                    Scale to Fit
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleScale('cover')}>
                    <Maximize className="mr-2 h-4 w-4" />
                    Scale to Fill
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleFlip('X')}>
                    <FlipHorizontal className="mr-2 h-4 w-4" />
                    Flip Horizontal
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleFlip('Y')}>
                    <FlipVertical className="mr-2 h-4 w-4" />
                    Flip Vertical
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
