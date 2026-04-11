'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Studio, StudioAction } from 'openvideo';
import { clipToJSON } from 'openvideo';

interface UseCollabSessionOpts {
  projectId: string;
  userId: string;
  enabled?: boolean; // opt-in — defaults to false
}

export function useCollabSession(studio: Studio | null, opts: UseCollabSessionOpts) {
  const { projectId, userId, enabled = false } = opts;
  const seen = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!studio || !enabled || !projectId) return;

    let isRemoteAction = false;
    let remoteActionTimeout: NodeJS.Timeout;

    // 1. Subscribe to Supabase Broadcast channel
    const channel = supabase.channel(`room:${projectId}`, {
      config: { broadcast: { self: false } }, // don't echo our own messages
    });

    channel
      .on('broadcast', { event: 'action' }, async ({ payload }) => {
        const action = payload as StudioAction;
        const id = action._meta?.actionId as string | undefined;

        console.log(`[CollabAction] 📥 Received from ${action._meta?.userId}:`, action.type);

        // Deduplicate
        if (id && seen.current.has(id)) return;
        if (id) seen.current.add(id);

        isRemoteAction = true;
        clearTimeout(remoteActionTimeout);
        try {
          // Apply to local studio (remote flag prevents re-broadcast)
          console.log(`[CollabAction] 🛠 Applying remote action:`, action.type);
          await studio.dispatch({ ...action, _meta: { ...action._meta, remote: true } });
        } finally {
          // Ensure flag lives slightly longer to catch any deferred events
          remoteActionTimeout = setTimeout(() => {
            isRemoteAction = false;
          }, 50);
        }
      })
      .subscribe((status) => {
        console.log(`[CollabSession] Broadcast Channel status:`, status);
      });

    channelRef.current = channel;

    // 2. Wrap broadcasting logic
    const dispatchAction = (action: StudioAction) => {
      // Don't re-broadcast actions that came from peers
      if (action._meta?.remote || isRemoteAction) return;

      const actionId = crypto.randomUUID();
      seen.current.add(actionId);

      console.log(`[CollabAction] 📤 Broadcasting local action:`, action.type);

      channel.send({
        type: 'broadcast',
        event: 'action',
        payload: {
          ...action,
          _meta: { ...action._meta, actionId, userId, timestamp: Date.now() },
        },
      });
    };

    // 3. Listen to local studio dispatches and broadcast to peers
    const handleAction = ({ action }: { action: StudioAction }) => dispatchAction(action);
    studio.on('action:dispatched', handleAction);

    // 4. Fallback: If editor directly mutates studio, intercept native events
    const handleNativeAdd = ({ clip, trackId }: any) => {
      dispatchAction({
        type: 'clip:add',
        payload: { clip: clipToJSON(clip), trackId: trackId || '' },
      });
    };

    const handleNativeUpdate = ({ clip }: any) => {
      // clipToJSON outputs all properties. updateClip merges them.
      dispatchAction({
        type: 'clip:update',
        payload: { clipId: clip.id, updates: clipToJSON(clip) },
      });
    };

    const handleNativeRemove = ({ clipId }: any) => {
      dispatchAction({
        type: 'clip:remove',
        payload: { clipId },
      });
    };

    studio.on('clip:added', handleNativeAdd);
    studio.on('clip:updated', handleNativeUpdate);
    studio.on('clip:removed', handleNativeRemove);

    return () => {
      clearTimeout(remoteActionTimeout);
      studio.off('action:dispatched', handleAction);
      studio.off('clip:added', handleNativeAdd);
      studio.off('clip:updated', handleNativeUpdate);
      studio.off('clip:removed', handleNativeRemove);
      channel.unsubscribe();
      channelRef.current = null;
      seen.current.clear();
    };
  }, [studio, enabled, projectId, userId]);
}
