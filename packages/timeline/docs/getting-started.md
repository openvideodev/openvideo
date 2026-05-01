# Getting Started

Integrating `@openvideo/timeline` into your project involves three main steps: setting up the Fabric.js canvas, initializing the `Timeline` class, and establishing the state synchronization loop.

## 1. Setup Canvas

The timeline engine requires a Fabric.js `Canvas` (version 6+ recommended).

```typescript
import { Canvas } from "fabric";

const fabricCanvas = new Canvas("timeline-canvas", {
  width: 800,
  height: 400,
  backgroundColor: "#111",
  selection: true // Recommended for multi-select
});
```

## 2. Initialize Timeline

Initialize the `Timeline` class by providing your canvas and configuration maps.

```typescript
import { Timeline } from "@openvideo/timeline";

const timeline = new Timeline({
  canvas: fabricCanvas,
  // Define which types are known to the timeline
  itemTypes: ["video", "image", "text", "audio"],
  // Define track acceptance rules
  acceptsMap: {
    video: ["video", "image"],
    audio: ["audio"],
    text: ["text", "caption"]
  },
  // Define visual heights for different track types
  sizesMap: {
    video: 60,
    audio: 40,
    text: 40
  }
});
```

### Configuration Options

- `acceptsMap`: A mapping where keys are track types and values are arrays of accepted clip types. If a track type is missing, it defaults to accepting all `itemTypes`.
- `sizesMap`: A mapping where keys are track types and values are their vertical height in pixels.

> [!TIP]
> Both `acceptsMap` and `sizesMap` keys are treated case-insensitively by the engine.

## 3. Synchronize State

The timeline uses a declarative synchronization pattern. You should sync your application state to the timeline whenever it changes.

```typescript
// Initial sync or full update
timeline.syncTracksAndClips({
  tracks: state.tracks,
  clips: state.clips,
  duration: state.duration
});

// Update specific properties without full re-render
timeline.syncClipProperties({
  clips: updatedClips,
  changedTrimIds: ["clip-1"],
  changedDisplayIds: ["clip-1"]
});
```

## 4. Listen for Changes

The timeline emits events when interactions occur (drags, trims, deletes). You should listen to these events to update your application state.

```typescript
timeline.on("STATE_CHANGED", ({ payload, options }) => {
  const { clips, tracks, duration } = payload;
  
  // Update your app state (Redux, Zustand, etc.)
  updateProjectState({ clips, tracks, duration });
});
```

For a list of all events, see the [API Reference](./api-reference.md).
