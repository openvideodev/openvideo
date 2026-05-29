"use client";

import { useState } from "react";
import { useDirector } from "@/hooks/use-director";
import { IconSparkles2 } from "@tabler/icons-react";
import { ChatPanel } from "@/components/shared/chat-panel";
import { ChatHeader } from "@/components/shared/chat-header";
import { useProjectStore } from "@/stores/project-store";

export default function Assistant() {
  const spaceId = useProjectStore((state) => state.spaceId);
  const { messages, sendMessage, isConnected, isThinking } = useDirector(spaceId || "");
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim() && !isThinking) {
      sendMessage(input);
      setInput("");
    }
  };

  const emptyState = (
    <div className="flex flex-1 flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-24">
      <div className="flex items-center justify-center">
        <IconSparkles2 stroke={1} size={48} className="text-muted-foreground/50" />
      </div>
      <div className="text-center space-y-2 text-muted-foreground max-w-[300px]">
        <h2 className="text-xl font-semibold text-foreground/80">I'm your creative partner</h2>
        <p className="">Edit clips, add transitions, generate voiceovers, and more.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-card text-foreground text-sm overflow-hidden">
      <ChatHeader isConnected={isConnected} />

      <ChatPanel
        messages={messages}
        isThinking={isThinking}
        input={input}
        onInputChange={setInput}
        onSend={handleSubmit}
        placeholder="How can I help you edit?"
        emptyState={emptyState}
        className="flex-1 min-h-0"
      />
    </div>
  );
}
