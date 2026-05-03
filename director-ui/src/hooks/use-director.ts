'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'plan' | 'patch';
  payload?: any;
}

export function useDirector(projectId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const url = `ws://localhost:4000/ws?projectId=${projectId}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to Director');
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from Director');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      if (data.type === 'chat.response') {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            content: data.message,
          },
        ]);
      } else if (data.type === 'plan.created') {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            content: `Plan created: ${data.plan.description}`,
            type: 'plan',
            payload: data.plan,
          },
        ]);
      } else if (data.type === 'patch') {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: 'system',
            content: `Project updated: ${data.patch.length} changes applied`,
            type: 'patch',
            payload: data.patch,
          },
        ]);
      }
    };

    return () => {
      socket.close();
    };
  }, [projectId]);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          event: 'chat',
          data: { message: text },
        })
      );
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'user',
          content: text,
        },
      ]);
    }
  }, []);

  return { messages, sendMessage, isConnected };
}
