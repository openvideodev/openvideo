import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';
import { useTimelineStore } from '@/stores/timeline-store';
import { usePlaybackStore } from '@/stores/playback-store';
import { useStudioStore } from '@/stores/studio-store';
import { TimelineCanvas } from '@/components/editor/timeline/timeline';

interface UseEditorHotkeysProps {
  timelineCanvas: TimelineCanvas | null;
  setZoomLevel?: (zoomLevel: number | ((prev: number) => number)) => void;
}

export function useEditorHotkeys({
  timelineCanvas,
  setZoomLevel,
}: UseEditorHotkeysProps) {
  const { isPlaying, toggle, currentTime } = usePlaybackStore();
  const { studio } = useStudioStore();

  useEffect(() => {
    // Play/Pause
    hotkeys('space', (event, handler) => {
      event.preventDefault();
      toggle();
    });

    // Split
    hotkeys('command+b, ctrl+b', (event, handler) => {
      event.preventDefault();
      if (studio) {
        // Studio expects microseconds
        const splitTime = currentTime * 1_000_000;
        studio.splitSelected(splitTime);
      }
    });

    // Delete
    hotkeys('backspace, delete', (event, handler) => {
      // Check if active element is input
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (studio) {
        studio.deleteSelected();
      }
    });

    // Select All
    hotkeys('command+a, ctrl+a', (event, handler) => {
      event.preventDefault();
      const { clips } = useTimelineStore.getState();
      if (timelineCanvas) {
        timelineCanvas.selectClips(Object.keys(clips));
      }
    });

    // Copy / Paste / Cut - These are usually handled by OS if not intercepted
    // But for canvas objects we might need custom handling.
    hotkeys('command+c, ctrl+c', (event) => {
      // event.preventDefault();
      if (timelineCanvas) {
        // timelineCanvas.copySelected();
      }
    });

    hotkeys('command+v, ctrl+v', (event) => {
      // event.preventDefault();
      if (studio) {
        studio.duplicateSelected(); // Reuse duplicate for now as paste
      }
    });

    // Zoom In
    hotkeys('command+=, ctrl+=', (event) => {
      event.preventDefault();
      setZoomLevel?.((prev) => Math.min(10, prev + 0.15));
    });

    // Zoom Out
    hotkeys('command+-, ctrl+-', (event) => {
      event.preventDefault();
      setZoomLevel?.((prev) => Math.max(0.1, prev - 0.15));
    });

    // Undo
    hotkeys('command+z, ctrl+z', (event) => {
      event.preventDefault();
      studio?.undo();
    });

    // Redo
    hotkeys('command+shift+z, ctrl+shift+z, command+y, ctrl+y', (event) => {
      event.preventDefault();
      studio?.redo();
    });

    return () => {
      hotkeys.unbind('space');
      hotkeys.unbind('command+b, ctrl+b');
      hotkeys.unbind('backspace, delete');
      hotkeys.unbind('command+a, ctrl+a');
      hotkeys.unbind('command+c, ctrl+c');
      hotkeys.unbind('command+v, ctrl+v');
      hotkeys.unbind('command+=, ctrl+=');
      hotkeys.unbind('command+-, ctrl+-');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z, command+y, ctrl+y');
    };
  }, [isPlaying, timelineCanvas, currentTime, toggle, setZoomLevel]);
}
