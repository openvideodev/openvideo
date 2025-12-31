'use client';

import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { CaptionClip, fontManager, Log, jsonToClip } from '@designcombo/video';
import { generateCaptionClips } from '@/lib/caption-generator';

export default function PanelCaptions() {
  const { studio } = useStudioStore();

  const handleAddCaption = async () => {
    if (!studio) return;

    try {
      const DATA_CAPTIONS = [
        {
          text: 'hello world this is a test',
          words: [
            { text: 'hello', from: 0, to: 200, isKeyWord: true },
            { text: 'world', from: 200, to: 400, isKeyWord: false },
            { text: 'this', from: 400, to: 600, isKeyWord: false },
            { text: 'is', from: 600, to: 750, isKeyWord: false },
            { text: 'a', from: 750, to: 850, isKeyWord: false },
            { text: 'test', from: 850, to: 1000, isKeyWord: true },
          ],
          from: 0,
          to: 1000,
        },
      ];

      await fontManager.loadFonts([
        {
          name: 'Bangers-Regular',
          url: 'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
        },
      ]);

      const captionClips: CaptionClip[] = [];
      for (const segment of DATA_CAPTIONS) {
        const captionClip = new CaptionClip(segment.text, {
          fontSize: 48,
          fontFamily: 'Bangers-Regular',
          fontUrl:
            'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
          fontWeight: '700',
          fontStyle: 'normal',
          fill: '#ffffff',
          align: 'center',
          stroke: { color: '#000000', width: 4 },
          dropShadow: {
            color: '#17e64e',
            alpha: 0.5,
            blur: 4,
            angle: Math.PI / 4,
            distance: 4,
          },
          caption: {
            words: segment.words.map((word) => ({
              text: word.text.toUpperCase(),
              from: word.from,
              to: word.to,
              isKeyWord: word.isKeyWord,
            })),
            colors: {
              appeared: '#ffffff',
              active: '#ffffff',
              activeFill: '#FF5700',
              background: '',
              keyword: '#ffffff',
            },
            preserveKeywordColor: true,
            positioning: {
              videoWidth: 1280,
              videoHeight: 720,
              bottomOffset: 30,
            },
          },
        });

        captionClip.display.from = segment.from * 1000;
        captionClip.duration = segment.to * 1000 - segment.from * 1000;
        captionClip.display.to = segment.to * 1000;

        captionClips.push(captionClip);
      }

      for (const captionClip of captionClips) {
        await studio.addClip(captionClip);
      }
    } catch (error) {
      Log.error('Failed to add captions:', error);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!studio) return;

    try {
      const audioUrl = 'https://cdn.designcombo.dev/preset76.mp3';

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: audioUrl, model: 'nova-3' }),
      });

      if (!transcribeResponse.ok) throw new Error(`Transcription failed`);

      const transcriptionData = await transcribeResponse.json();
      await fontManager.loadFonts([
        {
          name: 'Bangers-Regular',
          url: 'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
        },
      ]);

      const words =
        transcriptionData.results?.main?.words || transcriptionData.words || [];
      const captionClipsJSON = await generateCaptionClips({
        videoWidth: 1080,
        videoHeight: 1920,
        words,
      });

      const captionTrackId = `track_captions_${Date.now()}`;
      for (const json of captionClipsJSON) {
        const clip = await jsonToClip(json);
        await studio.addClip(clip, { trackId: captionTrackId });
      }
    } catch (error) {
      Log.error('Failed to generate captions:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="font-bold text-lg mb-2">Captions</div>
      <div className="flex flex-col gap-2">
        <Button onClick={handleAddCaption}>Add Caption</Button>
        <Button onClick={handleGenerateCaptions}>Generate Captions</Button>
      </div>
    </div>
  );
}
