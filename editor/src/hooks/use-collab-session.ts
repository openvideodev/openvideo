"use client";
import { useEffect, useRef } from "react";
import { throttle, isEqual } from "lodash";
import { supabase } from "@/lib/supabase";
import type { Studio, StudioAction } from "openvideo";
import { clipToJSON } from "openvideo";

interface UseCollabSessionOpts {
  projectId: string;
  userId: string;
  enabled?: boolean;
}

export function useCollabSession(
  studio: Studio | null,
  opts: UseCollabSessionOpts,
) {
  const { projectId, userId, enabled = false } = opts;
  const seen = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isRemoteRef = useRef(false);
  // Nuevo: solo bloquea updates/moves, nunca deletes
  const remoteActionTypeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!studio || !enabled || !projectId) return;

    let remoteActionTimeout: NodeJS.Timeout;

    const channel = supabase.channel(`room:${projectId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "action" }, async ({ payload }) => {
        const action = payload as StudioAction;
        const id = action._meta?.actionId as string | undefined;
        if (id && seen.current.has(id)) return;
        if (id) seen.current.add(id);

        const isDestructive =
          action.type === "clip:remove" || action.type === "track:remove";

        isRemoteRef.current = true;
        remoteActionTypeRef.current = action.type;
        clearTimeout(remoteActionTimeout);

        try {
          studio.ignoreHistoryForNextAction = true;
          await studio.dispatch({
            ...action,
            _meta: { ...action._meta, remote: true },
          });
        } finally {
          if (isDestructive) {
            // Los deletes liberan el lock inmediatamente
            isRemoteRef.current = false;
            remoteActionTypeRef.current = null;
          } else {
            // Updates/moves siguen esperando 500ms para evitar bounce
            remoteActionTimeout = setTimeout(() => {
              isRemoteRef.current = false;
              remoteActionTypeRef.current = null;
            }, 500);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[CollabSession] Broadcast Channel status:`, status);
      });

    channelRef.current = channel;

    const dispatchAction = (action: StudioAction) => {
      if (action._meta?.remote || isRemoteRef.current) return;

      const actionId = crypto.randomUUID();
      seen.current.add(actionId);

      channel.send({
        type: "broadcast",
        event: "action",
        payload: {
          ...action,
          _meta: { ...action._meta, actionId, userId, timestamp: Date.now() },
        },
      });
    };

    const throttledDispatchAction = throttle(dispatchAction, 200, {
      leading: true,
      trailing: true,
    });

    const handleAction = ({ action }: { action: StudioAction }) =>
      dispatchAction(action);
    studio.on("action:dispatched", handleAction);

    const lastSentState = new Map<string, any>();

    const handleNativeUpdate = ({ clip }: any) => {
      if (isRemoteRef.current) return;

      const currentState = clipToJSON(clip);
      const previousState = lastSentState.get(clip.id);

      if (previousState && isEqual(previousState, currentState)) return;

      lastSentState.set(clip.id, currentState);

      throttledDispatchAction({
        type: "clip:update",
        payload: {
          clipId: clip.id,
          updates: currentState as unknown as Record<string, unknown>,
        },
      });
    };

    const clipListeners = new Map<string, () => void>();

    const setupClipListeners = (clip: any) => {
      if (!clip || clipListeners.has(clip.id)) return;

      const onUpdate = () => handleNativeUpdate({ clip });
      const events = ["propsChange", "moving", "rotating", "scaling"];

      events.forEach((ev) => clip.on?.(ev, onUpdate));

      clipListeners.set(clip.id, () => {
        events.forEach((ev) => clip.off?.(ev, onUpdate));
      });
    };

    const existingClips = (studio as any).clips || [];
    existingClips.forEach(setupClipListeners);

    const handleNativeAdd = ({ clip, trackId }: any) => {
      setupClipListeners(clip);
      lastSentState.set(clip.id, clipToJSON(clip));

      dispatchAction({
        type: "clip:add",
        payload: { clip: clipToJSON(clip), trackId: trackId || "" },
      });
    };

    const handleNativeRemove = ({ clipId }: any) => {
      // Los deletes SIEMPRE se envían, ignorando el lock de isRemoteRef
      if (isRemoteRef.current && remoteActionTypeRef.current !== "clip:remove")
        return;

      dispatchAction({
        type: "clip:remove",
        payload: { clipId },
      });
    };

    const handleNativeRemoveMultiple = ({ clipIds }: { clipIds: string[] }) => {
      if (!Array.isArray(clipIds)) return;
      // Igual que arriba: los deletes pasan siempre
      if (isRemoteRef.current && remoteActionTypeRef.current !== "clips:remove")
        return;

      clipIds.forEach((clipId) => {
        dispatchAction({
          type: "clip:remove",
          payload: { clipId },
        });
      });
    };

    studio.on("clip:added", handleNativeAdd);
    studio.on("clip:updated", handleNativeUpdate);
    studio.on("clip:removed", handleNativeRemove);
    studio.on("clips:removed", handleNativeRemoveMultiple);
    studio.on("clip:propsChange", handleNativeUpdate);
    studio.on("propsChange", handleNativeUpdate);
    studio.on("clip:moved", handleNativeUpdate);

    return () => {
      clearTimeout(remoteActionTimeout);
      throttledDispatchAction.cancel();
      studio.off("action:dispatched", handleAction);
      studio.off("clip:added", handleNativeAdd);
      studio.off("clip:updated", handleNativeUpdate);
      studio.off("clip:removed", handleNativeRemove);
      studio.off("clips:removed", handleNativeRemoveMultiple);
      studio.off("clip:propsChange", handleNativeUpdate);
      studio.off("propsChange", handleNativeUpdate);
      studio.off("clip:moved", handleNativeUpdate);

      clipListeners.forEach((cleanup) => cleanup());
      clipListeners.clear();

      channel.unsubscribe();
      channelRef.current = null;
      seen.current.clear();
    };
  }, [studio, enabled, projectId, userId]);
}
