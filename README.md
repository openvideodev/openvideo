<p align="center">
  <a href="https://github.com/openvideodev/openvideo">
    <img width="150px" height="150px" src="https://cdn.scenify.io/openvideo-logo.png"/>
  </a>
</p>
<h1 align="center">OpenVideo</h1>

<div align="center">
  
  
A high-performance video rendering and processing library for the web, built with WebCodecs and PixiJS.

<p align="center">
    <a href="https://openvideo.dev/">OpenVideo</a>
    ·  
    <a href="https://discord.gg/SCfMrQx8kr">Discord</a>
    ·  
    <a href="https://docs.openvideo.dev">Docs</a>
</p>
</div>

[![](https://cdn.scenify.io/openvideo-editor.png)](https://github.com/openvideodev/openvideo)

## Official Editors

The editor has been removed from this core repository and moved to dedicated repositories. We now offer two official, open-source video editors built on top of OpenVideo:

- **React Video Editor**: [GitHub Repository](https://github.com/openvideodev/video-editor) | [Live Demo](https://editor.openvideo.dev/)
- **Vue Video Editor**: [GitHub Repository](https://github.com/openvideodev/vue-video-editor) | [Live Demo](https://vue-video-editor.vercel.app/)

## Features

- **Browser-Based Rendering**: Leverages modern WebCodecs for efficient video encoding and decoding directly in the browser.
- **Advanced Composition**: Powered by [PixiJS](https://pixijs.com/) for complex multi-track layering, transforms, and real-time previews.
- **Universal Clip Support**: Built-in support for Video, Audio, Image, Text, and Captions.
- **Dynamic Effects & Transitions**: Extensible GLSL-based effects (Chromakey, etc.) and transitions.
- **JSON Serialization**: Full project state can be serialized to and from JSON for easy persistence and cloud rendering.
- **Low Latency**: Optimized for interactive video editing experiences.

## Documentation

Comprehensive documentation is available at [docs.openvideo.dev](https://docs.openvideo.dev).

## Installation

```bash
npm install openvideo
```

## Quick Start

### Basic Composition

```typescript
import { Studio, Video } from 'openvideo';

// 1. Initialize the Studio (Project State & Preview)
const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  canvas: document.getElementById('preview-canvas') as HTMLCanvasElement,
  spacing: 20
});

// 2. Load and add a Video Clip
const video = await Video.fromUrl('https://example.com/video.mp4');
await studio.addClip(video);

// 3. Start Preview
studio.play();
```

## Core Components

- **`Studio`**: Manages the project state, including tracks, clips, and timeline configuration.
- **`Compositor`**: The rendering engine that handles playback, seeking, and final export using WebCodecs.
- **`Clips`**: Specialized objects for different media types (`Video`, `Audio`, `Text`, `Image`, `Caption`, etc.).
- **`JsonSerialization`**: Utilities to convert your entire project into a portable JSON format.

## Technology Stack

- **WebCodecs**: For ultra-fast, hardware-accelerated video processing.
- **PixiJS**: For a robust and performant 2D/3D rendering engine.
- **wrapbox**: Internal utility for low-level MP4 box manipulation and muxing.


## Contact

For inquiries, support, or custom solutions, reach out to us at [cloud@designcombo.dev](mailto:cloud@designcombo.dev).

## License

See [LICENSE](LICENSE).
