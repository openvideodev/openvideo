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
      if (timelineCanvas) {
        // TimelineCanvas expects microseconds
        const splitTime = currentTime * 1_000_000;
        timelineCanvas.splitSelectedClip(splitTime);
      }
    });

    // Delete
    hotkeys('backspace, delete', (event, handler) => {
      // event.preventDefault(); // CAREFUL: This prevents deleting text in inputs if not scoped
      // We should check if we are in an input. hotkeys-js has a filter usually.
      // But for now, let's assume global editor context or check logic.
      // hotkeys.filter returns true by default for inputs.
      if (timelineCanvas) {
        // Check if active element is input
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        timelineCanvas.deleteSelectedClips();
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
      if (timelineCanvas) {
        timelineCanvas.duplicateSelectedClips(); // Reuse duplicate for now as paste
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

    return () => {
      hotkeys.unbind('space');
      hotkeys.unbind('command+b, ctrl+b');
      hotkeys.unbind('backspace, delete');
      hotkeys.unbind('command+a, ctrl+a');
      hotkeys.unbind('command+c, ctrl+c');
      hotkeys.unbind('command+v, ctrl+v');
      hotkeys.unbind('command+=, ctrl+=');
      hotkeys.unbind('command+-, ctrl+-');
    };
  }, [isPlaying, timelineCanvas, currentTime, toggle, setZoomLevel]);
}
