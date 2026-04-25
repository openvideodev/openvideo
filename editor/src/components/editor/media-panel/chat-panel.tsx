import {
  IconSend,
  IconPlus,
  IconArrowUp,
  IconSparkles2,
  IconCropPortrait,
  IconPhoto,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatPanel() {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="rounded-xl h-full p-3 flex flex-col gap-2 shadow-sm">
        <div className="flex gap-2 h-full pt-2">
          <IconPlus className="size-5" />
          <Textarea
            placeholder="Describe your video idea..."
            className="resize-none text-sm min-h-[24px] h-full !bg-transparent border-0 focus-visible:ring-0 px-1 py-0 shadow-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 pt-2 w-full justify-between">
          <div className="flex items-center gap-2">
            <Button variant={'secondary'} size="sm">
              <IconPhoto />
              Image
            </Button>
            <Button variant={'secondary'} size="sm">
              <IconCropPortrait /> 9:16
            </Button>
          </div>

          <Button className="h-9 w-20 rounded-full text-sm" size="sm">
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
