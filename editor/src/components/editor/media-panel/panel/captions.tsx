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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Trash,
  MoreHorizontal,
  ChevronDown,
  Highlighter,
  Check,
  CheckCheck,
  X,
  ScanLine,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  addParagraphIndexToWords,
  buildParagraphsFromCaptions,
} from '@/utils/caption';

export default function PanelCaptions() {
  const { studio } = useStudioStore();
  const [mediaItems, setMediaItems] = useState<IClip[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [captionItems, setCaptionItems] = useState<IClip[]>([]);
  const [paragraphs, setParagraphs] = useState<any[]>([]);
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
        const paragraphs = buildParagraphsFromCaptions(captions);
        setParagraphs(paragraphs);
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
      const resultTranscription = addParagraphIndexToWords(transcriptionData);
      const words =
        resultTranscription.results?.main?.words ||
        resultTranscription.words ||
        [];

      // 2. Load fonts
      const fontName = 'Bangers-Regular';
      const fontUrl =
        'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf';

      // This should ideally come from a selected preset or configuration
      await fontManager.addFont({
        name: fontName,
        url: fontUrl,
      });

      // 3. Generate caption JSON is handled next...

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
        // Tag captions with sourceClipId for filtering and attach paragraphs
        const enrichedJson = {
          ...json,
          mediaId: selectedMediaId,
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

  const selectedMedia = mediaItems.find((m) => m.id === selectedMediaId);

  const handleUpdateParagraphs = async (
    newParagraphs: any[],
    _updates: { index: number; text: string }[]
  ) => {
    if (!studio || !selectedMediaId) return;

    try {
      // Find which paragraphs have actually changed by comparing text/words
      const changedParagraphs = newParagraphs.filter((newP, idx) => {
        const oldP = paragraphs[idx];
        if (!oldP) return true;

        // Simple string comparison as a first pass
        if (newP.text !== oldP.text) return true;

        // Deep compare words if text is same (e.g. timing changes, which shouldn't happen here but for safety)
        if (newP.words.length !== oldP.words.length) return true;
        return JSON.stringify(newP.words) !== JSON.stringify(oldP.words);
      });

      if (changedParagraphs.length === 0) return;

      const mediaClip = mediaItems.find((m) => m.id === selectedMediaId);
      const mediaFrom = mediaClip?.display.from || 0;

      // Find/create caption track
      const tracks = studio.getTracks();
      const existingCaptionTrack = tracks.find((t) =>
        t.id.startsWith('track_captions')
      );
      const captionTrackId =
        existingCaptionTrack?.id || `track_captions_${Date.now()}`;

      for (const p of changedParagraphs) {
        const paragraphIndex = p.paragraphIndex;

        // 1. Collect non-empty words for this paragraph
        const filteredWords = p.words
          .filter((w: any) => w.text && w.text.trim() !== '')
          .map((w: any) => ({
            ...w,
            start: w.start,
            end: w.end,
            text: w.text,
          }));

        // 2. Remove existing clips for this paragraph
        const clipsToRemove = captionItems.filter((c) => {
          const words = (c as any).opts?.words || [];
          return (
            (c as any).mediaId === selectedMediaId &&
            words.length > 0 &&
            words[0].paragraphIndex === paragraphIndex
          );
        });

        for (const clip of clipsToRemove) {
          await studio.removeClipById(clip.id);
        }

        if (filteredWords.length > 0) {
          // 3. Generate new clips just for this paragraph
          const captionClipsJSON = await generateCaptionClips({
            videoWidth: (studio as any).opts.width,
            videoHeight: (studio as any).opts.height,
            words: filteredWords,
          });

          // 4. Add them back
          for (const json of captionClipsJSON) {
            const enrichedJson = {
              ...json,
              mediaId: selectedMediaId,
              metadata: {
                ...json.metadata,
                sourceClipId: selectedMediaId,
              },
              display: {
                from: json.display.from + mediaFrom,
                to: json.display.to + mediaFrom,
              },
            };
            const clip = await jsonToClip(enrichedJson);
            await studio.addClip(clip, { trackId: captionTrackId });
          }
        }
      }

      // Local state will be updated by the updateClips effect
    } catch (e) {
      console.error('Failed to update affected caption paragraphs', e);
    }
  };

  return (
    <div className="px-4 h-full">
      <div className="text-text-primary flex h-12 flex-none items-center text-sm font-medium">
        Captions
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
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2">
                    {/* Check if we have paragraph data available on the first clip */}
                    {paragraphs ? (
                      <ParagraphView
                        paragraphs={paragraphs}
                        currentTime={currentTime}
                        onSeek={(time) => studio?.seek(time * 1000000)}
                        onUpdateParagraphs={(newParagraphs, updates) =>
                          handleUpdateParagraphs(newParagraphs, updates)
                        }
                      />
                    ) : (
                      captionItems.map((item) => (
                        <CaptionItem
                          key={item.id}
                          item={item}
                          isActive={
                            currentTime >= item.display.from &&
                            currentTime < item.display.to
                          }
                          onClick={() => studio?.seek(item.display.from)}
                        />
                      ))
                    )}
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

function ParagraphView({
  paragraphs,
  currentTime,
  onSeek,
  onUpdateParagraphs,
}: {
  paragraphs: any[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateParagraphs: (
    newParagraphs: any[],
    updates: { index: number; text: string }[]
  ) => void;
}) {
  const { studio } = useStudioStore();
  // Current time is in microseconds, paragraphs use microseconds in from/to
  const timeInMicroseconds = currentTime;

  // Selection state
  const [selectionRange, setSelectionRange] = useState<{
    start: number; // global index
    end: number; // global index
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');

  // Global mouse up listener to ensure isDragging is always reset
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setAnchorIndex(null);

        // Finalize selection text for editing if needed
        if (selectionRange) {
          let text = '';
          let gIdx = 0;
          const min = Math.min(selectionRange.start, selectionRange.end);
          const max = Math.max(selectionRange.start, selectionRange.end);

          if (min === max) {
            // Single word
            text = getWordAtGlobalIndex(min);
          } else {
            // Multi word
            paragraphs.forEach((p: any) =>
              p.words.forEach((w: any) => {
                if (gIdx >= min && gIdx <= max) {
                  const wordText = w.text || '';
                  if (wordText) text += (text ? ' ' : '') + wordText;
                }
                gIdx++;
              })
            );
          }
          setEditText(text);
        }
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, selectionRange, paragraphs]);

  const getGlobalWordIndex = (pIdx: number, wIdx: number) => {
    let globalIndex = 0;
    for (let i = 0; i < pIdx; i++) {
      globalIndex += paragraphs[i].words.length;
    }
    return globalIndex + wIdx;
  };

  const getWordAtGlobalIndex = (idx: number) => {
    let currentIdx = 0;
    for (const p of paragraphs) {
      for (const w of p.words) {
        if (currentIdx === idx) return w.text || '';
        currentIdx++;
      }
    }
    return '';
  };

  const handleApply = () => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minIdx = Math.min(start, end);
    const maxIdx = Math.max(start, end);

    const newParagraphs = JSON.parse(JSON.stringify(paragraphs));
    const updates: { index: number; text: string }[] = [];

    let globalIdx = 0;
    newParagraphs.forEach((p: any) => {
      p.words.forEach((wordObj: any) => {
        const currentGlobalIdx = globalIdx++;
        if (currentGlobalIdx === minIdx) {
          updates.push({ index: currentGlobalIdx, text: editText });
          wordObj.text = editText;
        } else if (currentGlobalIdx > minIdx && currentGlobalIdx <= maxIdx) {
          updates.push({ index: currentGlobalIdx, text: '' });
          wordObj.text = '';
        }
      });
      p.text = p.words.map((w: any) => w.text).join(' ');
    });

    onUpdateParagraphs(newParagraphs, updates);
    setEditMode(false);
    setSelectionRange(null);
  };

  const countOccurrences = () => {
    if (!selectionRange || selectionRange.start !== selectionRange.end)
      return 0;
    const targetWord = getWordAtGlobalIndex(selectionRange.start);
    if (!targetWord) return 0;

    let count = 0;
    paragraphs.forEach((p: any) => {
      p.words.forEach((w: any) => {
        if (w.text === targetWord) count++;
      });
    });
    return count;
  };

  const handleApplyAll = () => {
    if (!selectionRange || selectionRange.start !== selectionRange.end) return;

    const targetWord = getWordAtGlobalIndex(selectionRange.start);
    if (!targetWord) return;

    const newParagraphs = JSON.parse(JSON.stringify(paragraphs));
    const updates: { index: number; text: string }[] = [];

    let globalIdx = 0;
    newParagraphs.forEach((p: any) => {
      p.words.forEach((wordObj: any) => {
        const currentGlobalIdx = globalIdx++;
        if (wordObj.text === targetWord) {
          updates.push({ index: currentGlobalIdx, text: editText });
          wordObj.text = editText;
        }
      });
      p.text = p.words.map((w: any) => w.text).join(' ');
    });

    onUpdateParagraphs(newParagraphs, updates);
    setEditMode(false);
    setSelectionRange(null);
  };

  const handleRemoveCaption = () => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minIdx = Math.min(start, end);
    const maxIdx = Math.max(start, end);

    const newParagraphs = JSON.parse(JSON.stringify(paragraphs));
    const updates: { index: number; text: string }[] = [];

    let globalIdx = 0;
    newParagraphs.forEach((p: any) => {
      p.words.forEach((wordObj: any) => {
        const currentGlobalIdx = globalIdx++;
        if (currentGlobalIdx >= minIdx && currentGlobalIdx <= maxIdx) {
          updates.push({ index: currentGlobalIdx, text: '' });
          wordObj.text = '';
        }
      });
      p.text = p.words.map((w: any) => w.text).join(' ');
    });

    onUpdateParagraphs(newParagraphs, updates);
    setSelectionRange(null);
  };

  const handleRemoveCaptionAndVideo = async () => {
    if (!selectionRange || !studio) return;
    const { start, end } = selectionRange;
    const minIdx = Math.min(start, end);
    const maxIdx = Math.max(start, end);

    // Flatten all words to find the ones in range
    const allWords: any[] = [];
    paragraphs.forEach((p) => allWords.push(...p.words));

    const selectedWords = allWords.slice(minIdx, maxIdx + 1);
    if (selectedWords.length === 0) {
      setSelectionRange(null);
      return;
    }

    // The time range to delete is from the start of first word to end of last word
    const firstWord = selectedWords[0];
    const lastWord = selectedWords[selectedWords.length - 1];

    const fromUs = firstWord.absFrom;
    const toUs = lastWord.absTo;

    try {
      // 1. Perform ripple delete on the timeline
      await (studio.timeline as any).rippleDelete(fromUs, toUs);

      // 2. The updateClips effect will handle refreshing the paragraphs state
    } catch (e) {
      console.error('Failed to remove caption and video:', e);
    } finally {
      setSelectionRange(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((paragraph, index) => {
        // paragraph.from and paragraph.to are in microseconds
        const isActive =
          timeInMicroseconds >= paragraph.from &&
          timeInMicroseconds < paragraph.to;

        return (
          <div
            key={index}
            className={`flex flex-col gap-2 rounded-lg p-3 transition-colors ${
              isActive
                ? 'bg-primary/5 border border-primary/20'
                : 'bg-muted/30 border border-transparent hover:bg-muted/50'
            }`}
          >
            <div
              className="text-xs font-mono opacity-70 cursor-pointer hover:underline"
              onClick={() => onSeek(paragraph.from / 1000000)}
            >
              {formatTime(paragraph.from / 1000000)} -{' '}
              {formatTime(paragraph.to / 1000000)}
            </div>
            <div className="text-sm leading-relaxed">
              <span className="flex flex-wrap gap-y-1">
                {paragraph.words.map((wordObj: any, wordIdx: number) => {
                  const globalIdx = getGlobalWordIndex(index, wordIdx);
                  const word = wordObj.text || '';

                  const isInRange =
                    selectionRange &&
                    globalIdx >=
                      Math.min(selectionRange.start, selectionRange.end) &&
                    globalIdx <=
                      Math.max(selectionRange.start, selectionRange.end);

                  const minRange = selectionRange
                    ? Math.min(selectionRange.start, selectionRange.end)
                    : -1;
                  const maxRange = selectionRange
                    ? Math.max(selectionRange.start, selectionRange.end)
                    : -1;
                  const isStartRange = isInRange && globalIdx === minRange;
                  const isEndRange = isInRange && globalIdx === maxRange;

                  // Check if the next word is also in range for highlighting the space
                  const isNextInRange =
                    selectionRange &&
                    globalIdx + 1 >= minRange &&
                    globalIdx + 1 <= maxRange &&
                    globalIdx < maxRange;

                  const isSelected =
                    !!selectionRange && globalIdx === selectionRange.start;

                  const roundingClass =
                    !selectionRange || minRange === maxRange
                      ? 'rounded-sm'
                      : isStartRange
                        ? 'rounded-l-sm rounded-r-none'
                        : isEndRange
                          ? 'rounded-r-sm rounded-l-none'
                          : 'rounded-none';

                  return (
                    <span key={wordIdx} className="inline-flex items-center">
                      <Popover
                        open={isSelected && !isDragging}
                        onOpenChange={(open) => {
                          if (!open && !editMode) {
                            setSelectionRange(null);
                          }
                        }}
                      >
                        <PopoverAnchor asChild>
                          <span
                            className={`cursor-pointer transition-colors px-[2px] ${roundingClass} hover:bg-neutral-700/50 select-none ${
                              isInRange
                                ? 'bg-neutral-700/50 text-white'
                                : 'text-muted-foreground hover:text-white'
                            }`}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsDragging(true);
                              setAnchorIndex(globalIdx);
                              setSelectionRange({
                                start: globalIdx,
                                end: globalIdx,
                              });
                              setEditText(word);
                              setEditMode(false);
                              if (wordObj.absFrom) {
                                onSeek(wordObj.absFrom / 1000000);
                              }
                            }}
                            onMouseEnter={() => {
                              if (isDragging && anchorIndex !== null) {
                                setSelectionRange({
                                  start: anchorIndex,
                                  end: globalIdx,
                                });
                              }
                            }}
                          >
                            {word || '\u00A0'}
                          </span>
                        </PopoverAnchor>
                        <PopoverContent
                          className="w-auto p-2 bg-[#1e1e1e] border-[#333] text-white flex flex-col gap-2 shadow-xl z-[9999]"
                          side="top"
                          sideOffset={5}
                          onInteractOutside={(e) => {
                            if (editMode) e.preventDefault();
                          }}
                        >
                          {editMode ? (
                            <>
                              {selectionRange &&
                              selectionRange.start !== selectionRange.end ? (
                                <Textarea
                                  autoFocus
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="bg-neutral-800 text-white border-[#333] rounded-sm px-2 py-1 h-auto min-h-[80px] w-[240px] outline-none resize-none"
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === 'Enter' &&
                                      (e.metaKey || e.ctrlKey)
                                    )
                                      handleApply();
                                    if (e.key === 'Escape') setEditMode(false);
                                  }}
                                />
                              ) : (
                                <Input
                                  autoFocus
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="bg-neutral-800 text-white border-[#333] rounded-sm px-2 py-1 h-8 w-[240px] outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleApply();
                                    if (e.key === 'Escape') setEditMode(false);
                                  }}
                                />
                              )}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleApply}
                                  className="h-7 px-2 text-xs hover:bg-[#333] hover:text-green-400 gap-1"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Apply
                                </Button>
                                {selectionRange?.start ===
                                  selectionRange?.end && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleApplyAll}
                                    className="h-7 px-2 text-xs hover:bg-[#333] hover:text-blue-400 gap-1"
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Apply to everywhere ({countOccurrences()})
                                  </Button>
                                )}
                                <div className="w-[1px] h-4 bg-[#333] mx-1" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditMode(false)}
                                  className="h-7 px-2 text-xs hover:bg-[#333] hover:text-red-400 gap-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:bg-[#333] hover:text-white gap-1"
                              >
                                Add <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditMode(true);
                                }}
                                className="h-7 px-2 text-xs hover:bg-[#333] hover:text-white"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:bg-[#333] hover:text-white"
                              >
                                Timing
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:bg-[#333] hover:text-white gap-1"
                              >
                                Highlight <ChevronDown className="h-3 w-3" />
                              </Button>
                              <div className="w-[1px] h-4 bg-[#333] mx-1" />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-auto px-1 hover:bg-[#333] hover:text-red-400 gap-1"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#1e1e1e] border-[#333] text-white">
                                  <DropdownMenuItem
                                    className="text-xs hover:bg-[#333] cursor-pointer gap-2"
                                    onClick={handleRemoveCaptionAndVideo}
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                    Remove caption & video
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs hover:bg-[#333] cursor-pointer gap-2"
                                    onClick={handleRemoveCaption}
                                  >
                                    <ScanLine className="h-3.5 w-3.5" />
                                    Remove caption
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-[#333] hover:text-white"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      {/* {isNextInRange ? (
                        <span className="bg-neutral-700/50 w-[4px] h-[1.25em] inline-block" />
                      ) : (
                        <span className="w-1 inline-block" />
                      )} */}
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        );
      })}
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
