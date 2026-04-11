'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface PresenceMember {
  userId: string;
  name: string;
  avatar?: string;
  color: string;    // assigned from SESSION_COLORS palette
  joinedAt: number;
}

const SESSION_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffff;
  return SESSION_COLORS[hash % SESSION_COLORS.length];
}

interface UsePresenceOpts {
  projectId: string;
  userId: string;
  name: string;
  avatar?: string;
  enabled?: boolean;
}

export function usePresence(opts: UsePresenceOpts) {
  const { projectId, userId, name, avatar, enabled = false } = opts;
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    const channel = supabase.channel(`presence:${projectId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Omit<PresenceMember, 'color'>>();
        const list: PresenceMember[] = Object.values(state)
          .flat()
          .map((m) => ({ ...m, color: pickColor(m.userId) }));
        
        console.log(`[CollabPresence] Sync: ${list.length} users in room`, list.map(u => u.name));
        setMembers(list);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[CollabPresence] Joined:`, newPresences.map(p => p.name));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[CollabPresence] Left:`, leftPresences.map(p => p.name));
      })
      .subscribe(async (status) => {
        console.log(`[CollabPresence] Channel status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`[CollabPresence] Tracking self as ${name} (${userId})`);
          await channel.track({ userId, name, avatar, joinedAt: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
      setMembers([]);
    };
  }, [enabled, projectId, userId, name, avatar]);

  return members;
}
