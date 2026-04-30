# @designcombo/timeline

A high-performance, type-agnostic timeline engine built on Fabric.js. This package provides the core logic for managing temporal layouts, magnetic tracks, and multi-media synchronization in video editing applications.

## Key Features

- **Type-Agnostic Architecture**: Register any custom clip type (Video, Audio, Text, Captions, etc.) without modifying the core engine.
- **Magnetic Tracks**: Professional-grade magnetic track behavior with automatic gap removal and clip shifting.
- **High Precision**: Microsecond-based temporal management ensuring frame-accurate synchronization.
- **Capability-Based Logic**: Simple property-based contracts (`isTrimmable`, `isResizable`) drive complex interactions.
- **Extensible Controls**: Customizable resizing and trimming handles per clip type.
- **Generic Drag & Drop**: Robust validation and automatic track creation logic.

## Documentation Index

1. [Getting Started](./getting-started.md) - How to integrate the timeline into your project.
2. [Custom Clips](./custom-clips.md) - Creating and registering your own clip types.
3. [Architecture](./architecture.md) - Deep dive into how the engine works.
4. [API Reference](./api-reference.md) - Detailed documentation of classes and methods.

## Installation

```bash
npm install @designcombo/timeline
# or
pnpm add @designcombo/timeline
```

## Quick Example

```typescript
import { Timeline } from "@designcombo/timeline";

const timeline = new Timeline({
  canvas: myFabricCanvas,
  itemTypes: ["video", "image", "text"],
  acceptsMap: {
    video: ["video", "image"],
    text: ["text"]
  },
  sizesMap: {
    video: 60,
    text: 40
  }
});

// Sync state from your application
timeline.syncTracksAndClips({
  tracks: myTracks,
  clips: myClips,
  duration: totalDuration
});
```
