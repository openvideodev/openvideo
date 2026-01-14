# Rendering and Export

Learn how to render your composition and export it to video files.

## Preview Rendering

### Play Preview

```ts
// Start playback
await studio.play();

// Pause playback
studio.pause();

// Seek to frame (0-based)
await studio.seek(150);
```

### Preview Settings

```ts
studio.setPreviewQuality("high"); // "low", "medium", "high"
studio.setPreviewFPS(30); // Lower FPS for smoother preview
```

## Export to Video

### Basic Export

```ts
await studio.export({
  format: "mp4",
  quality: "high",
  onProgress: (percent) => {
    console.log(`Export progress: ${percent}%`);
  },
});
```

### Export Options

```ts
await studio.export({
  // Format
  format: "mp4", // "mp4", "webm", "gif"

  // Quality
  quality: "high", // "low", "medium", "high", "ultra"

  // Or specify bitrate manually
  videoBitrate: 5000, // kbps
  audioBitrate: 192, // kbps

  // Resolution
  width: 1920, // Override studio width
  height: 1080, // Override studio height

  // Frame rate
  fps: 30,

  // Codec
  videoCodec: "h264", // "h264", "vp8", "vp9"
  audioCodec: "aac", // "aac", "opus", "mp3"

  // Output
  filename: "output.mp4",

  // Range
  startFrame: 0,
  endFrame: 300, // Export specific range

  // Callbacks
  onProgress: (percent, frame, totalFrames) => {
    console.log(`Rendering frame ${frame}/${totalFrames} (${percent}%)`);
  },

  onComplete: (blob) => {
    console.log("Export complete!");
    download(blob, "video.mp4");
  },

  onError: (error) => {
    console.error("Export failed:", error);
  },
});
```

## Export Formats

### MP4 (H.264)

Most compatible format:

```ts
await studio.export({
  format: "mp4",
  videoCodec: "h264",
  audioCodec: "aac",
  quality: "high",
});
```

### WebM

Web-optimized format:

```ts
await studio.export({
  format: "webm",
  videoCodec: "vp9",
  audioCodec: "opus",
  quality: "high",
});
```

### GIF

Animated GIF (no audio):

```ts
await studio.export({
  format: "gif",
  fps: 15, // Lower FPS for smaller file
  quality: "medium",
});
```

## Quality Presets

### Ultra Quality (Large file)

```ts
await studio.export({
  quality: "ultra",
  videoBitrate: 10000, // 10 Mbps
  audioBitrate: 320,
});
```

### High Quality (Balanced)

```ts
await studio.export({
  quality: "high",
  videoBitrate: 5000, // 5 Mbps
  audioBitrate: 192,
});
```

### Medium Quality (Smaller file)

```ts
await studio.export({
  quality: "medium",
  videoBitrate: 2500, // 2.5 Mbps
  audioBitrate: 128,
});
```

### Low Quality (Very small)

```ts
await studio.export({
  quality: "low",
  videoBitrate: 1000, // 1 Mbps
  audioBitrate: 96,
});
```

## Export Single Frame

Export a single frame as an image:

```ts
const blob = await studio.exportFrame(150, {
  format: "png", // "png", "jpg", "webp"
  quality: 1.0, // 0.0 to 1.0 (for jpg/webp)
});

// Download image
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "frame.png";
a.click();
```

## Export Frame Sequence

Export frames as individual images:

```ts
await studio.exportFrameSequence({
  format: "png",
  startFrame: 0,
  endFrame: 300,
  onFrame: (frame, blob) => {
    // Save each frame
    download(blob, `frame-${frame.toString().padStart(4, "0")}.png`);
  },
  onProgress: (percent) => {
    console.log(`${percent}% complete`);
  },
});
```

## Render Range

Export only a portion of the timeline:

```ts
// Export frames 100-200
await studio.export({
  format: "mp4",
  startFrame: 100,
  endFrame: 200,
});
```

## Background Rendering

Render in a Web Worker for better performance:

```ts
await studio.export({
  format: "mp4",
  useWorker: true, // Render in background
  workerThreads: 4, // Number of worker threads
});
```

## Rendering Events

Track rendering progress:

```ts
studio.on("renderStart", () => {
  console.log("Rendering started");
  showProgressBar();
});

studio.on("renderProgress", ({ frame, totalFrames, percent }) => {
  console.log(`Frame ${frame}/${totalFrames} (${percent}%)`);
  updateProgressBar(percent);
});

studio.on("renderComplete", (blob) => {
  console.log("Rendering complete!");
  hideProgressBar();
  download(blob);
});

studio.on("renderError", (error) => {
  console.error("Rendering failed:", error);
  showError(error.message);
});

studio.on("renderCancel", () => {
  console.log("Rendering cancelled");
  hideProgressBar();
});
```

## Cancel Rendering

Cancel an ongoing render:

```ts
const renderPromise = studio.export({ format: "mp4" });

// Cancel after 5 seconds
setTimeout(() => {
  studio.cancelRender();
}, 5000);

try {
  await renderPromise;
} catch (error) {
  if (error.message === "Render cancelled") {
    console.log("User cancelled render");
  }
}
```

## Download Helper

Helper function to download exported files:

```ts
async function exportAndDownload() {
  const blob = await studio.export({
    format: "mp4",
    quality: "high",
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "video.mp4";
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
}
```

## Upload to Server

Upload exported video to server:

```ts
const blob = await studio.export({
  format: "mp4",
  quality: "high",
});

const formData = new FormData();
formData.append("video", blob, "video.mp4");

await fetch("/api/upload", {
  method: "POST",
  body: formData,
});
```

## Thumbnail Generation

Generate a thumbnail from the studio:

```ts
const thumbnail = await studio.exportThumbnail({
  frame: 150, // Frame to capture
  width: 320, // Thumbnail width
  height: 180, // Thumbnail height
  format: "jpg",
  quality: 0.8,
});
```

## Custom Rendering

### Render to Canvas

Render directly to a canvas element:

```ts
const canvas = document.createElement("canvas");
canvas.width = 1920;
canvas.height = 1080;

await studio.renderToCanvas(canvas, {
  frame: 150,
});

// Use canvas
document.body.appendChild(canvas);
```

### Render with Custom Settings

```ts
await studio.render({
  width: 1920,
  height: 1080,
  fps: 60,
  transparent: false,
  backgroundColor: "#000000",
});
```

## Performance Optimization

### Optimize for Rendering

```ts
// Before rendering
studio.optimize({
  cacheFrames: true,
  removeUnusedClips: true,
  compressTimeline: true,
});
```

### Render Settings

```ts
studio.setRenderSettings({
  // Hardware acceleration
  hardwareAcceleration: true,

  // Multithreading
  useWorkers: true,
  workerCount: 4,

  // Memory management
  maxMemoryUsage: 2048, // MB
  clearCacheInterval: 100, // Clear every N frames
});
```

## Export Statistics

Get rendering statistics:

```ts
const stats = await studio.export({
  format: "mp4",
  quality: "high",
  collectStats: true,
});

console.log(`Render time: ${stats.renderTime}ms`);
console.log(`Average FPS: ${stats.averageFPS}`);
console.log(`File size: ${stats.fileSize} bytes`);
console.log(`Total frames: ${stats.totalFrames}`);
```

## Best Practices

1. **Validate before export** - Use `studio.validate()` before rendering
2. **Show progress** - Always display export progress to users
3. **Handle errors** - Provide error handling and user feedback
4. **Test exports** - Test on different devices and browsers
5. **Optimize first** - Run `studio.optimize()` before large exports
6. **Choose appropriate quality** - Balance quality and file size
7. **Use workers** - Enable worker threads for faster rendering
8. **Provide cancellation** - Allow users to cancel long exports
9. **Cache when possible** - Cache rendered frames for re-exports
10. **Clean up** - Revoke object URLs after download

## Troubleshooting

### Slow Rendering

```ts
// Reduce quality
studio.export({ quality: "medium" });

// Use workers
studio.export({ useWorkers: true });

// Optimize studio
studio.optimize();
```

### Out of Memory

```ts
// Clear cache more frequently
studio.setRenderSettings({
  clearCacheInterval: 50,
  maxMemoryUsage: 1024,
});

// Render in smaller chunks
await studio.exportRange(0, 150);
await studio.exportRange(150, 300);
```

### Browser Limitations

```ts
// Check if export is supported
if (studio.canExport("mp4")) {
  await studio.export({ format: "mp4" });
} else {
  // Fallback to frame sequence
  await studio.exportFrameSequence({ format: "png" });
}
```

## Platform-Specific Notes

### Desktop Browsers

- **Chrome/Edge**: Best WebCodecs support
- **Firefox**: Good WebM support
- **Safari**: Limited WebCodecs, use H.264

### Mobile Browsers

- **iOS Safari**: H.264 recommended
- **Android Chrome**: WebM and H.264 supported
- **Limitations**: Lower memory, slower rendering

### Recommended Settings by Platform

```ts
const isMobile = /Mobile|Android/i.test(navigator.userAgent);

await studio.export({
  format: isMobile ? "mp4" : "webm",
  quality: isMobile ? "medium" : "high",
  useWorkers: !isMobile,
});
```
