'use client';

import { useStudioStore } from '@/stores/studio-store';
import { Log } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, PaletteIcon } from 'lucide-react';

interface SetColorToolArgs {
  color: string;
}

export const SetColorTool: ToolCallMessagePartComponent<
  SetColorToolArgs,
  any
> = ({ args, result }) => {
  const { studio } = useStudioStore();
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (executed || !studio || !result) return;

    const setColor = async () => {
      try {
        // We assume 'color' is for TextClips primarily
        await studio.updateSelected({
          fill: args.color,
        } as any);
        setExecuted(true);
      } catch (error) {
        Log.error('Failed to set color for selected objects:', error);
      }
    };

    setColor();
  }, [studio, args.color, executed, result]);

  return (
    <div className="aui-tool-container mb-4 flex w-full flex-col gap-3 rounded-xl border bg-card/50 py-3">
      <div className="aui-tool-header flex items-center gap-2 px-4">
        <div
          className="flex size-8 items-center justify-center rounded-lg bg-primary/10"
          style={{ color: args.color }}
        >
          <PaletteIcon className="size-4" />
        </div>
        <div className="flex flex-grow flex-col">
          <p className="font-medium text-sm">Set Color</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            Changing color of selected objects to {args.color}
          </p>
        </div>
      </div>

      {executed && (
        <div className="aui-tool-content border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckIcon className="size-4" />
            <span>Color updated</span>
          </div>
        </div>
      )}
    </div>
  );
};
