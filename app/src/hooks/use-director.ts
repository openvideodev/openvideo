"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OpenVideo, type SpaceConnection } from "@openvideo/ai";
import { core } from "@/lib/project";
import { directorConfig } from "@/lib/director-config";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "plan" | "patch";
  payload?: any;
}

const ov = new OpenVideo({ wsURL: directorConfig.wsUrl, mode: "proxy" });

let cachedToken: string | undefined;
async function getDirectorToken(): Promise<string | undefined> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch("/api/director/token", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      cachedToken = data.token as string;
      return cachedToken;
    }
  } catch {}
  return undefined;
}

export function useDirector(spaceId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const connRef = useRef<SpaceConnection | null>(null);
  const isApplyingRemotePatch = useRef(false);

  useEffect(() => {
    if (!spaceId) return;

    let conn: SpaceConnection | undefined;
    let cancelled = false;

    (async () => {
      const token = await getDirectorToken();

      if (cancelled) return;

      conn = ov.connect(spaceId, token);
      connRef.current = conn;

      conn.on("connect", () => {
        setIsConnected(true);
      });

      conn.on("disconnect", () => {
        setIsConnected(false);
        setIsThinking(false);
      });

      conn.on("init", ({ state }) => {
        console.log({ state });
        core.reset(state);
      });

      conn.on("chat.response", ({ message }) => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          { id: Math.random().toString(36).substring(7), role: "assistant", content: message },
        ]);
      });

      conn.on("plan.created", ({ plan }) => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: `Plan created: ${plan.goal}`,
            type: "plan",
            payload: plan,
          },
        ]);
      });

      conn.on("plan.step", ({ stepId, description, status }) => {
        const id = `step-${stepId}`;
        const content =
          status === "running"
            ? `⏳ ${description}...`
            : `${status === "done" ? "✅" : "❌"} ${description}`;

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === id);
          if (exists) {
            return prev.map((m) => (m.id === id ? { ...m, content } : m));
          }
          return [
            ...prev,
            {
              id,
              role: "assistant",
              content,
              type: "plan",
            },
          ];
        });
      });

      conn.on("patch", ({ patches }) => {
        const newPatches = patches.filter((patch) => {
          if (patch.op === "add" && patch.path?.startsWith("/clips/")) {
            const clipId = patch.path.split("/")[2];
            if (clipId && core.store.getState().clips[clipId]) return false;
          }
          return true;
        });

        if (newPatches.length === 0) return;

        isApplyingRemotePatch.current = true;
        core.applyPatch(newPatches as any[]);
        isApplyingRemotePatch.current = false;
      });

      const handler = (patches: any[]) => {
        if (isApplyingRemotePatch.current) return;
        conn!.sendPatch(patches);
      };

      core.on("change", handler);
      // store handler for cleanup
      (conn as any).__coreHandler = handler;
    })();

    return () => {
      cancelled = true;
      if (conn) {
        const handler = (conn as any).__coreHandler;
        if (handler) core.off("change", handler);
        conn.disconnect();
      }
    };
  }, [spaceId]);

  const sendMessage = useCallback((text: string) => {
    if (connRef.current?.connected) {
      connRef.current.sendChat(text);
      setIsThinking(true);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).substring(7), role: "user", content: text },
      ]);
    }
  }, []);

  return { messages, sendMessage, isConnected, isThinking };
}
