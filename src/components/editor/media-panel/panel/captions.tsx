'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';
import { fontManager, jsonToClip, Log, type IClip } from '@designcombo/video';
import { generateCaptionClips } from '@/lib/caption-generator';

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
            clip.type === 'Caption' &&
            (clip as any).metadata?.sourceClipId === selectedMediaId
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
      const words =
        transcriptionData.results?.main?.words || transcriptionData.words || [];

      // 2. Load fonts
      await fontManager.loadFonts([
        {
          name: 'Bangers-Regular',
          url: 'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
        },
      ]);

      // 3. Generate caption JSON
      const captionClipsJSON = await generateCaptionClips({
        videoWidth: (studio as any).opts.width,
        videoHeight: (studio as any).opts.height,
        words,
      });

      // 4. Add to studio
      const captionTrackId = `track_captions_${Date.now()}`;
      for (const json of captionClipsJSON) {
        // Tag captions with sourceClipId for filtering
        const enrichedJson = {
          ...json,
          metadata: {
            ...json.metadata,
            sourceClipId: selectedMediaId,
          },
          // Offset caption display by media start time if needed
          // Assuming words are relative to audio start
          display: {
            from: json.display.from + mediaClip.display.from,
            to: json.display.to + mediaClip.display.from,
          },
        };
        const clip = await jsonToClip(enrichedJson);
        await studio.addClip(clip, { trackId: captionTrackId });
      }
    } catch (error) {
      Log.error('Failed to generate captions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedMedia = mediaItems.find((m) => m.id === selectedMediaId);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden h-full">
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
              <SelectContent className="z-[200]">
                {mediaItems.map((item) => (
                  <SelectItem value={item.id} key={item.id}>
                    {(item as any).src?.split('/').pop() || item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!selectedMediaId ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground p-8">
                Select a video or audio clip to manage captions.
              </div>
            ) : captionItems.length > 0 ? (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="flex flex-col gap-2">
                    {captionItems.map((item) => (
                      <CaptionItem
                        key={item.id}
                        item={item}
                        isActive={
                          currentTime >= item.display.from &&
                          currentTime <= item.display.to
                        }
                        onClick={() => studio?.seek(item.display.from)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-8 items-center text-center">
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
  onClick,
}: {
  item: IClip;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg p-3 transition-colors cursor-pointer border ${
        isActive
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground'
      }`}
      onClick={onClick}
    >
      <div className="text-[10px] font-mono opacity-70">
        {formatTime(item.display.from / 1000000)} -{' '}
        {formatTime(item.display.to / 1000000)}
      </div>
      <div
        className={`text-xs leading-relaxed font-medium ${
          isActive ? 'text-foreground' : ''
        }`}
      >
        {(item as any).text}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const hh = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  const mms = ms.toString().padStart(2, '0');

  return `${hh}${mm}:${ss}.${mms}`;
}
