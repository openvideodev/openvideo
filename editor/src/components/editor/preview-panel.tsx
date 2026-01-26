import { useEffect, useRef } from 'react';
import { Player } from './player';
import { Studio, Compositor, fontManager } from '@designcombo/video';
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
  const { setStudio } = useStudioStore();

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
      bgColor: '#171717',
      canvas: previewCanvasRef.current,
      interactivity: true,
      spacing: 20,
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
      onReady?.();
    };

    init();

    // Set store
    setStudio(previewRef.current);

    return () => {
      if (previewRef.current) {
        previewRef.current.destroy();
        previewRef.current = null;
        setStudio(null);
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-card rounded-sm relative">
      <Player canvasRef={previewCanvasRef} />
    </div>
  );
}
