"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface PresenceMember {
  userId: string;
  sessionId: string;
  name: string;
  avatar?: string;
  color: string;
  joinedAt: number;
  cursor?: { x: number; y: number } | null;
}

const COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

const pickColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return COLORS[hash % COLORS.length];
};

interface UsePresenceOpts {
  projectId: string;
  userId: string;
  sessionId: string;
  name: string;
  avatar?: string;
  enabled?: boolean;
}

const CURSOR_EVENT = "cursor-move";

export function usePresence(opts: UsePresenceOpts) {
  const { projectId, userId, sessionId, name, avatar, enabled = false } = opts;

  const [members, setMembers] = useState<PresenceMember[]>([]);
  const channelRef = useRef<any>(null);

  const joinedAtRef = useRef(Date.now());
  const selfRef = useRef({ userId, sessionId, name, avatar });

  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  // keep latest identity
  useEffect(() => {
    selfRef.current = { userId, sessionId, name, avatar };
  }, [userId, sessionId, name, avatar]);

  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    const channel = supabase.channel(`presence:${projectId}`, {
      config: {
        presence: {
          key: sessionId, // ✅ IMPORTANT: unique identity per session/tab
        },
      },
    });

    channelRef.current = channel;

    const trackSelf = async () => {
      await channel.track({
        ...selfRef.current,
        joinedAt: joinedAtRef.current,
        cursor: lastCursorRef.current ?? null,
      });
    };

    const syncState = () => {
      const state = channel.presenceState<any>();

      const map = new Map<string, PresenceMember>();

      Object.values(state)
        .flat()
        .forEach((p: any) => {
          if (!p.sessionId || !p.userId) return;

          const existing = map.get(p.sessionId);

          if (!existing || (p.joinedAt && p.joinedAt > existing.joinedAt)) {
            map.set(p.sessionId, {
              ...p,
              color: pickColor(p.userId),
            });
          }
        });

      // Maintain cursors received via broadcast if they are fresher than presence
      setMembers((prev) => {
        const next = Array.from(map.values());
        return next.map((m) => {
          const prevMember = prev.find((pm) => pm.sessionId === m.sessionId);
          return {
            ...m,
            cursor: prevMember?.cursor ?? m.cursor,
          };
        });
      });
    };

    channel
      .on("presence", { event: "sync" }, syncState)
      .on("presence", { event: "join" }, () => syncState())
      .on("presence", { event: "leave" }, () => syncState())
      .on("broadcast", { event: CURSOR_EVENT }, ({ payload }) => {
        setMembers((prev) =>
          prev.map((m) =>
            m.sessionId === payload.sessionId
              ? { ...m, cursor: payload.cursor }
              : m
          ),
        );
      })
      .subscribe(async (status) => {
        console.log("[Presence] status:", status);

        if (status === "SUBSCRIBED") {
          // FIX: delay avoids race conditions on reload
          setTimeout(() => {
            trackSelf();
          }, 50);
        }
      });

    // 🔁 heartbeat (prevents disappearing users)
    const interval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track({
          ...selfRef.current,
          joinedAt: joinedAtRef.current,
          cursor: lastCursorRef.current ?? null,
        });
      }
    }, 15000);

    const handleUnload = () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);

      channel.untrack();
      supabase.removeChannel(channel);

      channelRef.current = null;
      setMembers([]);
    };
  }, [enabled, projectId, userId, sessionId]);

  // 🖱 cursor tracking optimized
  const trackCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!channelRef.current || !enabled) return;

      if (
        lastCursorRef.current &&
        cursor &&
        lastCursorRef.current.x === cursor.x &&
        lastCursorRef.current.y === cursor.y
      ) {
        return;
      }

      lastCursorRef.current = cursor;

      // Use broadcast for high-frequency updates (better performance than track)
      channelRef.current.send({
        type: "broadcast",
        event: CURSOR_EVENT,
        payload: { sessionId, cursor },
      });
    },
    [enabled, sessionId],
  );

  return { members, trackCursor };
}
