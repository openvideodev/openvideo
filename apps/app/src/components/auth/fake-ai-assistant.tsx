"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSparkles,
  IconX,
  IconSend,
  IconRefresh,
  IconPlus,
  IconPaperclip,
  IconArrowUp,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAKE_MESSAGES = [
  { id: 1, text: "Afternoon, how can we help?", isUser: false },
  { id: 2, text: "I want to create a video ad for my product", isUser: true },
  { id: 3, text: "Great! What's your product and target audience?", isUser: false },
  { id: 4, text: "It's a skincare cream for women 25-40", isUser: true },
  { id: 5, text: "Perfect! Let me generate some concepts for you...", isUser: false, typing: true },
];

export function FakeAIAssistant() {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([1]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (currentIndex >= FAKE_MESSAGES.length) return;

    const timer = setTimeout(() => {
      const nextMessage = FAKE_MESSAGES[currentIndex];

      if (nextMessage.isUser) {
        // Show user message after a delay
        setVisibleMessages((prev) => [...prev, nextMessage.id]);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Show typing indicator then AI message
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, nextMessage.id]);
          setCurrentIndex((prev) => prev + 1);
        }, 1500);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Reset animation loop
  useEffect(() => {
    if (currentIndex >= FAKE_MESSAGES.length) {
      const resetTimer = setTimeout(() => {
        setVisibleMessages([1]);
        setCurrentIndex(1);
        setIsTyping(false);
      }, 4000);
      return () => clearTimeout(resetTimer);
    }
  }, [currentIndex]);

  return (
    <div className="w-full h-full flex flex-col bg-card/20 border-border/30 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm tracking-wide font-medium">AI Assistant</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
              )}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span className="sr-only">New chat</span>
          </Button>
        </div>
      </div>

      {/* Chat - Skeleton/Placeholder Style */}
      <div className="flex-1 p-4 space-y-6 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {FAKE_MESSAGES.filter((m) => visibleMessages.includes(m.id)).map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.isUser ? 20 : -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              {message.isUser ? (
                <div className="bg-muted/40 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] space-y-2">
                  <div className="h-2.5 w-40 bg-muted-foreground/20 rounded-full" />
                  <div className="h-2.5 w-32 bg-muted-foreground/20 rounded-full" />
                </div>
              ) : (
                <div className="space-y-2 max-w-[85%]">
                  <div className="h-2 w-48 bg-muted-foreground/15 rounded-full" />
                  <div className="h-2 w-40 bg-muted-foreground/15 rounded-full" />
                  <div className="h-2 w-24 bg-muted-foreground/15 rounded-full" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-muted-foreground/60"
            >
              <svg
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
              <span className="text-xs">Planning the next effect...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 pt-0 space-y-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-3 bg-muted/50 rounded-sm border border-border/50">
          <span className="text-sm text-muted-foreground flex-1">Ask me anything...</span>
          <Button variant="ghost" className="h-7 w-7 p-0 rounded-lg text-foreground">
            <IconPaperclip className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background h-7 w-7 p-0"
            size="icon"
          >
            <IconArrowUp className="w-4 h-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
