'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Play, Trash2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';
import { fontManager, jsonToClip, Log, type IClip } from '@designcombo/video';
import { generateCaptionClips } from '@/lib/caption-generator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function PanelCaptions() {
  const { studio } = useStudioStore();
  const [mediaItems, setMediaItems] = useState<IClip[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [captionItems, setCaptionItems] = useState<IClip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!studio) return;

    const updateClips = () => {
      const tracks = studio.getTracks();
      const allClips: IClip[] = [];
      tracks.forEach((track) => {
        track.clipIds.forEach((id) => {
          const clip = studio.getClipById(id);
          if (clip) allClips.push(clip);
        });
      });

      const mediaClips = allClips.filter(
        (clip: IClip) => clip.type === 'Video' || clip.type === 'Audio'
      );
      setMediaItems(mediaClips);

      // If selected media is gone, reset selection
      if (
        selectedMediaId &&
        !mediaClips.find((m: IClip) => m.id === selectedMediaId)
      ) {
        setSelectedMediaId('');
      }

      // Find captions for selected media
      if (selectedMediaId) {
        const captions = allClips.filter(
          (clip: IClip) =>
            clip.type === 'Caption' && (clip as any).mediaId === selectedMediaId
        );
        setCaptionItems(
          captions.sort((a: IClip, b: IClip) => a.display.from - b.display.from)
        );
      } else {
        setCaptionItems([]);
      }
    };

    const handleTimeUpdate = ({ currentTime }: { currentTime: number }) => {
      setCurrentTime(currentTime);
    };

    updateClips();
    studio.on('clip:added', updateClips);
    studio.on('clip:removed', updateClips);
    studio.on('clip:updated', updateClips);
    studio.on('currentTime', handleTimeUpdate);

    return () => {
      studio.off('clip:added', updateClips);
      studio.off('clip:removed', updateClips);
      studio.off('clip:updated', updateClips);
      studio.off('currentTime', handleTimeUpdate);
    };
  }, [studio, selectedMediaId]);

  const handleSelectChange = (value: string) => {
    setSelectedMediaId(value);
  };

  const handleGenerateCaptions = async () => {
    if (!studio || !selectedMediaId) return;
    const mediaClip = mediaItems.find((m) => m.id === selectedMediaId);
    if (!mediaClip) return;

    setIsGenerating(true);
    try {
      // 1. Get transcription
      const audioUrl = (mediaClip as any).src;
      if (!audioUrl) throw new Error('Media source not found');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: audioUrl, model: 'nova-3' }),
      });

      if (!transcribeResponse.ok) throw new Error(`Transcription failed`);
      const transcriptionData = await transcribeResponse.json();

      // We don't need paragraph indexing anymore, just valid words
      const words =
        transcriptionData.results?.main?.words || transcriptionData.words || [];

      // 2. Load fonts
      const fontName = 'Bangers-Regular';
      const fontUrl =
        'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf';

      await fontManager.addFont({
        name: fontName,
        url: fontUrl,
      });

      // 3. Generate caption JSON
      const captionClipsJSON = await generateCaptionClips({
        videoWidth: (studio as any).opts.width,
        videoHeight: (studio as any).opts.height,
        words,
      });

      // 4. Add to studio
      const captionTrackId = `track_captions_${Date.now()}`;
      const clipsToAdd: IClip[] = [];

      for (const json of captionClipsJSON) {
        const enrichedJson = {
          ...json,
          mediaId: selectedMediaId,
          metadata: {
            ...json.metadata,
            sourceClipId: selectedMediaId,
          },
          display: {
            from: json.display.from + mediaClip.display.from,
            to: json.display.to + mediaClip.display.from,
          },
        };
        const clip = await jsonToClip(enrichedJson);
        clipsToAdd.push(clip);
      }

      if (clipsToAdd.length > 0) {
        await studio.addClip(clipsToAdd, { trackId: captionTrackId });
      }
    } catch (error) {
      Log.error('Failed to generate captions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateCaption = (id: string, text: string) => {
    if (!studio) return;
    // @ts-expect-error
    studio.updateClip(id, { text });
  };

  const handleDeleteCaption = (id: string) => {
    if (!studio) return;
    studio.removeClipById(id);
  };

  const handleSeek = (time: number) => {
    if (!studio) return;
    studio.seek(time);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-text-primary flex px-4 h-12 flex-none items-center text-sm font-medium">
        Captions
        <div className="flex-1" />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 overflow-hidden">
        {mediaItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground p-8">
            Add video or audio to the timeline to generate captions.
          </div>
        ) : (
          <>
            <Select value={selectedMediaId} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select media" />
              </SelectTrigger>
              <SelectContent>
                {mediaItems.map((item) => (
                  <SelectItem value={item.id} key={item.id}>
                    {(item as any).src?.split('/').pop() || item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!selectedMediaId ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground py-2">
                Select a video or audio clip to manage captions.
              </div>
            ) : captionItems.length > 0 ? (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-3">
                  <div className="flex flex-col gap-2 pb-4">
                    {captionItems.map((item) => (
                      <CaptionItem
                        key={item.id}
                        item={item}
                        isActive={
                          currentTime >= item.display.from &&
                          currentTime < item.display.to
                        }
                        onUpdate={(text) => handleUpdateCaption(item.id, text)}
                        onDelete={() => handleDeleteCaption(item.id)}
                        onSeek={() => handleSeek(item.display.from)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col gap-6 py-2 items-center text-center">
                <div className="text-sm text-muted-foreground">
                  Recognize speech in the selected media and generate captions
                  automatically.
                </div>
                <Button
                  onClick={handleGenerateCaptions}
                  variant="default"
                  className="w-full"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Captions'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CaptionItem({
  item,
  isActive,
  onUpdate,
  onDelete,
  onSeek,
}: {
  item: IClip;
  isActive: boolean;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onSeek: () => void;
}) {
  const [text, setText] = useState((item as any).text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText((item as any).text || '');
  }, [(item as any).text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    if (text !== (item as any).text) {
      onUpdate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current?.blur();
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-md p-3 transition-colors border-l-2',
        isActive
          ? 'bg-zinc-800/50 border-blue-500'
          : 'hover:bg-zinc-800/30 border-transparent'
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className="text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-white transition-colors"
          onClick={onSeek}
        >
          {formatTime(item.display.from / 1_000_000)} -{' '}
          {formatTime(item.display.to / 1_000_000)}
        </div>

        <div
          className={cn(
            'flex items-center gap-1 opacity-0 transition-opacity',
            isActive || 'group-hover:opacity-100'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onSeek();
            }}
          >
            <Play className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="min-h-[20px] p-0 resize-none border-none focus-visible:ring-0 bg-transparent text-sm leading-relaxed text-zinc-300 focus:text-white placeholder:text-zinc-600"
        rows={Math.max(1, Math.ceil(text.length / 40))}
      />
    </div>
  );
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hh = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  return `${hh}${mm}:${ss}`;
}
