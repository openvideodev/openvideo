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

## Architecture
OpenVideo follows a strict "Brain-Muscle-UI" separation to ensure composability and AI-first workflows.

- **`openvideo/core` (The Brain)**: Headless, deterministic engine containing all business logic and state.
- **`openvideo/engine-*` (The Muscle)**: Platform-specific adapters that render state to pixels (PixiJS, Remotion, Skia).
- **`openvideo/timeline` (The UI)**: Reference UI package for building editor interfaces.
- **`openvideo/agents` (The AI Layer)**: High-level agentic editing layer that operates on Core commands.

Detailed documentation is available in the `docs/architecture` directory:
- [Clean Architecture](docs/architecture/clean-architecture.md)
- [Command System](docs/architecture/command-system.md)
- [Agentic Editing](docs/architecture/agents.md)
- [DX Patterns](docs/architecture/dx-patterns.md)

## Installation

```bash
npm install openvideo
```

## Quick Start

### Basic Composition

```typescript
import { createCore } from '@openvideo/core';
import { PixiEngine } from '@openvideo/engine-pixi';

// 1. Initialize the Core (The Brain)
const core = createCore();

// 2. Attach a Rendering Engine (The Muscle)
const engine = new PixiEngine({
  canvas: document.getElementById('preview-canvas'),
  core
});

// 3. Add a Clip via Command API
core.clip.add({
  src: 'https://example.com/video.mp4',
  start: 0,
  duration: 5
});

// 4. Start Playback
core.play();
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

For inquiries, support, or custom solutions, reach out to us at [hello@openvideo.dev](mailto:hello@openvideo.dev).

## License

See [LICENSE](LICENSE).
