# DesignCombo Documentation

Welcome to the DesignCombo documentation! DesignCombo is a framework-agnostic video editor SDK built on the WebCodecs API.

## Table of Contents

1. [Installation](./01-installation.md) - Get started with DesignCombo
2. [Basic Usage](./02-basic-usage.md) - Learn the fundamentals
3. [Studio API](./03-studio.md) - Master studio management
4. [Clips](./04-clips.md) - Work with video, image, and text clips
5. [Animations](./05-animations.md) - Add motion and effects
6. [Transitions](./06-transitions.md) - Create smooth transitions
7. [Effects](./07-effects.md) - Apply filters and visual effects
8. [Audio](./08-audio.md) - Handle audio tracks and mixing
9. [Tracks](./09-tracks.md) - Organize and layer your composition
10. [Events](./10-events.md) - Listen to studio events and user interactions
11. [Rendering & Export](./11-rendering-and-export.md) - Export your videos
12. [API Reference](./12-api-reference.md) - Complete API documentation
13. [Advanced Topics](./13-advanced.md) - PixiJS integration, WebCodecs, custom rendering

## Quick Start

```ts
import * as Combo from "@designcombo/video";


// Create a studio
const studio = new Combo.Studio({
  width: 1920,
  height: 1080,
  fps: 30,
});

// Load clips
const [videoClip, imageClip] = await Promise.all([
  Combo.Video.fromUrl("clip.mp4"),
  Combo.Image.fromUrl("photo.jpg"),
]);

// Position on timeline
videoClip.set({ display: { from: 0, to: 300 } });
imageClip.set({ display: { from: 300, to: 450 } });

// Add to studio
studio.add(videoClip, imageClip);

// Add transition
studio.addTransition(videoClip, imageClip, {
  type: "fade",
  duration: 30,
});

// Play preview
studio.play();

// Export
await studio.export({
  format: "mp4",
  quality: "high",
});
```

## Core Concepts

### Studio

The Studio is the main container for your video composition. It manages all clips, transitions, timeline, playback, and rendering.

### Tracks

Tracks organize and layer your effects. They provide efficient rendering, layering control, and lifecycle management for effects in your composition.

### Clips

Clips are the building blocks - video, image, and text elements positioned on the timeline.

### Timeline

Frame-based timeline where all clips and effects are positioned. Uses frames instead of milliseconds for precision.

### Animations

Property-based animations with keyframes, easing, and presets.

### Transitions

Visual effects applied between consecutive clips on the timeline.

### Effects

Filters and visual modifications applied to clips (brightness, blur, color correction, etc.).

## Key Features

- ✅ **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS
- ✅ **WebCodecs Powered** - Fast, native video encoding/decoding
- ✅ **TypeScript** - Full type safety and IntelliSense
- ✅ **Frame-Based Timeline** - Precise frame-level control
- ✅ **Track Organization** - Layer and group effects with magnetic positioning
- ✅ **Rich Animations** - Keyframes, presets, and easing functions
- ✅ **Multiple Export Formats** - MP4, WebM, GIF
- ✅ **Audio Support** - Multiple audio tracks with mixing
- ✅ **Real-time Preview** - Instant playback in the browser
- ✅ **Extensible** - Custom clips, effects, and transitions

## API Overview

### Studio Methods

```ts
// Adding items
studio.add(clip, transition);
studio.remove(clip);

// Playback
studio.play();
studio.pause();
studio.seek(frame);

// Timeline
studio.getDuration();
studio.getCurrentFrame();

// Querying
studio.getClips();
studio.getTransitions();
studio.getClipsAtFrame(150);

// Export
await studio.export({ format: "mp4" });
```

### Clip Methods

```ts
// Properties
clip.set({ x, y, width, height, rotation, opacity });

// Timeline
clip.set({ display: { from: 0, to: 300 } });

// Animations
clip.animate({
  property: "x",
  fromValue: 0,
  toValue: 1920,
  startFrame: 0,
  duration: 90,
});

// Effects
clip.addEffect(new Combo.Effect.Blur({ radius: 10 }));
```

### Transitions

```ts
const transition = studio.addTransition(clip1, clip2, {
  type: "fade",
  duration: 30,
});
```

## Examples

### Simple Video Edit

```ts
const studio = new Combo.Studio({
  width: 1920, 
  height: 1080, 
  fps: 30 
});

const clip1 = await Combo.Video.fromUrl("clip1.mp4");
const clip2 = await Combo.Video.fromUrl("clip2.mp4");

clip1.set({ display: { from: 0, to: 300 } });
clip2.set({ display: { from: 300, to: 600 } });

studio.add(clip1, clip2);
studio.addTransition(clip1, clip2, { type: "fade", duration: 30 });

await studio.export({ format: "mp4" });
```

### Text Animation

```ts
const text = new Combo.Text("Hello World", {
  fontSize: 72,
  x: 960,
  y: 540,
});

text.animate("fadeIn", { startFrame: 0, duration: 30 });
text.animate("slideOutRight", { startFrame: 270, duration: 30 });

studio.add(text);
```

### Image Slideshow

```ts
const images = await Promise.all([
  Combo.Image.fromUrl("photo1.jpg"),
  Combo.Image.fromUrl("photo2.jpg"),
  Combo.Image.fromUrl("photo3.jpg"),
]);

images[0].set({ display: { from: 0, to: 150 } });
images[1].set({ display: { from: 150, to: 300 } });
images[2].set({ display: { from: 300, to: 450 } });

studio.add(...images);
studio.addTransition(images[0], images[1], {
  type: "slide",
  direction: "left",
  duration: 30,
});
studio.addTransition(images[1], images[2], { type: "zoom", duration: 30 });
```

## Browser Support

Built on **PixiJS (WebGL)** for rendering and **WebCodecs** for video export.

| Browser | Version | WebGL | WebCodecs | Status         |
| ------- | ------- | ----- | --------- | -------------- |
| Chrome  | 94+     | ✅    | ✅        | Full support   |
| Edge    | 94+     | ✅    | ✅        | Full support   |
| Safari  | 16.4+   | ✅    | ✅        | Full support   |
| Firefox | 100+    | ✅    | ⚠️        | Preview only\* |

\*Firefox has limited WebCodecs support. Preview works via WebGL, but video export may be limited.

## Technology Stack

- **PixiJS** - GPU-accelerated WebGL rendering engine
- **WebCodecs** - Hardware-accelerated video encoding/decoding
- **Web Workers** - Multi-threaded processing for better performance

## Resources

- [GitHub Repository](https://github.com/designcombo/combo-sdk)
- [NPM Package](https://npmjs.com/package/designcombo)
- [Examples & Demos](https://designcombo.dev/examples)
- [API Reference](https://designcombo.dev/api)

## Community

- [Discord](https://discord.gg/designcombo)
- [Twitter](https://twitter.com/designcombo)
- [GitHub Discussions](https://github.com/designcombo/combo-sdk/discussions)

## Contributing

We welcome contributions! See our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

See [LICENSE](../../LICENSE) for license information.
