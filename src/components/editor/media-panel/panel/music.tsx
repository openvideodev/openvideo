'use client';

import { useStudioStore } from '@/stores/studio-store';
import { AudioClip, Log } from '@designcombo/video';
import { useGeneratedStore } from '@/stores/generated-store';
import { IconMusic } from '@tabler/icons-react';
import { AudioItem } from './audio-item';
import { useState } from 'react';
import { MusicChatPanel } from '../music-chat-panel';

export default function PanelMusic() {
  const { studio } = useStudioStore();
  const { music } = useGeneratedStore();
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleAddAudio = async (url: string) => {
    if (!studio) return;

    try {
      const audioClip = await AudioClip.fromUrl(url);
      await studio.addClip(audioClip, url);
    } catch (error) {
      Log.error('Failed to add audio:', error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {music.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-4">
            <IconMusic className="size-7 text-muted-foreground" stroke={1.5} />
            <div className="text-center text-muted-foreground text-sm">
              No music generated yet. Use the chat panel to generate some!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {music.map((item) => (
              <AudioItem
                key={item.id}
                item={item}
                onAdd={handleAddAudio}
                playingId={playingId}
                setPlayingId={setPlayingId}
              />
            ))}
          </div>
        )}
      </div>
      <div className="h-2 bg-background"></div>
      <div className="h-48">
        <MusicChatPanel />
      </div>
    </div>
  );
}
