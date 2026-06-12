"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconVideo, IconSettings } from "@tabler/icons-react";
import { useStudioStore } from "@/stores/studio-store";
import {
  ExportModal,
  RESOLUTION_GROUPS,
  RESOLUTION_PRESETS,
  VIDEO_CODECS,
  AUDIO_CODECS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  FRAME_RATES,
  SAMPLE_RATES,
} from "../../export-modal";

export function ExportGroupProperty() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string | null>(null);
  const [isPresetPopoverOpen, setIsPresetPopoverOpen] = useState(false);
  const [isCustomConfigOpen, setIsCustomConfigOpen] = useState(false);
  const [autoStartExport, setAutoStartExport] = useState(false);

  // Custom configurations state
  const [includeVideo, setIncludeVideo] = useState(true);
  const [videoCodec, setVideoCodec] = useState("avc1.640033");
  const [quality, setQuality] = useState("12000000");
  const [format, setFormat] = useState("mp4");
  const [fps, setFps] = useState("30");
  const [resolution, setResolution] = useState("Full HD");

  const [includeAudio, setIncludeAudio] = useState(true);
  const [audioCodec, setAudioCodec] = useState("aac");
  const [audioSampleRate, setAudioSampleRate] = useState("48000");

  const studio = useStudioStore((state) => state.studio);
  const maxDuration = studio?.getMaxDuration() || 0;
  const durationSec = maxDuration / 1e6;

  const durationStr = useMemo(() => {
    const min = Math.floor(durationSec / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(durationSec % 60)
      .toString()
      .padStart(2, "0");
    return `${min}:${sec}`;
  }, [durationSec]);

  // Handle format compatibility auto-switch inside custom view
  useEffect(() => {
    if (!includeVideo && format === "mp4") {
      setFormat("mp3");
    } else if (includeVideo && ["mp3", "wav", "flac", "ogg"].includes(format)) {
      setFormat("mp4");
    }
  }, [includeVideo, format]);

  useEffect(() => {
    if (includeVideo) {
      const f = VIDEO_FORMATS.find((x) => x.value === format);
      if (f && !f.codecs.includes(videoCodec)) setVideoCodec(f.codecs[0]);
    }
    if (format === "webm") {
      if (!["opus", "vorbis"].includes(audioCodec)) setAudioCodec("opus");
    } else {
      if (["opus", "vorbis"].includes(audioCodec)) setAudioCodec("aac");
    }
  }, [format, includeVideo, videoCodec, audioCodec]);

  useEffect(() => {
    if (!includeVideo) return;
    const preset = RESOLUTION_PRESETS.find((r) => r.label === resolution);
    if (!preset) return;
    setQuality(String(preset.bitrate));
    const height = Number(preset.value.split("x")[1]);
    if (height > 1080) {
      setVideoCodec("vp09.00.51.08");
      if (format === "mov") setFormat("mp4");
    }
  }, [resolution, includeVideo, format]);

  const selectPreset = (presetName: string) => {
    setSelectedPresetLabel(presetName);
    const preset = RESOLUTION_PRESETS.find((r) => r.label === presetName);
    if (preset) {
      setResolution(preset.label);
      setQuality(String(preset.bitrate));
      setFps(String(preset.fps));
      setVideoCodec(preset.codec);
      setFormat(preset.format);
      setIncludeVideo(true);
    }
  };

  const selectCustom = () => {
    setSelectedPresetLabel("Custom");
    setIsCustomConfigOpen(true);
  };

  const activePreset = useMemo(() => {
    if (selectedPresetLabel === "Custom") return { label: "Custom", badge: "Custom Export" };
    return RESOLUTION_PRESETS.find((r) => r.label === selectedPresetLabel);
  }, [selectedPresetLabel]);

  const customSettingsPayload = useMemo(() => {
    if (selectedPresetLabel !== "Custom") return undefined;
    return {
      includeVideo,
      videoCodec,
      quality,
      format,
      fps,
      resolution,
      includeAudio,
      audioCodec,
      audioSampleRate,
    };
  }, [
    selectedPresetLabel,
    includeVideo,
    videoCodec,
    quality,
    format,
    fps,
    resolution,
    includeAudio,
    audioCodec,
    audioSampleRate,
  ]);

  const calculateFileSize = (bitrate: number, duration: number) => {
    const bytes = (bitrate * duration) / 8;
    const mb = bytes / (1000 * 1000);
    return `${mb.toFixed(2)} MB`;
  };

  const displayFileSize = useMemo(() => {
    if (selectedPresetLabel === "Custom") {
      return calculateFileSize(Number(quality), durationSec);
    }
    if (activePreset && "bitrate" in activePreset) {
      return calculateFileSize(activePreset.bitrate, durationSec);
    }
    return "N/A";
  }, [activePreset, selectedPresetLabel, quality, durationSec]);

  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Export</span>
        <Popover open={isPresetPopoverOpen} onOpenChange={setIsPresetPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
            >
              <span className="text-base leading-none">+</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-card border border-white/10 shadow-xl" align="end">
            <ScrollArea className="h-64">
              <div className="flex flex-col gap-3 p-1">
                {RESOLUTION_GROUPS.map((group) => (
                  <div key={group.group} className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                      {group.group}
                    </span>
                    {group.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          selectPreset(item.label);
                          setIsPresetPopoverOpen(false);
                        }}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-left text-xs rounded hover:bg-white/5 transition-colors cursor-pointer text-foreground"
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">{item.badge}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {/* Add Custom Option */}
                <div className="flex flex-col gap-1 border-t border-white/10 pt-2 mt-1">
                  <button
                    onClick={() => {
                      selectCustom();
                      setIsPresetPopoverOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-left text-xs rounded hover:bg-white/5 transition-colors cursor-pointer text-foreground font-semibold"
                  >
                    <span>Custom</span>
                    <span className="text-[10px] text-muted-foreground">Custom Export</span>
                  </button>
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {activePreset && (
        <div className="flex flex-col gap-2 mt-1.5">
          {/* Selected Preset Badge */}
          <div className="flex items-center justify-between bg-secondary border rounded-md px-3 py-1.5">
            <div className="flex items-center gap-2">
              <IconVideo className="size-4 text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-foreground">
                {selectedPresetLabel === "Custom"
                  ? "Custom Export"
                  : `${activePreset.label} · ${(activePreset as any).badge}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Popover open={isCustomConfigOpen} onOpenChange={setIsCustomConfigOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    title="Edit export settings"
                  >
                    <IconSettings className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-4 bg-card border border-white/10 shadow-xl flex flex-col gap-3 z-[100]"
                  align="end"
                >
                  <span className="text-xs font-semibold text-foreground border-b border-white/10 pb-1.5">
                    Export Settings
                  </span>
                  <div className="py-1 flex flex-col gap-2">
                    {/* Include Video Switch */}
                    <div className="flex items-center justify-between py-1 gap-4">
                      <span className="text-xs text-muted-foreground">Video</span>
                      <Switch
                        checked={includeVideo}
                        onCheckedChange={(val) => {
                          setIncludeVideo(val);
                          setSelectedPresetLabel("Custom");
                        }}
                      />
                    </div>

                    {includeVideo && (
                      <>
                        {/* Resolution */}
                        <div className="flex items-center justify-between py-1 gap-4">
                          <span className="text-xs text-muted-foreground">Resolution</span>
                          <Select
                            value={resolution}
                            onValueChange={(val) => {
                              setResolution(val);
                              setSelectedPresetLabel("Custom");
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              <SelectItem value="HD" className="text-xs">
                                720p
                              </SelectItem>
                              <SelectItem value="Full HD" className="text-xs">
                                1080p
                              </SelectItem>
                              <SelectItem value="2K Quad HD" className="text-xs">
                                1440p
                              </SelectItem>
                              <SelectItem value="4K Ultra HD" className="text-xs">
                                2160p
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Video Codec */}
                        <div className="flex items-center justify-between py-1 gap-4">
                          <span className="text-xs text-muted-foreground">Codec</span>
                          <Select
                            value={videoCodec}
                            onValueChange={(val) => {
                              setVideoCodec(val);
                              setSelectedPresetLabel("Custom");
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              {VIDEO_CODECS.map((c) => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Bitrate (Mbps) */}
                        <div className="flex items-center justify-between py-1 gap-4">
                          <span className="text-xs text-muted-foreground">Bitrate (Mbps)</span>
                          <Input
                            type="number"
                            min={1}
                            max={200}
                            value={Math.round(Number(quality) / 1_000_000)}
                            onChange={(e) => {
                              setQuality(String(Number(e.target.value) * 1_000_000));
                              setSelectedPresetLabel("Custom");
                            }}
                            className="w-[130px] h-7 text-xs! bg-secondary border rounded-md"
                          />
                        </div>
                      </>
                    )}

                    {/* Include Audio Switch */}
                    <div className="flex items-center justify-between py-1 gap-4">
                      <span className="text-xs text-muted-foreground">Audio</span>
                      <Switch
                        checked={includeAudio}
                        onCheckedChange={(val) => {
                          setIncludeAudio(val);
                          setSelectedPresetLabel("Custom");
                        }}
                      />
                    </div>

                    {includeAudio && (
                      <>
                        {/* Audio Codec */}
                        <div className="flex items-center justify-between py-1 gap-4">
                          <span className="text-xs text-muted-foreground">Audio Codec</span>
                          <Select
                            value={audioCodec}
                            onValueChange={(val) => {
                              setAudioCodec(val);
                              setSelectedPresetLabel("Custom");
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              {AUDIO_CODECS.map((c) => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Audio Sample Rate */}
                        <div className="flex items-center justify-between py-1 gap-4">
                          <span className="text-xs text-muted-foreground">Sample Rate</span>
                          <Select
                            value={audioSampleRate}
                            onValueChange={(val) => {
                              setAudioSampleRate(val);
                              setSelectedPresetLabel("Custom");
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              {SAMPLE_RATES.map((sr) => (
                                <SelectItem key={sr.value} value={sr.value} className="text-xs">
                                  {sr.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Format */}
                    <div className="flex items-center justify-between py-1 gap-4">
                      <span className="text-xs text-muted-foreground">Format</span>
                      <Select
                        value={format}
                        onValueChange={(val) => {
                          setFormat(val);
                          setSelectedPresetLabel("Custom");
                        }}
                      >
                        <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[110]">
                          {(includeVideo ? VIDEO_FORMATS : AUDIO_FORMATS).map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Frame Rate */}
                    {includeVideo && (
                      <div className="flex items-center justify-between py-1 gap-4">
                        <span className="text-xs text-muted-foreground">Frame Rate</span>
                        <Select
                          value={fps}
                          onValueChange={(val) => {
                            setFps(val);
                            setSelectedPresetLabel("Custom");
                          }}
                        >
                          <SelectTrigger className="w-[130px] h-7 bg-secondary border rounded-md text-xs!">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[110]">
                            {FRAME_RATES.map((fr) => (
                              <SelectItem key={fr.value} value={fr.value} className="text-xs">
                                {fr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <button
                onClick={() => setSelectedPresetLabel(null)}
                className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
                title="Remove configuration"
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={() => {
              setAutoStartExport(true);
              setIsExportModalOpen(true);
            }}
            className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md cursor-pointer transition-colors"
          >
            Export
          </Button>

          {/* Metadata */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 mt-0.5">
            <span>Duration {durationStr}</span>
            <span>File size {displayFileSize}</span>
          </div>
        </div>
      )}

      <ExportModal
        open={isExportModalOpen}
        onOpenChange={(openVal) => {
          setIsExportModalOpen(openVal);
          if (!openVal) setAutoStartExport(false);
        }}
        initialPresetLabel={
          selectedPresetLabel !== "Custom" ? selectedPresetLabel || undefined : undefined
        }
        autoStart={autoStartExport}
        customSettings={customSettingsPayload}
      />
    </div>
  );
}
