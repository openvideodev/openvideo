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

        const isPriority =
          action.type === "clip:remove" || 
          action.type === "track:remove" || 
          action.type === "clip:remove-animation" ||
          action.type === "clip:add-animation";

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
          if (isPriority) {
            isRemoteRef.current = false;
            remoteActionTypeRef.current = null;
          } else {
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

    const lastSentState = new Map<string, any>();
    const activeState = new Map<string, any>();

    const PRIORITY_ACTIONS = ["clip:add-animation", "clip:remove-animation", "clip:remove", "track:remove"];

    const dispatchAction = (action: StudioAction) => {
      const isPriority = PRIORITY_ACTIONS.includes(action.type);
      
      if (action._meta?.remote) return;
      if (isRemoteRef.current && !isPriority) {
        console.log(`[Collab]  bloqueando dispatch de ${action.type} por isRemote lock`);
        return;
      }

      // Only send diffed payload for updates
      if (action.type === "clip:update") {
        const payload = action.payload as any;
        const currentState = payload.updates;
        const previousState = lastSentState.get(payload.clipId);

        if (previousState) {
          const diff: Record<string, any> = {};
          for (const key in currentState) {
            if (!isEqual(currentState[key], previousState[key])) {
              diff[key] = currentState[key];
            }
          }
          if (Object.keys(diff).length === 0) return; // Avoid broadcasting no-ops
          console.log(`[Collab]  diff:`, diff);
          payload.updates = diff; // Mutate action to only send minimal diff
        }

        // Store the FULL current state as the baseline for the next diff
        lastSentState.set(payload.clipId, currentState);
      }

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

    const handleNativeUpdate = ({ clip }: any) => {
      if (!clip) return;
      if (isRemoteRef.current) return;

      const currentState = clipToJSON(clip);
      
      // Modifiers like animations are explicitly managed by their respective
      // discrete StudioActions (clip:add-animation/clip:remove-animation)
      // Including them in full JSON updates destroys their native prototype
      // bindings (like .getTransform) on the receiving side via Object.assign.
      delete currentState.animations;

      const previousState = activeState.get(clip.id);

      if (previousState && isEqual(previousState, currentState)) return;

      activeState.set(clip.id, currentState);

      // Send the FULL state to throttledDispatchAction so trailing calls get the complete snapshot.
      // The actual diff computation occurs inside dispatchAction based on the successfully sent baseline.
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
      const state = clipToJSON(clip);
      delete state.animations; // Strip for add payload as well since clip:add might initialize it raw if the engine does not correctly instantiate
      lastSentState.set(clip.id, state);
      activeState.set(clip.id, state);

      dispatchAction({
        type: "clip:add",
        payload: { clip: state, trackId: trackId || "" },
      });
    };

    const handleNativeAddMultiple = ({ clips, trackId }: any) => {
      if (!Array.isArray(clips)) return;
      clips.forEach((clip) => {
        setupClipListeners(clip);
        const state = clipToJSON(clip);
        delete state.animations;

        lastSentState.set(clip.id, state);
        activeState.set(clip.id, state);

        dispatchAction({
          type: "clip:add",
          payload: { clip: state, trackId: trackId || "" },
        });
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
    studio.on("clips:added", handleNativeAddMultiple);
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
      studio.off("clips:added", handleNativeAddMultiple);
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
