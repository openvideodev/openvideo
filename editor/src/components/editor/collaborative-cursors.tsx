import React, { useRef, useEffect, useState } from "react";
import { PresenceMember } from "@/hooks/use-presence";

interface CollaborativeCursorsProps {
  members: PresenceMember[];
  currentSessionId?: string;
}

export function CollaborativeCursors({
  members,
  currentSessionId,
}: CollaborativeCursorsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Track container dimensions with ResizeObserver for ultra-precise relative positioning
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRect({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Defensive guard: if members is not array
  if (!Array.isArray(members)) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-[9999]"
    >
      {members
        .filter(
          (member) =>
            member.cursor &&
            typeof member.cursor.x === "number" &&
            member.sessionId !== currentSessionId, // Optimization: don't render self cursor (redundant)
        )
        .map((member) => {
          // Calculate local position from normalized coordinates (0-1)
          const localX = member.cursor!.x * rect.width;
          const localY = member.cursor!.y * rect.height;

          return (
            <div
              key={member.sessionId}
              className="absolute transition-transform duration-75 ease-out will-change-transform"
              style={{
                transform: `translate3d(${localX}px, ${localY}px, 0)`,
                zIndex: 1,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: member.color }}
                className="drop-shadow-sm"
              >
                <path
                  d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className="absolute left-3 top-3 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-white whitespace-nowrap shadow-sm border border-white/20 uppercase tracking-tighter"
                style={{ backgroundColor: member.color }}
              >
                {member.name}
              </div>
            </div>
          );
        })}
    </div>
  );
}
