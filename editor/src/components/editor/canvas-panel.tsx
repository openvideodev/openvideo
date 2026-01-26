import { useEffect, useRef } from 'react';
import { Player } from './player';
import { Studio, Compositor, fontManager } from '@designcombo/video';
import { useStudioStore } from '@/stores/studio-store';
import { editorFont } from './constants';

// Canvas configuration constants
const DEFAULT_CANVAS_SIZE = {
  width: 1080,
  height: 1920,
} as const;

const STUDIO_CONFIG = {
  fps: 30,
  bgColor: '#171717',
  interactivity: true,
  spacing: 20,
} as const;
interface CanvasPanelProps {
  onReady?: () => void;
}

/**
 * CanvasPanel - The main interactive canvas component for the video editor.
 * Manages the Studio instance, canvas rendering, and responsive layout updates.
 */
export function CanvasPanel({ onReady }: CanvasPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const onReadyRef = useRef(onReady);
  const { setStudio } = useStudioStore();

  // Keep onReady ref up to date
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Setup Studio and ResizeObserver (only once on mount)
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create studio instance
    studioRef.current = new Studio({
      ...DEFAULT_CANVAS_SIZE,
      ...STUDIO_CONFIG,
      canvas: canvasRef.current,
    });

    // Initialize fonts and notify when ready
    const initializeStudio = async () => {
      if (!studioRef.current) return;

      try {
        await Promise.all([
          fontManager.loadFonts([
            {
              name: editorFont.fontFamily,
              url: editorFont.fontUrl,
            },
          ]),
          studioRef.current.ready,
        ]);
        onReadyRef.current?.();
      } catch (error) {
        console.error('Failed to initialize studio:', error);
      }
    };

    initializeStudio();

    // Update global store
    setStudio(studioRef.current);

    // Setup ResizeObserver for responsive layout
    const canvas = canvasRef.current;
    const parentElement = canvas.parentElement;
    let resizeObserver: ResizeObserver | null = null;

    if (parentElement) {
      resizeObserver = new ResizeObserver(() => {
        if (
          studioRef.current &&
          (studioRef.current as any).updateArtboardLayout
        ) {
          (studioRef.current as any).updateArtboardLayout();
        }
      });
      resizeObserver.observe(parentElement);
    }

    // Cleanup function
    return () => {
      // Disconnect ResizeObserver
      if (resizeObserver && parentElement) {
        resizeObserver.unobserve(parentElement);
        resizeObserver.disconnect();
      }

      // Destroy Studio instance
      if (studioRef.current) {
        studioRef.current.destroy();
        studioRef.current = null;
        setStudio(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-card rounded-sm relative">
      <Player canvasRef={canvasRef} />
    </div>
  );
}
