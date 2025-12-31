'use client';

import { useStudioStore } from '@/stores/studio-store';
import { Log } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ScissorsIcon } from 'lucide-react';

interface SplitSelectedToolArgs {
  time?: number;
}

export const SplitSelectedTool: ToolCallMessagePartComponent<
  SplitSelectedToolArgs,
  any
> = ({ args, result }) => {
  const { studio } = useStudioStore();
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (executed || !studio || !result) return;

    const splitSelected = async () => {
      try {
        // Convert seconds to microseconds if time is provided
        const splitTimeUs = args.time ? args.time * 1_000_000 : undefined;
        await studio.splitSelected(splitTimeUs);
        setExecuted(true);
      } catch (error) {
        Log.error('Failed to split selected object:', error);
      }
    };

    splitSelected();
  }, [studio, args.time, executed, result]);

  return (
    <div className="aui-tool-container mb-4 flex w-full flex-col gap-3 rounded-xl border bg-card/50 py-3">
      <div className="aui-tool-header flex items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ScissorsIcon className="size-4" />
        </div>
        <div className="flex flex-grow flex-col">
          <p className="font-medium text-sm">Split Selected</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            Splitting selected object{' '}
            {args.time ? `at ${args.time}s` : 'at playhead'}
          </p>
        </div>
      </div>

      {executed && (
        <div className="aui-tool-content border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckIcon className="size-4" />
            <span>Split selected object</span>
          </div>
        </div>
      )}
    </div>
  );
};
