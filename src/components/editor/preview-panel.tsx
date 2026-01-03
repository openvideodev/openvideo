import { useEffect, useRef, useState } from 'react';
import { Player } from './player';
import {
  Studio,
  Compositor,
  type IClip,
  fontManager,
} from '@designcombo/video';
import { useStudioStore } from '@/stores/studio-store';
import { editorFont } from './constants';
const defaultSize = {
  width: 1080,
  height: 1920,
};
interface PreviewPanelProps {
  onReady?: () => void;
}

export function PreviewPanel({ onReady }: PreviewPanelProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<Studio | null>(null);
  const { setStudio, setSelectedClips } = useStudioStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clips, setClips] = useState<IClip[]>([]);

  // Initialize Studio
  useEffect(() => {
    if (!previewCanvasRef.current) return;

    // Check support
    (async () => {
      if (!(await Compositor.isSupported())) {
        alert('Your browser does not support WebCodecs');
      }
    })();

    // Create studio instance with initial dimensions
    previewRef.current = new Studio({
      width: defaultSize.width,
      height: defaultSize.height,
      fps: 30,
      bgColor: '#18181b',
      canvas: previewCanvasRef.current,
      interactivity: true,
    });

    const init = async () => {
      await Promise.all([
        fontManager.loadFonts([
          {
            name: editorFont.fontFamily,
            url: editorFont.fontUrl,
          },
        ]),
        previewRef.current?.ready,
      ]);
      console.log('Studio ready');
      onReady?.();
    };

    init();

    // Set store
    setStudio(previewRef.current);

    // Event listeners
    const onTimeUpdate = (data: { currentTime: number }) => {
      setCurrentTime(data.currentTime);
    };

    const onPlay = (data: { isPlaying: boolean }) => {
      setIsPlaying(data.isPlaying);
    };

    const onPause = (data: { isPlaying: boolean }) => {
      setIsPlaying(data.isPlaying);
    };

    previewRef.current.on('currentTime', onTimeUpdate);
    previewRef.current.on('play', onPlay);
    previewRef.current.on('pause', onPause);

    return () => {
      if (previewRef.current) {
        previewRef.current.off('currentTime', onTimeUpdate);
        previewRef.current.off('play', onPlay);
        previewRef.current.off('pause', onPause);
        previewRef.current.destroy();
        previewRef.current = null;
        setStudio(null);
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-panel rounded-sm relative">
      <Player canvasRef={previewCanvasRef} />
    </div>
  );
}
