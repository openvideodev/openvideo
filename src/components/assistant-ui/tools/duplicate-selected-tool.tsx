'use client';

import { useStudioStore } from '@/stores/studio-store';
import { Log } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, CopyIcon } from 'lucide-react';

export const DuplicateSelectedTool: ToolCallMessagePartComponent<any, any> = ({
  result,
}) => {
  const { studio } = useStudioStore();
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (executed || !studio || !result) return;

    const duplicateSelected = async () => {
      try {
        await studio.duplicateSelected();
        setExecuted(true);
      } catch (error) {
        Log.error('Failed to duplicate selected objects:', error);
      }
    };

    duplicateSelected();
  }, [studio, executed, result]);

  return (
    <div className="aui-tool-container mb-4 flex w-full flex-col gap-3 rounded-xl border bg-card/50 py-3">
      <div className="aui-tool-header flex items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CopyIcon className="size-4" />
        </div>
        <div className="flex flex-grow flex-col">
          <p className="font-medium text-sm">Duplicate Selected</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            Duplicating selected objects and adding to new tracks
          </p>
        </div>
      </div>

      {executed && (
        <div className="aui-tool-content border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckIcon className="size-4" />
            <span>Duplicated selected objects</span>
          </div>
        </div>
      )}
    </div>
  );
};
