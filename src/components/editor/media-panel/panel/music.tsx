'use client';

import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { AudioClip, Log } from '@designcombo/video';

export default function PanelMusic() {
  const { studio } = useStudioStore();

  const handleAddAudio = async () => {
    if (!studio) return;

    try {
      const audioUrl = 'https://cdn.designcombo.dev/preset76.mp3';
      const audioClip = await AudioClip.fromUrl(audioUrl);

      await studio.addClip(audioClip, audioUrl);
    } catch (error) {
      Log.error('Failed to add audio:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="font-bold text-lg mb-2">Music</div>
      <div className="flex flex-col gap-2">
        <Button onClick={handleAddAudio}>Add Audio</Button>
      </div>
    </div>
  );
}
