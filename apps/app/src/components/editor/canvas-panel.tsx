import { useEffect, useRef } from "react";
import {
  Studio,
  fontManager,
  registerCustomTransition,
  registerCustomEffect,
} from "@openvideo/engine-pixi";
import { useStudioStore } from "@/stores/studio-store";
import { useProjectStore } from "@/stores/project-store";
import { core, projectStore } from "@/lib/project";
import { useStore } from "zustand";
import { editorFont } from "./constants";
import { CUSTOM_TRANSITIONS } from "./transition-custom";
import { CUSTOM_EFFECTS } from "./effect-custom";
import { useStudioContextMenu, StudioContextMenuProvider } from "./studio-canvas-context-menu";

const STUDIO_CONFIG = {
  fps: 30,
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
  const { canvasSize } = useProjectStore();

  const backgroundColor = useStore(projectStore, (s) => s.settings.backgroundColor) || "#111111";

  // Keep onReady ref up to date
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const { state: contextMenuState, openContextMenu, closeContextMenu } = useStudioContextMenu();

  // Handle dimension changes
  useEffect(() => {
    if (studioRef.current) {
      studioRef.current.setSize(canvasSize.width, canvasSize.height);
    }
    core.store.getState().updateSettings({
      width: canvasSize.width,
      height: canvasSize.height,
    });
  }, [canvasSize]);

  // Handle background color changes
  useEffect(() => {
    if (studioRef.current) {
      studioRef.current.setBackgroundColor(backgroundColor);
    }
  }, [backgroundColor]);

  // Setup Studio and ResizeObserver (only once on mount)
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create studio instance
    studioRef.current = new Studio({
      ...canvasSize,
      ...STUDIO_CONFIG,
      backgroundColor: backgroundColor,
      canvas: canvasRef.current,
      core: core,
      previewScale: 0.75,
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

        // If there's initial data from the project store, load it now

        onReadyRef.current?.();
      } catch (error) {
        console.error("Failed to initialize studio:", error);
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
        if (studioRef.current && (studioRef.current as any).updateArtboardLayout) {
          (studioRef.current as any).updateArtboardLayout();
        }
      });
      resizeObserver.observe(parentElement);
    }

    // Handle right-click for context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const selectedIds = core.store.getState().selectedIds;
      const hasSelection = selectedIds.length > 0;

      // Check if clicking on a selected object vs background
      // For now, we'll show object menu if there's a selection
      openContextMenu({ x: e.clientX, y: e.clientY }, hasSelection ? "object" : "background");
    };

    parentElement?.addEventListener("contextmenu", handleContextMenu, { capture: true });
    console.log("Studio context menu listener attached to:", parentElement);

    // Cleanup function
    return () => {
      // Disconnect ResizeObserver
      if (resizeObserver && parentElement) {
        resizeObserver.unobserve(parentElement);
        resizeObserver.disconnect();
      }

      // Remove context menu listener
      parentElement?.removeEventListener("contextmenu", handleContextMenu, { capture: true });

      // Destroy Studio instance
      if (studioRef.current) {
        studioRef.current.destroy();
        studioRef.current = null;
        setStudio(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    CUSTOM_TRANSITIONS.forEach((t) => {
      registerCustomTransition(t.key, t as any);
    });
    CUSTOM_EFFECTS.forEach((e) => {
      registerCustomEffect(e.key, e as any);
    });
  }, []);

  return (
    <StudioContextMenuProvider state={contextMenuState} onClose={closeContextMenu}>
      <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-card rounded-sm relative">
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            outline: "none", // Avoid focus outline on canvas click
          }}
          tabIndex={0}
        />
      </div>
    </StudioContextMenuProvider>
  );
}
