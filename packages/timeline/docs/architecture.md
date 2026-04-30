# Architecture Overview

The `@designcombo/timeline` engine is designed with a clear separation between state management and visual rendering. It uses a centralized "Manager" pattern to handle different aspects of the timeline lifecycle.

## Core Managers

### SyncManager
The bridge between your application state and the Fabric.js canvas. It handles:
- Declarative synchronization of clips and tracks.
- Partial updates (timing only, properties only).
- State extraction (`getUpdatedState`) to emit changes back to the app.

### ItemsManager
Manages the lifecycle of individual clip objects:
- Loading clips from data.
- Alignment and positioning within tracks.
- Selection and deletion logic.

### TracksManager
Responsible for the horizontal track background and magnetic behavior:
- Rendering track rectangles.
- Magnetic gap calculation and adjustment.
- Managing "Helper" tracks (the gaps between tracks used for creating new ones).

## Data Normalization

To ensure robustness, the engine implements several normalization patterns:

- **Case-Insensitivity**: All type-based lookups (for `acceptsMap` and `sizesMap`) are normalized to lowercase. This prevents bugs when mixing "Text" and "text" strings between different layers of your application.
- **Unit Conversion**: Internal logic often works in "units" (pixels) while exposing "time" (microseconds) to the application. Use `timeUsToUnits` and `unitsToTimeUs` utilities for conversions.

## Interaction Lifecycle

1. **User Action**: User drags a clip or a handle.
2. **Managers Respond**: `DragManager` or `Controls` calculate new coordinates based on track constraints and snapping.
3. **Internal Update**: The Fabric object properties are updated.
4. **State Emission**: `SyncManager.updateState()` is triggered, extracting the new values and emitting a `STATE_CHANGED` event.
5. **App Loop**: Your application receives the event, updates its central state, and (optionally) calls `syncTracksAndClips` back to the timeline to finalize the visual state.

## Extensibility Pattern

The architecture favors **Polymorphism over Type Checking**. Instead of large `switch` statements checking `if (type === 'Video')`, the engine checks for capabilities:

```typescript
if (object.isTrimmable) {
  // Apply trimming controls and logic
}
```

This allows you to add new clip types simply by implementing the required interface, without ever touching the core engine files.
