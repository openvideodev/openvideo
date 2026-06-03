"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { core } from "@/lib/project";
import { directorConfig } from "@/lib/director-config";
import { trpc } from "@/lib/trpc";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "plan" | "patch";
  payload?: any;
}

export function useDirector(spaceId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isApplyingRemotePatch = useRef(false);

  const { data: tokenData } = trpc.session.getToken.useQuery({ spaceId }, { enabled: !!spaceId });

  useEffect(() => {
    if (!spaceId || !tokenData?.token) return;
    console.log("token", { token: tokenData.token }, { spaceId });
    // Create direct Socket.io connection to Director
    const socket = io(directorConfig.wsUrl, {
      path: "/ws",
      auth: { token: tokenData.token },
      query: { spaceId },
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[Director] Connected");
      setIsConnected(true);
      socket.emit("space:join", { spaceId });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Director] Disconnected:", reason);
      setIsConnected(false);
      setIsThinking(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Director] Connection error:", error);
      setIsConnected(false);
    });

    // Director events
    socket.on("message", (msg: any) => {
      switch (msg.type) {
        case "init":
          console.log("[Director] Init received");
          core.reset(msg.state);
          break;
        case "chat.response":
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              role: "assistant",
              content: msg.message,
            },
          ]);
          break;
        case "plan.created":
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              role: "assistant",
              content: `Plan created: ${msg.plan.goal}`,
              type: "plan",
              payload: msg.plan,
            },
          ]);
          break;
        case "plan.step": {
          const id = `step-${msg.stepId}`;
          const content =
            msg.status === "running"
              ? `⏳ ${msg.description}...`
              : `${msg.status === "done" ? "✅" : "❌"} ${msg.description}`;

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
          break;
        }
        case "patch": {
          const newPatches = (msg.patch || msg.patches || []).filter((p: any) => {
            if (p.op === "add" && p.path?.startsWith("/clips/")) {
              const clipId = p.path.split("/")[2];
              if (clipId && core.store.getState().clips[clipId]) return false;
            }
            return true;
          });

          if (newPatches.length === 0) break;

          isApplyingRemotePatch.current = true;
          core.applyPatch(newPatches as any[]);
          isApplyingRemotePatch.current = false;
          break;
        }
        case "error":
          console.error("[Director] Error:", msg.message);
          setIsThinking(false);
          break;
      }
    });

    // Listen for local changes and send patches
    const handleLocalChange = (patches: any[]) => {
      if (isApplyingRemotePatch.current) return;
      if (socket.connected) {
        socket.emit("patch", { patch: patches });
      }
    };

    core.on("change", handleLocalChange);

    return () => {
      core.off("change", handleLocalChange);
      socket.disconnect();
    };
  }, [spaceId, tokenData?.token]);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat", { message: text });
      setIsThinking(true);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).substring(7), role: "user", content: text },
      ]);
    }
  }, []);

  return { messages, sendMessage, isConnected, isThinking };
}
