export interface VideoInfo {
  duration: number | undefined;
  width: number | undefined;
  height: number | undefined;
  likelyNeedsConform: boolean;
  estimatedFps?: number;
}

export async function analyzeVideo(file: File): Promise<VideoInfo> {
  const { ALL_FORMATS, Input, BlobSource } = await import("mediabunny");

  using input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  const [duration, videoTrack] = await Promise.all([
    input.computeDuration(),
    input.getPrimaryVideoTrack(),
  ]);

  if (!videoTrack) {
    return { duration: undefined, width: undefined, height: undefined, likelyNeedsConform: true };
  }

  const width = videoTrack.displayWidth;
  const height = videoTrack.displayHeight;

  // Estimate FPS via packet stats (sample first 100 packets)
  const packetStats = await videoTrack.computePacketStats(100);
  const fps = packetStats.averagePacketRate;

  // Conform needed if FPS > 60 (browser compatibility)
  const likelyNeedsConform = fps > 60;

  console.log(`[Video Analysis] ${file.name}:`, {
    resolution: `${width}x${height}`,
    duration: `${Math.round(duration ?? 0)}s`,
    fps: `${fps}fps`,
    needsConform: likelyNeedsConform,
  });

  return {
    duration: duration ?? undefined,
    width,
    height,
    likelyNeedsConform,
    estimatedFps: fps,
  };
}
