# Creating Custom Clips

One of the most powerful features of `@openvideo/timeline` is its ability to handle any custom clip type. This is achieved through a capability-based architecture.

## 1. Define the Fabric Class

Your custom clip must be a Fabric.js object class. By convention, the class name should be the PascalCase version of your type name (e.g., type `"myClip"` -> class `MyClip`).

```typescript
import { Rect, classRegistry } from "fabric";

class MyCustomClip extends Rect {
  static type = "MyCustomClip";

  // Capability Flags
  public isTrimmable = true;
  public isResizable = false;

  constructor(options) {
    super(options);
    // Initialize your clip
  }

  // Required: Implement the sync method
  public sync(itemDetail, tScale) {
    // Update visual properties based on state data
    this.set({
      fill: itemDetail.details.color || "blue",
    });

    // Always call setCoords to update interaction hit areas
    this.setCoords();
  }
}

// Register with Fabric
classRegistry.setClass(MyCustomClip, "MyCustomClip");
```

## 2. Capability Flags

The timeline engine checks for specific boolean flags on your object to determine which interactions are allowed:

- `isTrimmable`: Allows the user to drag the left/right edges to change the start/end time.
- `isResizable`: Allows the user to drag handles to change the visual size (width/height) of the clip.
- `hasSrc`: If true, the `SyncManager` will check for source changes and call `setSrc(newSrc)` if it exists.

## 3. Register the Type

When initializing the `Timeline`, add your type to the `itemTypes` array and configure its behavior.

```typescript
const timeline = new Timeline({
  canvas: canvas,
  itemTypes: ["video", "text", "myCustomClip"], // Add here
  acceptsMap: {
    main: ["video", "myCustomClip"], // Define where it can be dropped
  },
  sizesMap: {
    myCustomClip: 50, // Define its track height
  },
});
```

## 4. Handling Interaction Events

The timeline emits specific events when your custom clip is interacted with.

```typescript
// For new additions via drag-and-drop
timeline.on("add:mycustomclip", ({ payload, options }) => {
  // Add the new clip to your application state
  const newClip = createClip(payload);
  dispatch(addClip(newClip));
});
```

## Advanced: Custom Controls

You can customize the appearance of the trimming or resizing handles by overriding the `drawControls` method or providing a custom `controls` object in your Fabric class, although the timeline provides high-quality defaults for `trimmable` and `resizable` objects.
