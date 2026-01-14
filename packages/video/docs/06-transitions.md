# Transitions

Transitions create smooth visual effects between two consecutive clips on the timeline. They are applied at the boundary where one clip ends and another begins.

## Basic Transition

```ts
    height: 1080,
    fps: 30,
    backgroundColor: "#000000",
  },
});

// Load clips asynchronously
const imageClip = await Combo.Image.fromUrl("photo1.jpg", {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
});

const videoClip = await Combo.Video.fromUrl("clip1.mp4", {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
});

// Position clips consecutively on timeline
imageClip.set({
  display: {
    from: 0,
    to: 500,
  },
});

videoClip.set({
  display: {
    from: 500,
    to: 1000,
  },
});

// Add clips to studio
studio.add(imageClip, videoClip);

// Add transition between clips
const transition = studio.addTransition(imageClip, videoClip, {
  type: "fade",
  duration: 30, // 30 frames (1 second at 30fps)
});
```

## How Transitions Work

When you create a transition between two clips:

1. **Clips must be consecutive**: The second clip's `from` frame must equal the first clip's `to` frame
2. **Duration extends backward**: A transition with `duration: 30` will start 30 frames before the boundary
3. **Overlap is automatic**: The SDK handles the visual overlap during the transition

```ts
// Clip 1: frames 0-500
// Clip 2: frames 500-1000
// Transition duration: 30 frames
// → Transition occurs from frame 470 to frame 500

studio.add(clip1, clip2);
studio.addTransition(clip1, clip2, {
  type: "fade",
  duration: 30,
});
```

## Transition Types

### Fade

Simple cross-fade between clips:

```ts
const videoClip1 = await Combo.Video.fromUrl("clip1.mp4");
const videoClip2 = await Combo.Video.fromUrl("clip2.mp4");

videoClip1.set({ display: { from: 0, to: 300 } });
videoClip2.set({ display: { from: 300, to: 600 } });

studio.add(videoClip1, videoClip2);

const fadeTransition = studio.addTransition(videoClip1, videoClip2, {
  type: "fade",
  duration: 45,
});
```

### Dissolve

Cross-dissolve effect with optional color:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "dissolve",
  duration: 30,
  color: "#ffffff", // dissolve through white
});
```

### Wipe

Directional wipe effects:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "wipe",
  direction: "left", // "left", "right", "up", "down"
  duration: 45,
});

// Circular wipe
studio.addTransition(videoClip1, videoClip2, {
  type: "wipe",
  direction: "circular",
  duration: 60,
});
```

### Slide

Slide second clip over the first:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "slide",
  direction: "right", // "left", "right", "up", "down"
  duration: 45,
});
```

### Zoom

Scale-based transitions:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "zoom",
  direction: "in", // "in" or "out"
  duration: 45,
  scale: 0.5, // starting scale for incoming clip
});
```

### Blur

Blur-based transitions:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "blur",
  duration: 30,
  maxBlur: 20, // maximum blur radius in pixels
});
```

## Transitions Between Different Clip Types

Transitions work between any combination of video clips and image clips:

```ts
// Load all clips asynchronously
const [imageClip1, videoClip, imageClip2] = await Promise.all([
  Combo.Image.fromUrl("photo1.jpg", {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  }),
  Combo.Video.fromUrl("clip1.mp4", {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  }),
  Combo.Image.fromUrl("photo2.jpg", {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  }),
]);

// Set timeline positions
imageClip1.set({ display: { from: 0, to: 150 } });
videoClip.set({ display: { from: 150, to: 450 } });
imageClip2.set({ display: { from: 450, to: 600 } });

// Add clips to studio
studio.add(imageClip1, videoClip, imageClip2);

// Add transitions between clips
studio.addTransition(imageClip1, videoClip, {
  type: "zoom",
  direction: "in",
  duration: 30,
});

studio.addTransition(videoClip, imageClip2, {
  type: "slide",
  direction: "left",
  duration: 30,
});
```

## Advanced Transitions

### Custom Easing

Control transition timing with easing functions:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "fade",
  duration: 45,
  easing: "easeInOut", // smooth acceleration and deceleration
});
```

Available easing options: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInBack`, `easeOutBack`, `easeInOutBack`

### Split Screen Transitions

Create split-screen wipe effects:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "split",
  direction: "horizontal", // "horizontal" or "vertical"
  duration: 60,
});
```

### Pixelate Transition

Pixelate effect:

```ts
studio.addTransition(imageClip1, imageClip2, {
  type: "pixelate",
  duration: 45,
  maxPixelSize: 40, // maximum pixel size
});
```

### Glitch Transition

Digital glitch effect:

```ts
studio.addTransition(videoClip1, videoClip2, {
  type: "glitch",
  duration: 30,
  intensity: 0.8, // glitch intensity (0-1)
});
```

## Multiple Transitions

Create a sequence with multiple transitions:

```ts
// Load all video clips in parallel
const [videoClip1, videoClip2, videoClip3] = await Promise.all([
  Combo.Video.fromUrl("clip1.mp4"),
  Combo.Video.fromUrl("clip2.mp4"),
  Combo.Video.fromUrl("clip3.mp4"),
]);

// Position clips consecutively
videoClip1.set({ display: { from: 0, to: 300 } });
videoClip2.set({ display: { from: 300, to: 600 } });
videoClip3.set({ display: { from: 600, to: 900 } });

// Add clips to studio
studio.add(videoClip1, videoClip2, videoClip3);

// Add different transitions between each pair
studio.addTransition(videoClip1, videoClip2, {
  type: "fade",
  duration: 30,
});

studio.addTransition(videoClip2, videoClip3, {
  type: "wipe",
  direction: "left",
  duration: 45,
});
```

## Managing Transitions

### Updating Transitions

You can modify transition properties after creation:

```ts
const videoClip1 = await Combo.Video.fromUrl("clip1.mp4");
const videoClip2 = await Combo.Video.fromUrl("clip2.mp4");

// Add transition
const transition = studio.addTransition(videoClip1, videoClip2, {
  type: "fade",
  duration: 30,
});

// Update transition properties
transition.set({
  type: "slide",
  direction: "left",
  duration: 45,
});
```

### Removing Transitions

```ts
// Remove transition from studio
scene.remove(transition);

// Or remove transition between two clips
scene.removeTransitionBetween(videoClip1, videoClip2);
```

### Accessing Transition Properties

```ts
const videoClip1 = await Combo.Video.fromUrl("clip1.mp4");
const videoClip2 = await Combo.Video.fromUrl("clip2.mp4");

const transition = studio.addTransition(videoClip1, videoClip2, {
  type: "fade",
  duration: 30,
});

console.log(transition.type); // "fade"
console.log(transition.duration); // 30
console.log(transition.from); // reference to videoClip1
console.log(transition.to); // reference to videoClip2

// Query transition
const foundTransition = scene.getTransitionBetween(videoClip1, videoClip2);
```

## Transition Presets

Use preset transition styles for quick setup:

```ts
// Load video clips
const [videoClip1, videoClip2, videoClip3, videoClip4] = await Promise.all([
  Combo.Video.fromUrl("clip1.mp4"),
  Combo.Video.fromUrl("clip2.mp4"),
  Combo.Video.fromUrl("clip3.mp4"),
  Combo.Video.fromUrl("clip4.mp4"),
]);

// Add clips to studio
studio.add(videoClip1, videoClip2, videoClip3, videoClip4);

// Apply common preset
studio.addTransition(videoClip1, videoClip2, {
  preset: "crossFade",
  duration: 30,
});

// Cinematic preset
studio.addTransition(videoClip2, videoClip3, {
  preset: "cinematic",
  duration: 45,
});

// Fast cut preset
studio.addTransition(videoClip3, videoClip4, {
  preset: "fastCut",
  duration: 10,
});
```

### Available Presets

- `crossFade` - Smooth fade between elements
- `cinematic` - Dramatic fade with easing
- `fastCut` - Quick fade with minimal duration
- `smoothSlide` - Slide with easing
- `creative` - Random creative transition effect

## Best Practices

1. **Duration**: Typical transitions are 15-45 frames (0.5-1.5 seconds at 30fps)
2. **Consecutive Clips**: Ensure clips are positioned consecutively (clip2.from === clip1.to)
3. **Consistency**: Use similar transition durations and types within a scene for cohesion
4. **Don't Overuse**: Too many or overly long transitions can be distracting
5. **Match Content**: Choose transitions that fit the mood and pacing of your content
6. **Performance**: Shorter transitions (< 60 frames) render faster than longer ones

## Validation

The SDK will validate transitions and throw errors if:

```ts
const imageClip = await Combo.Image.fromUrl("photo1.jpg");
const videoClip = await Combo.Video.fromUrl("clip1.mp4");

// ❌ Clips are not consecutive
imageClip.set({ display: { from: 0, to: 100 } });
videoClip.set({ display: { from: 150, to: 300 } }); // Gap of 50 frames
studio.addTransition(imageClip, videoClip, {
  type: "fade",
  duration: 30,
});
// Error: Clips must be consecutive on the timeline

// ❌ Duration is longer than the first clip
imageClip.set({ display: { from: 0, to: 20 } });
videoClip.set({ display: { from: 20, to: 200 } });
studio.addTransition(imageClip, videoClip, {
  type: "fade",
  duration: 30,
});
// Error: Transition duration (30) exceeds first clip duration (20)

// ✅ Valid transition
imageClip.set({ display: { from: 0, to: 100 } });
videoClip.set({ display: { from: 100, to: 300 } });
studio.add(imageClip, videoClip);
studio.addTransition(imageClip, videoClip, {
  type: "fade",
  duration: 30,
});
// Transition will occur from frame 70 to frame 100
```
