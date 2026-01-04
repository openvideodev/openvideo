'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Compositor, Log } from '@designcombo/video';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { studio } = useStudioStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null);
  const [exportStartTime, setExportStartTime] = useState<number | null>(null);
  const [exportCombinator, setExportCombinator] = useState<Compositor | null>(
    null
  );

  const maxDuration = studio?.getMaxDuration() || 0;

  const resetState = () => {
    if (exportCombinator) {
      exportCombinator.destroy();
      setExportCombinator(null);
    }
    if (exportBlobUrl) {
      URL.revokeObjectURL(exportBlobUrl);
      setExportBlobUrl(null);
    }
    setExportStartTime(null);
    setIsExporting(false);
    setExportProgress(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const startExport = async () => {
    if (!studio) return;

    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportBlobUrl(null);
      setExportStartTime(Date.now());

      // Export current studio to JSON
      const json = studio.exportToJSON();

      if (!json.clips || json.clips.length === 0) {
        throw new Error('No clips to export');
      }

      // Filter out clips with empty sources (except Text, Caption, and Effect)
      const validClips = json.clips.filter((clipJSON: any) => {
        if (
          clipJSON.type === 'Text' ||
          clipJSON.type === 'Caption' ||
          clipJSON.type === 'Effect' ||
          clipJSON.type === 'Transition'
        ) {
          return true;
        }
        return clipJSON.src && clipJSON.src.trim() !== '';
      });

      if (validClips.length === 0) {
        throw new Error('No valid clips to export');
      }

      // Use default settings
      const settings = json.settings || {};
      const combinatorOpts: any = {
        width: settings.width || 1920,
        height: settings.height || 1080,
        fps: settings.fps || 30,
        bgColor: settings.bgColor || '#000000',
        videoCodec: 'avc1.42E032',
        bitrate: 10e6, // default to high
        audio: true,
      };

      const com = new Compositor(combinatorOpts);
      await com.initPixiApp();
      setExportCombinator(com);

      com.on('OutputProgress', (v) => {
        setExportProgress(v);
      });

      const validJson = { ...json, clips: validClips };
      await com.loadFromJSON(validJson);

      const stream = com.output();
      const blob = await new Response(stream).blob();
      const blobUrl = URL.createObjectURL(blob);
      setExportBlobUrl(blobUrl);
      setIsExporting(false);

      // Automated completion flow
      setTimeout(() => {
        handleDownload(blobUrl);
        toast.success('Rendering complete! Your download has started.');
        setTimeout(() => {
          handleClose();
        }, 1500);
      }, 500);
    } catch (error) {
      Log.error('Export error:', error);
      alert('Failed to export: ' + (error as Error).message);
      setIsExporting(false);
    }
  };

  // Auto-start export when modal opens
  useEffect(() => {
    if (open && !isExporting && !exportBlobUrl) {
      startExport();
    }
  }, [open]);

  const handleDownload = (url?: string) => {
    const downloadUrl = url || exportBlobUrl;
    if (!downloadUrl) return;
    const aEl = document.createElement('a');
    document.body.appendChild(aEl);
    aEl.setAttribute('href', downloadUrl);
    aEl.setAttribute('download', `designcombo-export-${Date.now()}.mp4`);
    aEl.setAttribute('target', '_self');
    aEl.click();
    setTimeout(() => {
      if (document.body.contains(aEl)) {
        document.body.removeChild(aEl);
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-[480px] border-zinc-800 bg-[#0c0c0e]/95 p-0 text-white backdrop-blur-xl"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center p-8 pt-10">
          <DialogTitle className="mb-8 text-xl font-medium tracking-tight">
            Exporting Composition
          </DialogTitle>

          <div className="mb-8 w-full rounded-2xl border border-white/5 bg-white/5 p-5 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Duration</span>
                <span className="font-medium">
                  {(maxDuration / 1e6).toFixed(2)}s
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Video Codec</span>
                <span className="font-medium">avc</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Resolution</span>
                <span className="font-medium">
                  {studio?.getOptions().width} x {studio?.getOptions().height}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Container</span>
                <span className="font-medium">MP4</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Bitrate</span>
                <span className="font-medium">high</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Audio Codec</span>
                <span className="font-medium">aac</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Frame rate</span>
                <span className="font-medium">30 FPS</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Sample Rate</span>
                <span className="font-medium">48 KHz</span>
              </div>
            </div>
          </div>

          <div className="w-full px-1">
            <div className="mb-3 flex items-center justify-between text-[13px]">
              <span className="font-medium text-zinc-300">Progress</span>
              <span className="font-mono text-zinc-400">
                {Math.round(exportProgress * 100)}% •{' '}
                {exportProgress > 0 && exportStartTime
                  ? (() => {
                      const elapsed = Date.now() - exportStartTime;
                      const remaining =
                        (elapsed / exportProgress - elapsed) / 1000;
                      const mins = Math.floor(remaining / 60);
                      const secs = Math.floor(remaining % 60);
                      return `${mins}min ${secs}s`;
                    })()
                  : 'preparing...'}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="absolute bottom-0 left-0 top-0 bg-white transition-all duration-300 ease-out"
                style={{ width: `${exportProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex w-full justify-center">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex h-11 items-center gap-2.5 rounded-xl border-zinc-800 bg-zinc-900/50 px-8 text-[13px] font-medium text-white transition-all hover:bg-zinc-800 hover:text-white"
            >
              {isExporting && (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              )}
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
