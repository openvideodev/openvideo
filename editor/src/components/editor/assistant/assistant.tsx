'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpIcon, Wand2, RefreshCw, SquarePen, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { projectStore } from '@/lib/project';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from 'zustand';
import { IClip } from '@/types/timeline';
import { ImportAsset } from '@/genkit/type';
import { Icons } from '@/components/shared/icons';

interface Message {
  role: 'user' | 'model';
  content: string;
  status?: string;
}

interface Suggestion {
  icon?: React.ReactNode;
  text: string;
}

const SUGGESTIONS: Suggestion[] = [
  { text: 'Search and add futurist city video' },
  { text: 'Generate voiceover "Welcome"' },
  { text: 'Auto-caption video' },
  { text: 'Make text yellow and bigger' },
];

export default function Assistant() {
  const clips = useStore(projectStore, (s) => s.clips);
  const selectedClipIds = useStore(projectStore, (s) => s.selectedIds);
  const tracks = useStore(projectStore, (s) => s.tracks);
  const getClip = (id: string) => projectStore.getState().clips[id];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mapClipsToAssets = useCallback(
    (clipArray: IClip[]): ImportAsset[] => {
      return clipArray.map((clip) => {
        const track = tracks.find((t) => t.clipIds.includes(clip.id));
        const trackId = track ? track.id : `unknown_track`;

        const assetType = clip.type.toLowerCase();
        const textContent =
          clip.text || (clip as any)._text || clip.caption?.text || '';

        return {
          assetId: clip.id,
          type: 'import',
          assetType: assetType === 'caption' ? 'text' : assetType,
          text: textContent,
          url: clip.src || '',
          label: clip.name || `Clip ${clip.id}`,
          trackId,
          display: {
            from: clip.display.from / 1000,
            to: clip.display.to / 1000,
          },
          trim: clip.trim
            ? {
                from: clip.trim.from / 1000,
                to: clip.trim.to / 1000,
              }
            : undefined,
        };
      });
    },
    [tracks]
  );

  const selectedAssets = useMemo(() => {
    const selectedClips = selectedClipIds
      .map(getClip)
      .filter(Boolean) as IClip[];
    return mapClipsToAssets(selectedClips);
  }, [selectedClipIds, getClip, mapClipsToAssets]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        const scrollElement = scrollRef.current?.closest(
          '[data-radix-scroll-area-viewport]'
        );
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  const handleSubmit = async (suggestionText?: string) => {

  };

  const handleToolAction = async (input: any, engine: any) => {
   
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.text);
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-sm tracking-wide">Director</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="sr-only">New chat</span>
          </Button>
        </div>
      </div>
      {messages.length === 0?  <div className='flex-1 items-center flex justify-center'>
       <div className="flex flex-1 flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700  pb-24">
              <div className="flex items-center justify-center w-16 h-16">
                <Icons.sparkle className="w-12 h-12 text-muted-foreground/90" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">
                  I'm ILO, your AI assistant
                </h2>
                <p className="text-muted-foreground">
                  What can I help you with?
                </p>
              </div>

            </div>
      </div>:    <ScrollArea className="flex-1 min-h-0 h-full">
        <div
          ref={scrollRef}
          className="min-h-full flex flex-col overflow-x-hidden p-4 md:p-6 space-y-2"
        >
           <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300',
                    m.role === 'user'
                      ? 'flex-row-reverse'
                      : 'flex-row max-w-[90%]'
                  )}
                >
                  <div
                    className={cn(
                      'flex flex-col space-y-3 w-full min-w-0',
                      m.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm transition-all min-w-0 flex flex-col',
                        m.role === 'user'
                          ? 'bg-foreground/10 rounded-tr-none font-medium px-5'
                          : 'bg-card text-card-foreground rounded-tl-none w-full px-5'
                      )}
                    >
                      <div className="w-full grid overflow-hidden">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ className, ...props }) => (
                              <h1
                                className={cn(
                                  'scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            h2: ({ className, ...props }) => (
                              <h2
                                className={cn(
                                  'mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            h3: ({ className, ...props }) => (
                              <h3
                                className={cn(
                                  'mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            p: ({ className, ...props }) => (
                              <p
                                className={cn(
                                  'leading-7 not-first:mt-6',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            ul: ({ className, ...props }) => (
                              <ul
                                className={cn(
                                  'my-6 ml-6 list-disc [&>li]:mt-2',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            ol: ({ className, ...props }) => (
                              <ol
                                className={cn(
                                  'my-6 ml-6 list-decimal [&>li]:mt-2',
                                  className
                                )}
                                {...props}
                              />
                            ),
                            code: ({ className, children, ...props }) => {
                              const isInline =
                                !className?.includes('language-');
                              return (
                                <code
                                  className={cn(
                                    isInline &&
                                      'bg-muted px-1.5 py-0.5 rounded font-mono text-sm',
                                    className
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ className, ...props }) => (
                              <pre
                                className={cn(
                                  'overflow-x-auto rounded-lg bg-black p-4 text-white my-4',
                                  className
                                )}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col space-y-3 w-full min-w-0 items-start">
                    <div className="py-0 px-5 rounded-3xl text-[15px] leading-relaxed shadow-sm bg-card text-card-foreground rounded-tl-none w-fit">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                        </div>
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                          Thinking
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </ScrollArea>}
    
   

      <div className="p-4 md:p-2 space-y-4 shrink-0">
        <InputGroup className="rounded-sm">
          <InputGroupTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask Co-Creator"
            className="min-h-16 max-h-[200px]"
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="ghost"
              className="rounded-lg"
              onClick={() => setShowSuggestions(!showSuggestions)}
              disabled={isLoading}
            >
              <Wand2 className="w-4 h-4" />
              <span className="ml-1 text-xs">Suggestions</span>
            </InputGroupButton>
            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
              size="icon-xs"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
            >
              <ArrowUpIcon className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
