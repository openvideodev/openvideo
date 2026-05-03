'use client';

import { useState, useRef, useEffect } from 'react';
import { useDirector } from '@/hooks/use-director';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatInterface({ projectId }: { projectId: string }) {
  const { messages, sendMessage, isConnected } = useDirector(projectId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <Card className="flex flex-col h-[700px] w-full max-w-2xl mx-auto border-none bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/20">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">AI Director</CardTitle>
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500")} />
              <span className="text-[10px] font-medium uppercase tracking-widest opacity-60">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer border-none py-1 px-3">
          <Sparkles className="w-3 h-3 mr-1.5 text-amber-400" />
          <span className="text-[11px]">Pro Mode</span>
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="h-full px-6 py-6">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4 opacity-40">
                <div className="p-4 bg-white/5 rounded-full">
                  <Wand2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">Ask me to edit your video or create a clip</p>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className={cn(
                  "w-8 h-8 border shadow-sm",
                  message.role === 'user' ? "border-indigo-500/20" : "border-purple-500/20"
                )}>
                  <AvatarFallback className={cn(
                    "font-bold text-[10px]",
                    message.role === 'user' ? "bg-indigo-500/10 text-indigo-600" : "bg-purple-500/10 text-purple-600"
                  )}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  message.role === 'user' 
                    ? "bg-indigo-500 text-white rounded-tr-none" 
                    : message.type === 'plan'
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100 rounded-tl-none font-mono text-xs"
                      : message.type === 'patch'
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 rounded-tl-none italic text-[11px]"
                        : "bg-white/60 dark:bg-white/10 backdrop-blur-sm border border-white/20 rounded-tl-none"
                )}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="px-6 py-6 border-t border-white/10 bg-white/20 dark:bg-black/20">
        <div className="relative w-full flex items-center gap-2 group">
          <Input
            placeholder="Type your editing instruction..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 h-12 bg-white/40 dark:bg-white/5 border-none rounded-2xl px-4 pr-12 focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all shadow-inner"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-1.5 h-9 w-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
