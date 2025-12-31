'use client';

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import {
  useChatRuntime,
  AssistantChatTransport,
} from '@assistant-ui/react-ai-sdk';
import { Thread } from '@/components/assistant-ui/thread';

export const Assistant = () => {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex-1 overflow-hidden bg-panel h-[calc(100vh-3.2rem)]">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
