# @openvideo/video-renderer

Headless video renderer that runs `@openvideo/engine-pixi` inside a Playwright browser and returns a video Buffer.

## Installation

```bash
pnpm add @openvideo/video-renderer
# or
npm install @openvideo/video-renderer
```

**Prerequisites:**

- Node.js 18+
- Playwright browsers installed: `npx playwright install chromium`

## Quick Start

### Programmatic API

```typescript
import { renderVideo } from "@openvideo/video-renderer";

const project = {
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundColor: "#000000",
  },
  clips: {
    text1: {
      type: "Text",
      id: "text1",
      text: "Hello World",
      x: 960,
      y: 540,
      width: 400,
      height: 100,
      angle: 0,
      opacity: 1,
      zIndex: 1,
      display: { from: 0, to: 3000 },
      trim: { from: 0, to: 3000 },
      duration: 3000,
      playbackRate: 1,
      style: {
        fontFamily: "Arial",
        fontSize: 48,
        fill: "#ffffff",
        align: "center",
      },
    },
  },
};

const buffer = await renderVideo(project, {
  format: "mp4",
  bitrate: 8_000_000,
  onProgress: (p) => console.log(`${(p * 100).toFixed(1)}%`),
  outputPath: "./output.mp4",
});
```

### CLI Usage

```bash
# Render a project file to video
pnpm render project.json output.mp4

# Or using npx
npx @openvideo/video-renderer project.json output.mp4
```

## Providing Parameters

There are three ways to provide render parameters, in order of precedence (highest to lowest):

### 1. Programmatic API Options (Highest Priority)

Pass options as the second argument to `renderVideo()` or `renderer.render()`:

```typescript
import { renderVideo } from "@openvideo/video-renderer";

const buffer = await renderVideo(project, {
  // Video dimensions
  width: 1080,
  height: 1920,
  fps: 30,
  backgroundColor: "#111111",

  // Video encoding
  format: "mp4",
  videoCodec: "avc1.640033",
  bitrate: 12_000_000,

  // Audio settings
  audio: true,
  audioCodec: "aac",
  audioSampleRate: 48_000,

  // Performance
  prioritizeSpeed: true, // Reduces bitrate by 30% for faster encoding

  // Callbacks and timeout
  onProgress: (progress) => console.log(`${(progress * 100).toFixed(1)}%`),
  timeout: 600_000,

  // Output
  outputPath: "./output.mp4",
});
```

### 2. Project Settings (Medium Priority)

Define settings in your project JSON. These are used as defaults when not overridden by API options:

```json
{
  "settings": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "backgroundColor": "#111111",
    "format": "mp4",
    "videoCodec": "avc1.640033",
    "bitrate": 12000000,
    "audio": true,
    "audioCodec": "aac",
    "audioSampleRate": 48000
  },
  "clips": { ... }
}
```

Then render with minimal options:

```typescript
// Uses all settings from project.settings
const buffer = await renderVideo(project, {
  outputPath: "./output.mp4",
});

// Or override specific settings
const buffer = await renderVideo(project, {
  bitrate: 8_000_000, // Override project bitrate
  outputPath: "./output.mp4",
});
```

### 3. CLI with Project JSON (Lowest Priority)

When using the CLI, all parameters come from the project JSON file:

```bash
# Reads settings from project.json, outputs to output.mp4
pnpm render project.json output.mp4
```

**CLI does not accept individual render options as flags.** All configuration must be in the project JSON.

### Complete Example

```typescript
import { renderVideo, VideoRenderer } from "@openvideo/video-renderer";

// Single render with full options
const buffer = await renderVideo(project, {
  width: 1080,
  height: 1920,
  fps: 30,
  backgroundColor: "#111111",
  format: "mp4",
  videoCodec: "avc1.640033",
  bitrate: 12_000_000,
  audio: true,
  audioCodec: "aac",
  audioSampleRate: 48_000,
  prioritizeSpeed: true,
  onProgress: (p) => process.stdout.write(`\r${(p * 100).toFixed(0)}%`),
  timeout: 600_000,
  outputPath: "./video.mp4",
});

// Batch rendering with shared browser instance
const renderer = new VideoRenderer();
await renderer.init();

try {
  // First render at 4K
  const hd = await renderer.render(project, { width: 3840, height: 2160, bitrate: 25_000_000 });

  // Second render at 1080p (faster, reuses browser page from pool)
  const fullHd = await renderer.render(project, { width: 1920, height: 1080, bitrate: 8_000_000 });
} finally {
  await renderer.destroy();
}
```

## API Reference

### `renderVideo(project, options)`

Renders a project to a video Buffer.

**Parameters:**

- `project` (`ProjectJSON`): The project definition with clips and settings
- `options` (`RenderOptions & { outputPath?: string }`): Render configuration

**Returns:** `Promise<Buffer>` — The encoded video buffer

### `VideoRenderer` Class

For advanced use cases where you want to reuse the browser instance across multiple renders.

```typescript
import { VideoRenderer } from "@openvideo/video-renderer";

const renderer = new VideoRenderer();
await renderer.init();

try {
  const buffer1 = await renderer.render(project1, { format: "mp4" });
  const buffer2 = await renderer.render(project2, { format: "mp4" });
} finally {
  await renderer.destroy();
}
```

**Methods:**

- `init()`: Start the static server and launch headless browser
- `render(project, options)`: Render a project and return video Buffer
- `destroy()`: Stop the browser and static server

## Render Options

| Option            | Type                         | Default          | Description                                            |
| ----------------- | ---------------------------- | ---------------- | ------------------------------------------------------ |
| `width`           | `number`                     | Project settings | Override export width (px)                             |
| `height`          | `number`                     | Project settings | Override export height (px)                            |
| `fps`             | `number`                     | Project settings | Override frame rate                                    |
| `backgroundColor` | `string`                     | Project settings | Background color hex                                   |
| `format`          | `string`                     | `'mp4'`          | Container format                                       |
| `videoCodec`      | `string`                     | `'avc1.640033'`  | WebCodecs video codec (H.264)                          |
| `bitrate`         | `number`                     | `12_000_000`     | Video bitrate in bps (12 Mbps)                         |
| `audio`           | `boolean`                    | `true`           | Include audio track                                    |
| `audioCodec`      | `string`                     | `'aac'`          | Audio codec                                            |
| `audioSampleRate` | `number`                     | `48_000`         | Audio sample rate                                      |
| `onProgress`      | `(progress: number) => void` | —                | Progress callback (0–1)                                |
| `timeout`         | `number`                     | `600_000`        | Max render time in ms (10 min)                         |
| `outputPath`      | `string`                     | —                | Optional path to write the file                        |
| `prioritizeSpeed` | `boolean`                    | `false`          | Prioritize speed over quality (reduces bitrate by 30%) |

## Project JSON Format

```typescript
interface ProjectJSON {
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor?: string;
    format?: string;
    videoCodec?: string;
    bitrate?: number;
    audio?: boolean;
  };
  clips: Record<string, ClipJSON>;
  tracks?: Array<{
    id: string;
    name: string;
    type: string;
    clipIds: string[];
  }>;
}
```

See `@openvideo/engine-pixi` documentation for full `ClipJSON` specification.

## Architecture

The renderer uses a browser-automation approach:

1. Starts a local HTTP server to serve the renderer HTML page and engine-pixi assets
2. Launches a headless Chromium browser via Playwright
3. Injects project data and compositor options into the browser context
4. The browser runs `@openvideo/engine-pixi` to render frames using WebCodecs
5. Extracts the resulting video Blob as base64 and converts to Node.js Buffer

This approach enables hardware-accelerated video encoding via WebCodecs while running in a Node.js environment.

## License

MIT
