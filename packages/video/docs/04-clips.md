# Clips

Clips are the building blocks of your video composition. DesignCombo supports three types of clips: Video, Image, and Text.

## Video Clips

### Loading Video Clips

```ts
// Load from URL
});

// Load from File object
const videoClip = await Combo.Video.fromFile(file, {
  x: 0,
  y: 0,
});

// Load from Blob
const videoClip = await Combo.Video.fromBlob(blob);
```

### Video Properties

```ts
videoClip.set({
  // Position
  x: 100,
  y: 200,

  // Size
  width: 800,
  height: 600,
  scale: 1.0,

  // Transform
  rotation: 0,
  opacity: 1.0,

  // Timeline
  display: {
    from: 0,
    to: 300,
  },

  // Playback
  volume: 0.8,
  muted: false,
  playbackRate: 1.0,

  // Trim video
  trim: {
    start: 0, // Trim from start (ms)
    end: 5000, // Trim from end (ms)
  },
});
```

### Video Methods

```ts
// Get video metadata
console.log(videoClip.duration); // Total duration in ms
console.log(videoClip.width); // Original width
console.log(videoClip.height); // Original height
console.log(videoClip.fps); // Frame rate

// Control playback
videoClip.play();
videoClip.pause();
videoClip.seek(1500); // Seek to 1.5 seconds

// Get current state
console.log(videoClip.currentTime); // Current position
console.log(videoClip.isPlaying); // Playing state
```

## Image Clips

### Loading Image Clips

```ts
// Load from URL
const imageClip = await Combo.Image.fromUrl("photo.jpg", {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
});

// Load from File object
const imageClip = await Combo.Image.fromFile(file);

// Load from data URL
const imageClip = await Combo.Image.fromDataUrl(dataUrl);
```

### Image Properties

```ts
imageClip.set({
  // Position
  x: 100,
  y: 200,

  // Size
  width: 800,
  height: 600,
  scale: 1.0,

  // Maintain aspect ratio
  fit: "cover", // "cover", "contain", "fill", "none"

  // Transform
  rotation: 45,
  opacity: 0.8,

  // Timeline
  display: {
    from: 0,
    to: 150,
  },

  // Filters
  filters: {
    brightness: 1.2,
    contrast: 1.1,
    saturation: 0.9,
    blur: 0,
  },
});
```

### Image Fit Modes

```ts
// Cover - fills the area, may crop
imageClip.set({ fit: "cover" });

// Contain - fits within area, may show letterbox
imageClip.set({ fit: "contain" });

// Fill - stretches to fill area
imageClip.set({ fit: "fill" });

// None - original size
imageClip.set({ fit: "none" });
```

## Text Clips

### Creating Text Clips

```ts
const textClip = new Combo.Text("Hello World", {
  fontSize: 48,
  fontFamily: "Arial",
  x: 960,
  y: 540,
  color: "#ffffff",
});
```

### Text Properties

```ts
textClip.set({
  // Content
  text: "Updated text",

  // Font
  fontSize: 64,
  fontFamily: "Ubuntu",
  fontWeight: "bold", // "normal", "bold", "100"-"900"
  fontStyle: "italic", // "normal", "italic"

  // Color
  color: "#ff0000",

  // Stroke
  strokeColor: "#000000",
  strokeWidth: 2,

  // Background
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  padding: 20,

  // Alignment
  textAlign: "center", // "left", "center", "right"
  textBaseline: "middle", // "top", "middle", "bottom"

  // Position
  x: 960,
  y: 540,

  // Transform
  rotation: 0,
  opacity: 1.0,
  scale: 1.0,

  // Timeline
  display: {
    from: 0,
    to: 300,
  },

  // Line height
  lineHeight: 1.5,
  letterSpacing: 0,

  // Max width (for text wrapping)
  maxWidth: 800,
});
```

### Text Styling

```ts
// Multi-line text
const textClip = new Combo.Text("Line 1\nLine 2\nLine 3", {
  fontSize: 48,
  textAlign: "center",
  lineHeight: 1.5,
});

// Text with shadow
textClip.set({
  shadowColor: "rgba(0, 0, 0, 0.5)",
  shadowBlur: 10,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
});

// Text with gradient (if supported)
textClip.set({
  gradient: {
    type: "linear",
    x0: 0,
    y0: 0,
    x1: 100,
    y1: 0,
    stops: [
      { offset: 0, color: "#ff0000" },
      { offset: 1, color: "#0000ff" },
    ],
  },
});
```

## Common Clip Operations

### Positioning

```ts
// Absolute positioning
clip.set({ x: 100, y: 200 });

// Center on canvas
clip.centerX();
clip.centerY();
clip.center(); // Both X and Y

// Align to edges
clip.alignLeft(margin);
clip.alignRight(margin);
clip.alignTop(margin);
clip.alignBottom(margin);
```

### Sizing

```ts
// Set explicit size
clip.set({ width: 800, height: 600 });

// Scale proportionally
clip.set({ scale: 1.5 });

// Fit to canvas
clip.fitToCanvas();
clip.fillCanvas();
```

### Rotation

```ts
// Set rotation in degrees
clip.set({ rotation: 45 });

// Rotate around custom origin
clip.set({
  rotation: 45,
  originX: 0.5, // 0 = left, 0.5 = center, 1 = right
  originY: 0.5, // 0 = top, 0.5 = center, 1 = bottom
});
```

### Opacity

```ts
// Set opacity (0-1)
clip.set({ opacity: 0.5 });

// Fade in/out (use animations)
clip.animate({
  property: "opacity",
  fromValue: 0,
  toValue: 1,
  startFrame: 0,
  duration: 30,
});
```

### Layering (Z-Index)

```ts
// Set layer order
clip.set({ zIndex: 10 });

// Bring to front/back
clip.bringToFront();
clip.sendToBack();
clip.bringForward();
clip.sendBackward();
```

### Visibility

```ts
// Show/hide clip
clip.show();
clip.hide();
clip.set({ visible: true });

// Check visibility
if (clip.isVisible) {
  // Clip is visible
}
```

## Clip Events

Listen to clip events:

```ts
// Loading events
clip.on("load", () => {
  console.log("Clip loaded");
});

clip.on("error", (error) => {
  console.error("Failed to load clip:", error);
});

// Playback events (video clips)
videoClip.on("play", () => console.log("Playing"));
videoClip.on("pause", () => console.log("Paused"));
videoClip.on("ended", () => console.log("Ended"));

// Property changes
clip.on("change", (property, value) => {
  console.log(`${property} changed to ${value}`);
});

// Timeline events
clip.on("enter", (frame) => {
  console.log(`Clip entered at frame ${frame}`);
});

clip.on("exit", (frame) => {
  console.log(`Clip exited at frame ${frame}`);
});
```

## Cloning Clips

```ts
// Create a copy of a clip
const clone = clip.clone();

// Clone with modifications
const clone = clip.clone({
  x: 200,
  y: 300,
  opacity: 0.5,
});
```

## Removing Clips

```ts
// Remove from studio
studio.remove(clip);

// Destroy clip and free resources
clip.destroy();
```

## Advanced: Custom Clips with PixiJS

DesignCombo is built on PixiJS, so you can create custom clips using PixiJS containers and sprites.

### Basic Custom Clip

Create custom clip types using PixiJS:

```ts
import * as PIXI from "pixi.js";

class CustomClip extends Combo.Clip {
  constructor(options) {
    super(options);

    // Create PixiJS container
    this.container = new PIXI.Container();

    // Add custom graphics
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff6600);
    graphics.drawRect(0, 0, this.width, this.height);
    graphics.endFill();

    this.container.addChild(graphics);
  }

  render(frame) {
    // Update container properties
    this.container.x = this.x;
    this.container.y = this.y;
    this.container.rotation = this.rotation * (Math.PI / 180);
    this.container.alpha = this.opacity;

    // Return PixiJS container
    return this.container;
  }
}

// Use custom clip
const custom = new CustomClip({ x: 0, y: 0, width: 100, height: 100 });
studio.add(custom);
```

### Custom Sprite Clip

```ts
class SpriteClip extends Combo.Clip {
  constructor(texture, options) {
    super(options);

    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5);
  }

  render(frame) {
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.scale.set(this.scale);
    this.sprite.rotation = this.rotation * (Math.PI / 180);
    this.sprite.alpha = this.opacity;

    return this.sprite;
  }
}

// Use sprite clip
const texture = await PIXI.Texture.from("sprite.png");
const spriteClip = new SpriteClip(texture, { x: 500, y: 500 });
studio.add(spriteClip);
```

**Advanced Example:** See [Advanced Topics](./13-advanced.md#custom-rendering-with-pixijs) for more PixiJS integration examples.

## Best Practices

1. **Load clips asynchronously** - Use `await` or `.then()` for loading
2. **Dispose unused clips** - Call `clip.destroy()` to free memory
3. **Optimize sizes** - Don't load 4K videos if you only need 1080p
4. **Preload assets** - Load all clips before starting playback
5. **Use appropriate formats** - MP4 (H.264) for video, JPG/PNG for images
6. **Cache loaded clips** - Reuse clips instead of loading multiple times
7. **Set explicit dimensions** - Specify width/height for consistent results
