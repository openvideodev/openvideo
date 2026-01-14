# Events

DesignCombo Studio emits events throughout the lifecycle of your composition, allowing you to listen for state changes, user interactions, and playback updates.

## Event System Overview

The Studio class extends an EventEmitter, providing a robust event system for:

- **Lifecycle Events**: When the studio is ready, destroyed, or rendered
- **Playback Events**: Play, pause, seek, and frame updates
- **Transform Events**: When objects are moved, scaled, or rotated
- **Selection Events**: When objects are selected or deselected
- **Mouse Events**: Mouse down, move, and up interactions
- **Object Events**: Object clicks and interactions

## Basic Event Listening

### Using `on()`

```ts
import { Studio } from "@designcombo/video";

const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  bgColor: "#000000",
  canvas: document.getElementById("canvas-element"),
});

// Listen for clip added event
studio.on("clip:added", (event) => {
  console.log("Clip added:", event.clip);
});
```

## Lifecycle Events

### `ready`

Emitted when the studio is fully initialized and ready to use.

```ts
studio.on("ready", () => {
  console.log("Studio is ready to use");
});
```

### `destroy`

Emitted when the studio is destroyed.

```ts
studio.on("destroy", () => {
  console.log("Studio has been destroyed");
});

// Later...
studio.destroy();
```

## Playback Events

### `play`

Emitted when playback starts.

```ts
studio.on("play", (frame) => {
  console.log("Started playing at frame:", frame);
});

studio.play(); // Triggers the event with current frame
```

### `pause`

Emitted when playback is paused.

```ts
studio.on("pause", (frame) => {
  console.log("Paused at frame:", frame);
});

studio.pause(); // Triggers the event with current frame
```

### `frameUpdate` / `currentframe`

Emitted on every frame update during playback.

```ts
studio.on("frameUpdate", (frame) => {
  console.log("Frame:", frame);
  // Update your UI with current frame number
});

// Also available as 'currentframe'
studio.on("currentframe", (frame) => {
  console.log("Current frame:", frame);
});
```

### `seek`

Emitted when seeking to a different frame.

```ts
studio.on("seek", (frame) => {
  console.log("Seeked to frame:", frame);
});

await studio.seek(100); // Seeks to frame 100
```

## Transform Events

### `object:modified`

Emitted when an object's transformation is complete (after release).

```ts
studio.on("object:modified", (event) => {
  const { target, transform } = event;
  console.log("Object modified:", target);
  console.log("Transform action:", transform?.action);
});

// This event fires after you finish moving/scaling/rotating an object
```

### `object:moving`

Emitted continuously while an object is being moved or scaled.

```ts
studio.on("object:moving", (event) => {
  console.log("Object is being moved:", event.target);
});
```

### `object:transforming`

Emitted when an object starts being transformed.

```ts
studio.on("object:transforming", (event) => {
  console.log("Transforming started:", event.target);
});
```

## Selection Events

### `selection:created`

Emitted when objects are first selected.

```ts
studio.on("selection:created", (event) => {
  const { selected, target } = event;
  console.log("Selection created:", selected);
  console.log("Target object:", target);
});
```

### `selection:updated`

Emitted when selection changes (objects added or removed from selection).

```ts
studio.on("selection:updated", (event) => {
  console.log("Newly selected:", event.selected);
  console.log("Deselected:", event.deselected);
});
```

### `selection:cleared`

Emitted when all selections are cleared.

```ts
studio.on("selection:cleared", (event) => {
  console.log("Selection cleared:", event.deselected);
});
```

## Mouse Events

### `mouse:down`

Emitted when the mouse button is pressed.

```ts
studio.on("mouse:down", (event) => {
  const { target, pointer, e } = event;
  console.log("Mouse down at:", pointer.x, pointer.y);
  console.log("Target:", target);
  console.log("Original event:", e);
});
```

### `mouse:move`

Emitted when the mouse moves.

```ts
studio.on("mouse:move", (event) => {
  const { target, pointer } = event;
  console.log("Mouse at:", pointer.x, pointer.y);
});
```

### `mouse:up`

Emitted when the mouse button is released.

```ts
studio.on("mouse:up", (event) => {
  const { target, pointer } = event;
  console.log("Mouse up at:", pointer.x, pointer.y);
});
```

## Object Interaction Events

### `object:clicked`

Emitted when an object is clicked.

```ts
studio.on("object:clicked", (event) => {
  const { target, pointer, e } = event;
  console.log("Object clicked:", target);
  console.log("Click position:", pointer.x, pointer.y);
  console.log("Original event:", e);
});
```

## Removing Event Listeners

### Using `off()`

```ts
const handler = (frame: number) => {
  console.log("Frame:", frame);
};

studio.on("frameUpdate", handler);

// Later, remove the listener
studio.off("frameUpdate", handler);
```

### Using `once()`

Listen for an event only once:

```ts
studio.once("ready", () => {
  console.log("This will only fire once");
});
```

## Best Practices

### 1. Clean Up Listeners

Always remove event listeners when components unmount:

```ts
// React example
useEffect(() => {
  const handler = (frame: number) => {
    setCurrentFrame(frame);
  };

  studio.on("frameUpdate", handler);

  return () => {
    studio.off("frameUpdate", handler);
  };
}, [studio]);
```

### 3. Avoid Expensive Operations

Keep event handlers lightweight to maintain smooth playback:

```ts
// Good: Simple operations
studio.on("frameUpdate", (frame) => {
  updateFrameDisplay(frame);
});

// Bad: Heavy operations in frame updates
studio.on("frameUpdate", (frame) => {
  doHeavyComputation(); // This will cause stuttering
});

// Better: Debounce heavy operations
studio.on(
  "frameUpdate",
  debounce((frame) => {
    updateComplexUI(frame);
  }, 100)
);
```

## Complete Event Example

```ts
import { Studio } from "designcombo";

const studio = new Studio("canvas-element");
await studio.init();

// Set up event listeners
studio.on("frameUpdate", (frame) => {
  updateTimelinePosition(frame);
});

studio.on("object:modified", (event) => {
  saveUndoState();
  console.log("Object modified:", event.target);
});

// Start playback
studio.play();
```

## Event Reference

| Event Name            | Payload                   | When Emitted                |
| --------------------- | ------------------------- | --------------------------- |
| `ready`               | `undefined`               | Studio is initialized       |
| `destroy`             | `undefined`               | Studio is destroyed         |
| `play`                | `number` (frame)          | Playback starts             |
| `pause`               | `number` (frame)          | Playback pauses             |
| `frameUpdate`         | `number` (frame)          | Every frame during playback |
| `currentframe`        | `number` (frame)          | Same as frameUpdate         |
| `seek`                | `number` (frame)          | Seeking to a frame          |
| `object:modified`     | `ObjectModifiedEvent`     | Object transform complete   |
| `object:moving`       | `ObjectMovingEvent`       | Object is being moved       |
| `object:transforming` | `ObjectTransformingEvent` | Object transform starts     |
| `selection:created`   | `SelectionCreatedEvent`   | Objects selected            |
| `selection:updated`   | `SelectionUpdatedEvent`   | Selection changes           |
| `selection:cleared`   | `SelectionClearedEvent`   | Selection cleared           |
| `mouse:down`          | `MouseDownEvent`          | Mouse button pressed        |
| `mouse:move`          | `MouseMoveEvent`          | Mouse moves                 |
| `mouse:up`            | `MouseUpEvent`            | Mouse button released       |
| `object:clicked`      | `ObjectClickedEvent`      | Object is clicked           |

## Next Steps

- [Studio API](./03-studio.md) - Master studio management
- [Tracks](./09-tracks.md) - Organize your effects
- [API Reference](./12-api-reference.md) - Complete API documentation
