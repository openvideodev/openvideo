"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { PresenceMember } from "@/hooks/use-presence";

interface CollabAvatarsProps {
  members: PresenceMember[];
  currentUserId: string;
  currentSessionId?: string;
}

export function CollabAvatars({ members, currentUserId, currentSessionId }: CollabAvatarsProps) {
  // We now show ALL members (including yourself) so users can clearly see that their
  // own connection is active alongside others in the header.
  if (members.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2 mr-2">
        {members.slice(0, 5).map((m) => {
          const isYou = currentSessionId 
            ? m.sessionId === currentSessionId 
            : m.userId === currentUserId;
            
          return (
            <Tooltip key={m.sessionId}>
              <TooltipTrigger asChild>
                <div
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-semibold text-white ${isYou ? 'z-10 ring-2 ring-primary ring-offset-1 ring-offset-background' : 'ring-0'}`}
                  style={{ backgroundColor: m.color }}
                >
                  {m.avatar ? (
                    <img
                      src={m.avatar}
                      className="h-full w-full rounded-full object-cover"
                      alt={m.name}
                    />
                  ) : (
                    m.name[0]?.toUpperCase()
                  )}
                  {/* Live dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {m.name} {isYou && <span className="font-bold opacity-80">(you)</span>}
                  <span className="text-muted-foreground ml-1">· editing</span>
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {members.length > 5 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
            +{members.length - 5}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
