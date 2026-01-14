# Studio

The Studio is the interactive workspace for your video editing. It manages the visual canvas, selection, transformation, and real-time editing of clips and objects.

## Creating a Studio

```ts
    backgroundColor: 0xf5f5f5,
    antialias: true,
  },
});

await studio.init();
```

## Configuration Options

### StudioSettings

```ts
interface StudioSettings {
  width?: number; // Artboard width (default: 800)
  height?: number; // Artboard height (default: 600)
  backgroundColor?: number; // Canvas background color (hex)
  antialias?: boolean; // Enable antialiasing (default: true)
  artboard?: ArtboardConfig; // Advanced artboard settings
}
```

### TransformerOptions

```ts
const studio = new Combo.Studio("canvas-element", {
  transformerOptions: {
    rotateEnabled: true,
    scaleEnabled: true,
    translateEnabled: true,
    wireframeStyle: {
      color: 0xa855f7,
      thickness: 2.5,
    },
  },
});
```

### SelectionBoxStyle

```ts
const studio = new Combo.Studio("canvas-element", {
  selectionBoxStyle: {
    strokeColor: 0x007acc,
    strokeWidth: 2,
    strokeAlpha: 0.8,
    fillColor: 0x007acc,
    fillAlpha: 0.1,
  },
});
```

## Adding and Removing Objects

### add()

Add objects to the studio:

```ts
const rect = new RectEffect({ x: 100, y: 100, width: 200, height: 200 });
studio.add(rect);

const circle = new CircleEffect({ x: 300, y: 300, radius: 50 });
studio.add(circle);
```

### remove()

Remove objects from the studio:

```ts
studio.remove(rect);
```

## Selection Management

### setActiveObject()

Select a specific object:

```ts
studio.setActiveObject(circle.container);
```

### clearSelection()

Clear all selections:

```ts
studio.clearSelection();
```

### activeObject

Get the currently selected object:

```ts
const selected = studio.activeObject;
if (selected) {
  console.log("Object selected");
}
```

### activeObjects

Get all selected objects (multi-selection):

```ts
const allSelected = studio.activeObjects;
console.log(`${allSelected.length} objects selected`);
```

## Transformation

The studio automatically shows transform controls when objects are selected. Users can:

- **Drag** to move objects
- **Drag corners** to resize
- **Drag rotation handle** to rotate
- **Selection box** for multi-select

### Transform Events

```ts
const studio = new Combo.Studio(
  "canvas-element",
  {},
  {
    onTransformStart: (objects) => {
      console.log("Transform started", objects);
    },
    onTransformChange: (objects, delta) => {
      console.log("Transforming", delta);
    },
    onTransformCommit: (objects) => {
      console.log("Transform committed", objects);
    },
  }
);
```

## Selection Events

```ts
const studio = new Combo.Studio(
  "canvas-element",
  {},
  {
    onSelectionChange: (objects) => {
      console.log(`${objects.length} objects selected`);
    },
    onSelectionBoxStart: (point) => {
      console.log("Selection box started");
    },
    onSelectionBoxMove: (box) => {
      console.log("Selection box moving", box);
    },
    onSelectionBoxEnd: (objects) => {
      console.log(`Selected ${objects.length} objects via box`);
    },
  }
);
```

## Lifecycle Events

```ts
const studio = new Combo.Studio(
  "canvas-element",
  {},
  {
    onStudioReady: () => {
      console.log("Studio is ready");
    },
    onStudioDestroy: () => {
      console.log("Studio destroyed");
    },
  }
);
```

## Artboard

The studio includes an internal artboard (composition area) where objects are placed. The artboard:

- Clips child objects with a mask
- Centers in the canvas viewport
- Can have custom background and border

```ts
const studio = new Combo.Studio("canvas-element", {
  settings: {
    width: 1920,
    height: 1080,
    artboard: {
      backgroundColor: 0xffffff,
      borderColor: 0xe0e0e0,
      borderWidth: 1,
    },
  },
});
```

## Coordinate Conversion

### screenToArtboard()

Convert screen coordinates to artboard coordinates:

```ts
const artboardPos = studio.screenToArtboard(mouseX, mouseY);
```

### artboardToScreen()

Convert artboard coordinates to screen coordinates:

```ts
const screenPos = studio.artboardToScreen(objectX, objectY);
```

## Cleanup

### destroy()

Clean up and destroy the studio:

```ts
studio.destroy();
```

This will:

- Remove all event listeners
- Destroy the PixiJS application
- Clean up all containers
- Free memory

## Complete Example

```ts
import { Studio, RectEffect, CircleEffect } from "designcombo";

// Create studio
const studio = new Studio(
  document.querySelector("canvas"),
  {
    settings: {
      width: 1920,
      height: 1080,
      backgroundColor: 0x222222,
    },
    transformerOptions: {
      rotateEnabled: true,
      scaleEnabled: true,
      translateEnabled: true,
    },
    selectionBoxStyle: {
      strokeColor: 0x007acc,
      strokeWidth: 2,
    },
  },
  {
    onSelectionChange: (objects) => {
      console.log(`${objects.length} objects selected`);
    },
    onTransformCommit: (objects) => {
      console.log("Transform committed");
    },
    onStudioReady: () => {
      console.log("Studio ready!");
    },
  }
);

// Initialize
await studio.init();

// Add objects
const rect = new RectEffect({
  x: 200,
  y: 200,
  width: 400,
  height: 300,
  fillColor: 0xff0000,
});

const circle = new CircleEffect({
  x: 800,
  y: 500,
  radius: 100,
  fillColor: 0x00ff00,
});

studio.add(rect);
studio.add(circle);

// Select an object
studio.setActiveObject(circle.container);

// Later: cleanup
// studio.destroy();
```

## Next Steps

- [Working with Clips](./04-clips.md) - Load and configure media
- [Animations](./05-animations.md) - Add motion to your videos
- [Transitions](./06-transitions.md) - Create smooth transitions
