<p align="center">
  <a href="https://github.com/designcombo/react-video-editor">
    <img width="150px" height="150px" src="https://cdn.designcombo.dev/combo-logo-black.png"/>
  </a>
</p>
<h1 align="center">Combo Video SDK</h1>

<div align="center">
  
A high-performance video rendering and processing library for the web, built with WebCodecs and PixiJS.

<p align="center">
    <a href="https://designcombo.dev/">Combo</a>
    ·  
    <a href="https://discord.gg/2ytdyHBu">Discord</a>
    ·  
    <a href="https://github.com/designcombo/ai-video-editor">X</a>
</p>
</div>


## Features

- **Browser-Based Rendering**: Leverages modern WebCodecs for efficient video encoding and decoding directly in the browser.
- **Advanced Composition**: Powered by [PixiJS](https://pixijs.com/) for complex multi-track layering, transforms, and real-time previews.
- **Universal Clip Support**: Built-in support for Video, Audio, Image, Text, and Captions.
- **Dynamic Effects & Transitions**: Extensible GLSL-based effects (Chromakey, etc.) and transitions.
- **JSON Serialization**: Full project state can be serialized to and from JSON for easy persistence and cloud rendering.
- **Low Latency**: Optimized for interactive video editing experiences.

## Installation

```bash
npm install @designcombo/video
```

## Quick Start

### Basic Composition

```typescript
import { Compositor, VideoClip, Studio } from '@designcombo/video';

// 1. Initialize the Studio (Project State)
const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30
});

// 2. Add a Video Clip
const clip = new VideoClip({
  src: 'https://example.com/video.mp4',
  start: 0,
  duration: 5000, // 5 seconds
});
studio.addClip(clip);

// 3. Initialize the Compositor
const compositor = new Compositor({
  studio,
  canvas: document.getElementById('preview-canvas') as HTMLCanvasElement
});

// 4. Start Preview / Rendering
compositor.play();
```

## Core Components

- **`Studio`**: Manages the project state, including tracks, clips, and timeline configuration.
- **`Compositor`**: The rendering engine that handles playback, seeking, and final export using WebCodecs.
- **`Clips`**: Specialized objects for different media types (`VideoClip`, `AudioClip`, `TextClip`, etc.).
- **`JsonSerialization`**: Utilities to convert your entire project into a portable JSON format.

## Technology Stack

- **WebCodecs**: For ultra-fast, hardware-accelerated video processing.
- **PixiJS**: For a robust and performant 2D/3D rendering engine.
- **wrapbox**: Internal utility for low-level MP4 box manipulation and muxing.

## License

See [LICENSE](LICENSE).
