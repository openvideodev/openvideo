'use client';

import { useStudioStore } from '@/stores/studio-store';
import { Log } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, Trash2Icon } from 'lucide-react';

export const DeleteSelectedTool: ToolCallMessagePartComponent<any, any> = ({
  result,
}) => {
  const { studio } = useStudioStore();
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (executed || !studio || !result) return;

    const deleteSelected = async () => {
      try {
        await studio.deleteSelected();
        setExecuted(true);
      } catch (error) {
        Log.error('Failed to delete selected objects:', error);
      }
    };

    deleteSelected();
  }, [studio, executed, result]);

  return (
    <div className="aui-tool-container mb-4 flex w-full flex-col gap-3 rounded-xl border bg-card/50 py-3">
      <div className="aui-tool-header flex items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <Trash2Icon className="size-4" />
        </div>
        <div className="flex flex-grow flex-col">
          <p className="font-medium text-sm">Delete Selected</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            Removing selected objects from timeline
          </p>
        </div>
      </div>

      {executed && (
        <div className="aui-tool-content border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckIcon className="size-4" />
            <span>Deleted selected objects</span>
          </div>
        </div>
      )}
    </div>
  );
};
