'use client';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { PresenceMember } from '@/hooks/use-presence';

interface CollabAvatarsProps {
  members: PresenceMember[];
  currentUserId: string;
}

export function CollabAvatars({ members, currentUserId }: CollabAvatarsProps) {
  const others = members.filter((m) => m.userId !== currentUserId);
  if (others.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {others.slice(0, 5).map((m) => (
          <Tooltip key={m.userId}>
            <TooltipTrigger asChild>
              <div
                className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-semibold text-white ring-0"
                style={{ backgroundColor: m.color }}
              >
                {m.avatar
                  ? <img src={m.avatar} className="h-full w-full rounded-full object-cover" alt={m.name} />
                  : m.name[0]?.toUpperCase()}
                {/* Live dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{m.name} <span className="text-muted-foreground">· editing</span></p>
            </TooltipContent>
          </Tooltip>
        ))}
        {others.length > 5 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
            +{others.length - 5}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
