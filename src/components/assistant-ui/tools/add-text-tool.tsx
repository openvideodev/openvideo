'use client';

import { useStudioStore } from '@/stores/studio-store';
import { Log, TextClip } from '@designcombo/video';
import { useEffect, useState } from 'react';
import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TypeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddTextToolArgs {
  text: string;
}

export const AddTextTool: ToolCallMessagePartComponent<AddTextToolArgs> = ({
  args,
  result,
  toolName,
}) => {
  const { studio } = useStudioStore();
  const [executed, setExecuted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (executed || !studio || !args.text || !result) return;

    const addText = async () => {
      try {
        const textClip = new TextClip(args.text, {
          fontSize: 124,
          fontFamily: 'Arial',
          align: 'left',
          fontWeight: 'bold',
          fontStyle: 'italic',
          fill: '#ffffff',
          stroke: {
            color: '#ffffff',
            width: 5,
            join: 'round',
          },
          // align: 'center',
          dropShadow: {
            color: '#ffffff',
            alpha: 0.5,
            blur: 4,
            angle: Math.PI / 6,
            distance: 6,
          },
          wordWrap: true,
          wordWrapWidth: 440,
        });

        textClip.display.from = 0;
        textClip.duration = 5e6; // 5 seconds?
        textClip.display.to = 5e6;

        await studio.addClip(textClip);
        setExecuted(true);
      } catch (error) {
        Log.error('Failed to add text tool clip:', error);
      }
    };

    addText();
  }, [studio, args.text, executed, result]);

  return (
    <div className="aui-tool-container mb-4 flex w-full flex-col gap-3 rounded-xl border bg-card/50 py-3">
      <div className="aui-tool-header flex items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TypeIcon className="size-4" />
        </div>
        <div className="flex flex-grow flex-col">
          <p className="font-medium text-sm">Add Text</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {args.text}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronUpIcon className="size-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && executed && (
        <div className="aui-tool-content border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckIcon className="size-4" />
            <span>Added "{args.text}" to timeline</span>
          </div>
        </div>
      )}
    </div>
  );
};
