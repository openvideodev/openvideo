# OpenVideo Command System

## Overview

The OpenVideo Command System is the central mechanism for state mutation in the `openvideo/core` package. It follows an **event-sourced, command-driven** architecture to ensure determinism, collaboration readiness, and robust undo/redo capabilities.

## Design Principles

1.  **Atomic Intent**: Every command represents a single, atomic intent (e.g., `clip.add`). No command does multiple unrelated things.
2.  **No Direct Mutation**: Command handlers do not mutate the state directly; they return a list of **Patches**.
3.  **Serializable**: All commands and patches are strictly serializable to support collaboration, persistence, and agent execution.
4.  **Deterministic**: Handlers must be pure, side-effect free, and deterministic. No `Math.random()` or `fetch()` inside handlers.
5.  **Strict Namespacing**: Commands are grouped into logical, verb-based namespaces using dot notation (e.g., `clip.setDuration`).
6.  **Explicit IDs**: IDs are always explicit and never implicitly created inside handlers.

## Core Types

### Command
```ts
type Command<T = any> = {
  id: string;              // unique uuid
  type: string;            // e.g., "clip.add"
  payload: T;
  meta?: {
    userId?: string;
    timestamp?: number;
    source?: "user" | "agent" | "system";
  };
};
```

### Patch (CRDT-friendly)
```ts
type Patch =
  | { op: "add"; path: string; value: any }
  | { op: "update"; path: string; value: any }
  | { op: "remove"; path: string };
```

## Namespaces & Commands

### `project.*`
- `project.create`, `project.load`, `project.reset`, `project.updateMeta` (name, fps, resolution)

### `timeline.*` (Global time logic)
- `timeline.setDuration`, `timeline.setFps`, `timeline.setZoom`, `timeline.setScroll`, `timeline.setPlayhead`

### `track.*`
- `track.add`, `track.remove`, `track.move`, `track.update` (locked, muted, hidden)

### `clip.*` (Core lifecycle & Visuals)
- `clip.add`, `clip.remove`, `clip.duplicate`, `clip.move`, `clip.trim`, `clip.split`
- `clip.setPosition`, `clip.setScale`, `clip.setRotation`, `clip.setOpacity`
- `clip.replaceSource`, `clip.setVolume`, `clip.mute`

### `asset.*` (Global assets)
- `asset.add`, `asset.remove`, `asset.update`

### `effect.*`
- `effect.add`, `effect.remove`, `effect.update`, `effect.reorder`

### `transition.*`
- `transition.add`, `transition.remove`, `transition.update`

### `animation.*` (Keyframes)
- `animation.add`, `animation.update`, `animation.addKeyframe`, `animation.removeKeyframe`

### `selection.*`
- `selection.set`, `selection.add`, `selection.clear`

### `playback.*`
- `playback.play`, `playback.pause`, `playback.seek`

## Execution Pipeline

1.  **Validation**: `validate(command)` checks if the command is valid for the current state.
2.  **Handling**: `handler(state, command)` returns `Patches`.
3.  **Application**: `applyPatches(state, patches)` updates the store.
4.  **History**: Command, patches, and **inverse patches** are pushed to history for Undo/Redo.
5.  **Emission**: One `change` event is emitted per execution (or batch).

## Batching & Transactions

```ts
core.batch([
  { type: "clip.add", payload: { ... } },
  { type: "effect.add", payload: { ... } }
]);
```

## High-Level Command API (DX Layer)

Developers should use a clean, wrapped API:
```ts
core.clip.add({
  trackId: "track_1",
  src: "video.mp4"
});
```
