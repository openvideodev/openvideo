# Basic Usage

## Creating a Studio

```ts
import { Studio } from "@designcombo/video";

const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  bgColor: "#ffffff",
  canvas: document.getElementById("canvas") as HTMLCanvasElement,
});
```

## Adding Clips

### Adding Image Clips
```ts
// Load image clip asynchronously
const imageClip = await Combo.Image.fromUrl("photo.jpg", {
  x: 100,
  y: 100,
  width: 800,
  height: 600,
});

// Set timeline position (in frames)
imageClip.set({
  display: {
    from: 0, // frames
    to: 150, // frames (5 seconds at 30fps)
  },
});

studio.add(imageClip);
```

### Adding Video Clips

```ts
// Load video clip asynchronously
const videoClip = await Combo.Video.fromUrl("clip.mp4", {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
});

// Set timeline position
videoClip.set({
  display: {
    from: 150, // frames
    to: 450, // frames (10 seconds at 30fps)
  },
});

studio.add(videoClip);
```

### Adding Text Clips

```ts
const textClip = new Combo.Text("Hello World", {
  fontSize: 48,
  fontFamily: "Ubuntu",
  x: 960,
  y: 540,
  color: "#ffffff",
});

// Set timeline position
textClip.set({
  display: {
    from: 0, // frames
    to: 500, // frames
  },
});

// Update text properties
textClip.set({
  fontSize: 64,
  color: "red",
  fontWeight: "bold",
});

studio.add(textClip);
```

## Loading Multiple Clips in Parallel

```ts
// Efficient parallel loading
const [imageClip1, imageClip2, videoClip] = await Promise.all([
  Combo.Image.fromUrl("photo1.jpg"),
  Combo.Image.fromUrl("photo2.jpg"),
  Combo.Video.fromUrl("clip1.mp4"),
]);

// Set timeline positions
imageClip1.set({ display: { from: 0, to: 150 } });
imageClip2.set({ display: { from: 150, to: 300 } });
videoClip.set({ display: { from: 300, to: 600 } });

studio.add(imageClip1, imageClip2, videoClip);
```

## Handling Loading States

```ts
try {
  const videoClip = await Combo.Video.fromUrl("clip.mp4");
  studio.add(videoClip);
  console.log("Video clip loaded successfully");
} catch (error) {
  console.error("Failed to load video clip:", error);
}
```
