"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import type { Message } from "@/hooks/use-director";

interface ChatPanelProps {
  messages: Message[];
  isThinking: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ChatPanel({
  messages,
  isThinking,
  input,
  onInputChange,
  onSend,
  placeholder = "How can I help you?",
  emptyState,
  className,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.closest("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isThinking]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {messages.length === 0 ? (
        <div className="flex-1">
          {emptyState ?? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-24 px-6 text-center">
              <p className="text-muted-foreground text-sm">Start a conversation</p>
            </div>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0 h-full">
          <div
            ref={scrollRef}
            className="min-h-full flex flex-col overflow-x-hidden p-4 md:p-6 space-y-4"
          >
            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={cn(
                  "flex gap-3 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col space-y-1 max-w-[95%]",
                    m.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "py-2.5 px-4 rounded-2xl text-[14px] leading-relaxed transition-all whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-zinc-700/35 text-zinc-100 rounded-tr-none border border-zinc-600/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-medium"
                        : m.type === "plan"
                          ? "bg-amber-950/50 border border-amber-700/30 text-amber-200/90 rounded-tl-none font-mono text-xs shadow-sm"
                          : "bg-secondary/40 text-foreground/90 rounded-tl-none border border-border/50",
                    )}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className="w-full grid overflow-hidden prose prose-sm dark:prose-invert prose-p:text-foreground/85 prose-strong:text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ className: cn2, ...props }) => (
                              <p className={cn("mb-0 last:mb-0", cn2)} {...props} />
                            ),
                            ul: ({ className: cn2, ...props }) => (
                              <ul className={cn("my-2 ml-4 list-disc", cn2)} {...props} />
                            ),
                            ol: ({ className: cn2, ...props }) => (
                              <ol className={cn("my-2 ml-4 list-decimal", cn2)} {...props} />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="py-2 px-1 flex items-center gap-2.5">
                  <div className="flex gap-[5px]">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    Thinking
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <div className="p-4 md:p-3 pt-0 space-y-4 shrink-0">
        <HoverBorderGradient containerClassName="rounded-sm w-full" className="w-full bg-card">
          <InputGroup
            className="rounded-sm border-none has-disabled:opacity-100"
            style={{ backgroundColor: "#141414" }}
          >
            <InputGroupTextarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-16 max-h-[200px] border-none focus-visible:ring-0"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="ghost" className="rounded-lg text-foreground">
                <PaperclipIcon className="w-4 h-4" />
              </InputGroupButton>
              <InputGroupButton
                variant="default"
                className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
                size="icon-xs"
                onClick={onSend}
                disabled={!input.trim() || isThinking}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </HoverBorderGradient>
      </div>
    </div>
  );
}
