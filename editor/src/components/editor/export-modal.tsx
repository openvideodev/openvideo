"use client";

import { useState, useEffect } from "react";
import {
  getEncodableVideoCodecs,
  getEncodableAudioCodecs,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_LOW,
  QUALITY_VERY_HIGH,
  QUALITY_VERY_LOW,
  Mp4OutputFormat,
  WebMOutputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  OggOutputFormat,
  WavOutputFormat,
  FlacOutputFormat,
} from "mediabunny";
import { toast } from "sonner";
import { Compositor, Log } from "openvideo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  Video,
  Headphones,
  ChevronDown,
  X,
  Clock,
} from "lucide-react";
import { useStudioStore } from "@/stores/studio-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalState = "SETTINGS" | "EXPORTING";

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { studio } = useStudioStore();
  const [modalState, setModalState] = useState<ModalState>("SETTINGS");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null);
  const [exportStartTime, setExportStartTime] = useState<number | null>(null);
  const [exportCombinator, setExportCombinator] = useState<Compositor | null>(
    null,
  );

  // Settings State
  const VIDEO_FORMATS = ["MP4", "WebM", "MKV", "MOV"];
  const AUDIO_FORMATS = ["MP3", "OGG", "WAV", "FLAC"];

  const [availableSampleRates, setAvailableSampleRates] = useState<string[]>([
    "44100",
    "48000",
  ]);

  const [encodableVideoCodecs, setEncodableVideoCodecs] = useState<string[]>(
    [],
  );
  const [encodableAudioCodecs, setEncodableAudioCodecs] = useState<string[]>(
    [],
  );

  const [loadingCodecs, setLoadingCodecs] = useState(true);

  const [videoSettings, setVideoSettings] = useState({
    enabled: true,
    codec: "avc",
    quality: "high",
    format: "MP4",
    frameRate: "30",
    resolution: "1080p",
  });

  const [audioSettings, setAudioSettings] = useState({
    enabled: true,
    codec: "mp3",
    sampleRate: "44100",
    format: "MP3",
  });
  const [allEncodableAudioCodecs, setAllEncodableAudioCodecs] = useState<
    string[]
  >([]);
  useEffect(() => {
    const fetchCodecs = async () => {
      try {
        const [videoCodecs, audioCodecs] = await Promise.all([
          getEncodableVideoCodecs(),
          getEncodableAudioCodecs(),
        ]);

        if (videoCodecs.length > 0) {
          setEncodableVideoCodecs(videoCodecs);
          setVideoSettings((prev) => ({ ...prev, codec: videoCodecs[0] }));
        }

        if (audioCodecs.length > 0) {
          if (audioCodecs.length > 0) {
            setAllEncodableAudioCodecs(audioCodecs);
            setEncodableAudioCodecs(audioCodecs);
            setAudioSettings((prev) => ({ ...prev, codec: audioCodecs[0] }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch encodable codecs:", error);
      } finally {
        setLoadingCodecs(false);
      }
    };

    fetchCodecs();
  }, []);

  const getVideoFormatObj = (fmt: string) => {
    switch (fmt) {
      case "WebM":
        return new WebMOutputFormat();
      case "MKV":
        return new MkvOutputFormat();
      case "MOV":
        return new MovOutputFormat();
      default:
        return new Mp4OutputFormat();
    }
  };

  const getAudioFormatObj = (fmt: string) => {
    switch (fmt) {
      case "OGG":
        return new OggOutputFormat();
      case "WAV":
        return new WavOutputFormat();
      case "FLAC":
        return new FlacOutputFormat();
      default:
        return new Mp3OutputFormat();
    }
  };

  // Explicit Handlers for Freedom of Movement
  const handleVideoCodecChange = (codec: string) => {
    setVideoSettings((prev) => {
      const newSettings = { ...prev, codec };
      // Check if current format supports this codec
      const fmtObj = getVideoFormatObj(newSettings.format);
      const supported = fmtObj.getSupportedVideoCodecs?.() || [];
      const isCompatible = supported.some(
        (sc: string) =>
          sc.toLowerCase() === codec.toLowerCase() ||
          codec.toLowerCase().includes(sc.toLowerCase()),
      );

      if (!isCompatible) {
        // Find first format that supports this codec
        const compatibleFormat = VIDEO_FORMATS.find((fmt) => {
          const obj = getVideoFormatObj(fmt);
          const s = obj.getSupportedVideoCodecs?.() || [];
          return s.some(
            (sc: string) =>
              sc.toLowerCase() === codec.toLowerCase() ||
              codec.toLowerCase().includes(sc.toLowerCase()),
          );
        });
        if (compatibleFormat) newSettings.format = compatibleFormat;
      }
      return newSettings;
    });
  };

  const handleVideoFormatChange = (format: string) => {
    setVideoSettings((prev) => {
      const newSettings = { ...prev, format };
      const fmtObj = getVideoFormatObj(format);
      const supported = fmtObj.getSupportedVideoCodecs?.() || [];

      // Define preferred codecs for each format
      const preferredCodecs: Record<string, string[]> = {
        MP4: ["avc", "h264", "hevc"],
        WebM: ["vp9", "vp8", "av1"],
        MKV: ["hevc", "avc", "vp9"],
        MOV: ["avc", "hevc"],
      };

      const preferred = preferredCodecs[format] || [];

      // Find the first encodable codec that is both supported by the format AND in our preferred list
      const bestCodec = encodableVideoCodecs.find((c) =>
        preferred.some(
          (pc) =>
            c.toLowerCase() === pc.toLowerCase() ||
            c.toLowerCase().includes(pc.toLowerCase()),
        ),
      );

      if (bestCodec) {
        newSettings.codec = bestCodec;
      } else {
        // Fallback: use first encodable codec supported by this format
        const encodable = encodableVideoCodecs.filter((c) =>
          supported.some(
            (sc: string) =>
              sc.toLowerCase() === c.toLowerCase() ||
              c.toLowerCase().includes(sc.toLowerCase()),
          ),
        );
        if (encodable.length > 0) newSettings.codec = encodable[0];
      }

      return newSettings;
    });
  };

  const handleAudioCodecChange = (codec: string) => {
    setAudioSettings((prev) => {
      const newSettings = { ...prev, codec };
      // Check Compatibility
      const fmtObj = getAudioFormatObj(newSettings.format);
      const supported = fmtObj.getSupportedAudioCodecs?.() || [];
      const isCompatible = supported.some(
        (sc: string) =>
          sc.toLowerCase() === codec.toLowerCase() ||
          codec.toLowerCase().includes(sc.toLowerCase()),
      );

      if (!isCompatible) {
        const compatibleFormat = AUDIO_FORMATS.find((fmt) => {
          const obj = getAudioFormatObj(fmt);
          const s = obj.getSupportedAudioCodecs?.() || [];
          return s.some(
            (sc: string) =>
              sc.toLowerCase() === codec.toLowerCase() ||
              codec.toLowerCase().includes(sc.toLowerCase()),
          );
        });
        if (compatibleFormat) newSettings.format = compatibleFormat;
      }

      // Sample Rate Check
      if (codec.toLowerCase().includes("mp3") || newSettings.format === "MP3") {
        newSettings.sampleRate = "44100";
      }

      return newSettings;
    });
  };

  const handleAudioFormatChange = (format: string) => {
    setAudioSettings((prev) => {
      const newSettings = { ...prev, format };
      const fmtObj = getAudioFormatObj(format);
      const supported = fmtObj.getSupportedAudioCodecs?.() || [];

      // Preferred audio codecs per format
      const preferredCodecs: Record<string, string[]> = {
        MP3: ["mp3"],
        OGG: ["opus", "vorbis"],
        WAV: ["pcm", "adpcm"],
        FLAC: ["flac"],
        MP4: ["aac", "mp3"], // If we ever add MP4 as audio format option
      };

      const preferred = preferredCodecs[format] || [];

      const bestCodec = encodableAudioCodecs.find((c) =>
        preferred.some(
          (pc) =>
            c.toLowerCase() === pc.toLowerCase() ||
            c.toLowerCase().includes(pc.toLowerCase()),
        ),
      );

      if (bestCodec) {
        newSettings.codec = bestCodec;
      } else {
        const encodable = encodableAudioCodecs.filter((c) =>
          supported.some(
            (sc: string) =>
              sc.toLowerCase() === c.toLowerCase() ||
              c.toLowerCase().includes(sc.toLowerCase()),
          ),
        );
        if (encodable.length > 0) newSettings.codec = encodable[0];
      }

      // Sample Rate Check for MP3 Format
      if (format === "MP3") {
        newSettings.sampleRate = "44100";
      }

      return newSettings;
    });
  };

  // Filter available options for metadata/UI
  useEffect(() => {
    const updateMutualFiltering = () => {
      // 1. Filter Sample Rates based on Codec (MP3 fallback/restriction)
      let filteredSampleRates = ["44100", "48000"];
      const isMP3 =
        audioSettings.codec.toLowerCase().includes("mp3") ||
        audioSettings.format === "MP3";
      if (isMP3) {
        filteredSampleRates = ["44100"];
      }
      setAvailableSampleRates(filteredSampleRates);
    };

    updateMutualFiltering();
  }, [
    videoSettings.format,
    audioSettings.format,
    videoSettings.codec,
    audioSettings.codec,
    encodableVideoCodecs,
    encodableAudioCodecs,
  ]);

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
    setModalState("SETTINGS");
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

  useEffect(() => {
    if (!videoSettings.enabled) {
      setEncodableAudioCodecs(allEncodableAudioCodecs);
      return;
    }

    const videoFormatObj = getVideoFormatObj(videoSettings.format);
    const supportedAudio = videoFormatObj.getSupportedAudioCodecs?.() || [];

    if (supportedAudio.length === 0) return;

    const compatibleEncodable = allEncodableAudioCodecs.filter((codec) =>
      supportedAudio.some(
        (supported: string) =>
          codec.toLowerCase() === supported.toLowerCase() ||
          codec.toLowerCase().includes(supported.toLowerCase()),
      ),
    );

    if (compatibleEncodable.length === 0) return;

    setEncodableAudioCodecs(compatibleEncodable);

    const isCurrentCompatible = compatibleEncodable.includes(
      audioSettings.codec,
    );

    if (!isCurrentCompatible) {
      setAudioSettings((prev) => ({
        ...prev,
        codec: compatibleEncodable[0],
      }));
    }
  }, [videoSettings.format, videoSettings.enabled, allEncodableAudioCodecs]);

  const startExport = async () => {
    if (!studio) return;

    try {
      setModalState("EXPORTING");
      setIsExporting(true);
      setExportProgress(0);
      setExportBlobUrl(null);
      setExportStartTime(Date.now());

      // Export current studio to JSON
      const json = studio.exportToJSON();

      if (!json.clips || json.clips.length === 0) {
        throw new Error("No clips to export");
      }

      const validClips = json.clips.filter((clipJSON: any) => {
        // Basic source validation
        const hasSource = clipJSON.src && clipJSON.src.trim() !== "";
        const isVisualOnly = [
          "Text",
          "Caption",
          "Effect",
          "Transition",
          "Image",
        ].includes(clipJSON.type);

        // Keep Text-like clips and sources.
        // We no longer skip visual-only clips in audio-only mode because they define the project duration.
        if (isVisualOnly) {
          return true;
        }

        return hasSource;
      });

      if (validClips.length === 0) {
        throw new Error("No valid clips to export");
      }

      // Build config from MediaBunny options
      let quality = QUALITY_HIGH;
      switch (videoSettings.quality) {
        case "very-high":
          quality = QUALITY_VERY_HIGH;
          break;
        case "high":
          quality = QUALITY_HIGH;
          break;
        case "medium":
          quality = QUALITY_MEDIUM;
          break;
        case "low":
          quality = QUALITY_LOW;
          break;
        case "very-low":
          quality = QUALITY_VERY_LOW;
          break;
      }

      // Map quality to bitrate if Compositor only supports numbers
      // For now we still use numbers since Compositor/Wrapbox seems to expect them
      let bitrate = 10e6; // High
      if (videoSettings.quality === "very-high") bitrate = 20e6;
      if (videoSettings.quality === "medium") bitrate = 5e6;
      if (videoSettings.quality === "low") bitrate = 2e6;
      if (videoSettings.quality === "very-low") bitrate = 1e6;

      let audioCodec = audioSettings.codec;
      const fmt = (
        videoSettings.enabled ? videoSettings.format : audioSettings.format
      ).toLowerCase();

      // JIT Codec Correction for common audio formats
      if (fmt === "mp3") audioCodec = "mp3";
      if (fmt === "wav") audioCodec = "wav";
      if (fmt === "flac") audioCodec = "flac";

      const projectWidth = json.settings?.width || 1920;
      const projectHeight = json.settings?.height || 1080;
      const isPortrait = projectHeight > projectWidth;

      const compositorOpts: any = {
        width: videoSettings.enabled
          ? videoSettings.resolution === "4k"
            ? isPortrait
              ? 2160
              : 3840
            : videoSettings.resolution === "1080p"
              ? isPortrait
                ? 1080
                : 1920
              : isPortrait
                ? 720
                : 1280
          : projectWidth, // Use project width for audio-only to satisfy renderer
        height: videoSettings.enabled
          ? videoSettings.resolution === "4k"
            ? isPortrait
              ? 3840
              : 2160
            : videoSettings.resolution === "1080p"
              ? isPortrait
                ? 1920
                : 1080
              : isPortrait
                ? 1280
                : 720
          : projectHeight, // Use project height for audio-only to satisfy renderer
        videoCodec: videoSettings.enabled ? videoSettings.codec : undefined,
        bitrate,
        fps: Number.parseInt(videoSettings.frameRate),
        bgColor: json.settings?.bgColor || "#000000",
        audio: audioSettings.enabled,
        audioCodec: audioCodec,
        audioSampleRate: Number.parseInt(audioSettings.sampleRate),
        audioBitrate: 128000, // Or map from settings if added
        format: fmt,
      };

      const com = new Compositor(compositorOpts);
      // Always initialize Pixi app, as visual clips need a renderer even for audio-only duration calculation
      await com.initPixiApp();
      setExportCombinator(com);

      com.on("OutputProgress", (v) => {
        setExportProgress(v);
      });

      // Synchronize settings in the JSON to match export options
      // This prevents loadFromJSON from overwriting the export-specific dimensions/tracks
      const validJson = {
        ...json,
        clips: validClips,
        settings: {
          ...json.settings,
          width: compositorOpts.width,
          height: compositorOpts.height,
          videoCodec: compositorOpts.videoCodec,
          bitrate: compositorOpts.bitrate,
          fps: compositorOpts.fps,
          audio: compositorOpts.audio,
          audioCodec: compositorOpts.audioCodec,
          audioSampleRate: compositorOpts.audioSampleRate,
          audioBitrate: compositorOpts.audioBitrate,
          format: compositorOpts.format,
        },
      };
      await com.loadFromJSON(validJson as any);

      const stream = com.output();
      const blob = await new Response(stream).blob();
      const blobUrl = URL.createObjectURL(blob);
      setExportBlobUrl(blobUrl);
      setIsExporting(false);

      // Automated completion flow
      setTimeout(() => {
        handleDownload(blobUrl);
        toast.success("Rendering complete! Your download has started.");
        setTimeout(() => {
          handleClose();
        }, 1500);
      }, 500);
    } catch (error) {
      Log.error("Export error:", error);
      alert("Failed to export: " + (error as Error).message);
      setIsExporting(false);
      setModalState("SETTINGS");
    }
  };

  const handleDownload = (url?: string) => {
    const downloadUrl = url || exportBlobUrl;
    if (!downloadUrl) return;

    const format = (
      videoSettings.enabled ? videoSettings.format : audioSettings.format
    ).toLowerCase();

    const aEl = document.createElement("a");
    document.body.appendChild(aEl);
    aEl.setAttribute("href", downloadUrl);
    aEl.setAttribute("download", `designcombo-export-${Date.now()}.${format}`);
    aEl.setAttribute("target", "_self");
    aEl.click();
    setTimeout(() => {
      if (document.body.contains(aEl)) {
        document.body.removeChild(aEl);
      }
    }, 100);
  };

  const renderSelect = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { label: string; value: string }[],
    placeholder: string,
    disabled = false,
  ) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-zinc-400">{label}</span>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={loadingCodecs || disabled}
      >
        <SelectTrigger className="h-8 w-32 border-zinc-800 bg-zinc-900/50 text-[13px] text-zinc-200">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-[560px] border-zinc-800/50 bg-[#121214] p-0 text-white shadow-2xl outline-none ring-0"
        showCloseButton={false}
      >
        {modalState === "SETTINGS" ? (
          <div className="flex flex-col p-6">
            <div className="mb-8 flex items-center justify-between">
              <DialogTitle className="text-lg font-medium">
                Export Settings
              </DialogTitle>
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-12">
              {/* Video Section */}
              <div className="flex flex-col gap-5">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Video</span>
                  </div>
                  <Checkbox
                    checked={videoSettings.enabled}
                    onCheckedChange={(v) =>
                      setVideoSettings({ ...videoSettings, enabled: !!v })
                    }
                    className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                </div>

                <div
                  className={`flex flex-col gap-3 transition-opacity ${
                    !videoSettings.enabled
                      ? "opacity-40 pointer-events-none"
                      : ""
                  }`}
                >
                  {renderSelect(
                    "Codec",
                    videoSettings.codec,
                    handleVideoCodecChange,
                    encodableVideoCodecs.map((c) => ({
                      label: c.toUpperCase(),
                      value: c,
                    })),
                    "Select video codec",
                  )}
                  {renderSelect(
                    "Quality",
                    videoSettings.quality,
                    (value) =>
                      setVideoSettings({ ...videoSettings, quality: value }),
                    [
                      { label: "Very High", value: "very-high" },
                      { label: "High", value: "high" },
                      { label: "Medium", value: "medium" },
                      { label: "Low", value: "low" },
                      { label: "Very Low", value: "very-low" },
                    ],
                    "Select video quality",
                  )}
                  {renderSelect(
                    "Format",
                    videoSettings.format,
                    handleVideoFormatChange,
                    VIDEO_FORMATS.map((fmt) => ({
                      label: fmt,
                      value: fmt,
                    })),
                    "Select output format",
                  )}
                  {renderSelect(
                    "Frame Rate",
                    videoSettings.frameRate,
                    (value) =>
                      setVideoSettings({ ...videoSettings, frameRate: value }),
                    [
                      { label: "24 fps", value: "24" },
                      { label: "30 fps", value: "30" },
                      { label: "60 fps", value: "60" },
                    ],
                    "Select frame rate",
                  )}
                  {renderSelect(
                    "Resolution",
                    videoSettings.resolution,
                    (v) =>
                      setVideoSettings({ ...videoSettings, resolution: v }),
                    [
                      { label: "720p", value: "720p" },
                      { label: "1080p", value: "1080p" },
                      { label: "4k", value: "4k" },
                    ],
                    "Select resolution",
                  )}
                </div>
              </div>

              {/* Audio Section */}
              <div className="flex flex-col gap-5">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Audio</span>
                  </div>
                  <Checkbox
                    checked={audioSettings.enabled}
                    onCheckedChange={(v) =>
                      setAudioSettings({ ...audioSettings, enabled: !!v })
                    }
                    className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                </div>

                <div
                  className={`flex flex-col gap-3 transition-opacity ${
                    !audioSettings.enabled
                      ? "opacity-40 pointer-events-none"
                      : ""
                  }`}
                >
                  {renderSelect(
                    "Codec",
                    audioSettings.codec,
                    handleAudioCodecChange,
                    encodableAudioCodecs.map((c) => ({
                      label: c.toUpperCase(),
                      value: c,
                    })),
                    "Select audio codec",
                  )}
                  {renderSelect(
                    "Sample Rate",
                    audioSettings.sampleRate,
                    (value) =>
                      setAudioSettings({ ...audioSettings, sampleRate: value }),
                    availableSampleRates.map((rate) => ({
                      label: rate === "44100" ? "44.1 kHz" : "48 kHz",
                      value: rate,
                    })),
                    "Select sample rate",
                  )}
                  {renderSelect(
                    "Format",
                    audioSettings.format,
                    handleAudioFormatChange,
                    AUDIO_FORMATS.map((fmt) => ({
                      label: fmt,
                      value: fmt,
                    })),
                    "Select audio format",
                    videoSettings.enabled,
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
                <Clock className="h-4 w-4" />
                <span className="text-[13px]">
                  Duration: {(maxDuration / 1e6).toFixed(2)}s
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="h-10 rounded-lg px-6 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={startExport}
                  className="h-10 rounded-lg bg-white px-8 text-[13px] font-medium text-black hover:bg-zinc-200"
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center p-12 text-center">
            <DialogTitle className="mb-2 text-xl font-medium">
              Exporting Composition
            </DialogTitle>
            <p className="mb-10 text-sm text-zinc-500">
              Please wait while we prepare your high-quality video
            </p>

            <div className="w-full max-w-sm px-1">
              <div className="mb-4 flex items-center justify-between text-[13px]">
                <span className="font-medium text-zinc-300">Progress</span>
                <span className="font-mono text-zinc-400">
                  {Math.round(exportProgress * 100)}% •{" "}
                  {exportProgress > 0 && exportStartTime
                    ? (() => {
                        const elapsed = Date.now() - exportStartTime;
                        const remaining =
                          (elapsed / exportProgress - elapsed) / 1000;
                        const mins = Math.floor(remaining / 60);
                        const secs = Math.floor(remaining % 60);
                        return `${mins}min ${secs}s`;
                      })()
                    : "preparing..."}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="absolute bottom-0 left-0 top-0 bg-white transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-10 flex w-full justify-center">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex h-11 items-center gap-2.5 rounded-xl border-zinc-800 bg-transparent px-8 text-[13px] font-medium text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white"
              >
                {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel Export
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
