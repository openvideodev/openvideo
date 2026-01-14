# Advanced Topics

## Working with PixiJS

DesignCombo is built on PixiJS, giving you access to powerful GPU-accelerated rendering.

### Accessing the PixiJS Stage

Access the underlying PixiJS application:

```ts
import { Studio } from "@designcombo/video";

const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  canvas: document.getElementById("canvas-container") as HTMLCanvasElement,
});

// Access PixiJS application
const pixiApp = studio.pixiApp;
const stage = pixiApp.stage;

// Add custom PixiJS sprites
const sprite = new PIXI.Sprite(texture);
stage.addChild(sprite);
```

### Custom Rendering with PixiJS

Create custom clips using PixiJS containers:

```ts
import * as PIXI from "pixi.js";
import { ImageClip } from "@designcombo/video";

class CustomPixiClip extends ImageClip {
  constructor(options) {
    super(options);
    // ...
  }
}
```

### Using PixiJS Filters as Effects

Leverage PixiJS's built-in filters:

```ts
import { BlurFilter, ColorMatrixFilter } from "pixi.js";

// Create effect using PixiJS filter
class PixiBlurEffect extends Combo.Effect {
  constructor(options) {
    super(options);
    this.pixiFilter = new BlurFilter(options.radius);
  }

  apply(container) {
    if (!container.filters) {
      container.filters = [];
    }
    container.filters.push(this.pixiFilter);
  }

  set(properties) {
    if (properties.radius !== undefined) {
      this.pixiFilter.blur = properties.radius;
    }
  }
}

const blurEffect = new PixiBlurEffect({ radius: 10 });
clip.addEffect(blurEffect);
```

### Advanced PixiJS Integration

```ts
// Access clip's PixiJS container
const container = clip.container;

// Add custom PixiJS filters
const filter = new PIXI.filters.ColorMatrixFilter();
filter.brightness(1.5, true);
container.filters = [filter];

// Custom ticker
studio.pixiApp.ticker.add((delta) => {
  // Custom per-frame logic
  console.log(`Delta: ${delta}`);
});
```

### Checking WebCodecs Support

(Check browser support for WebCodecs API)

```ts
if ("VideoEncoder" in window) {
  console.log("WebCodecs supported!");
} else {
  console.log("WebCodecs not available - export will not work");
}
```

### Custom Video Processing

Work directly with WebCodecs for advanced use cases:

```ts
// Access decoded video frames
videoClip.on("frameDecoded", (videoFrame) => {
  // videoFrame is a VideoFrame from WebCodecs API
  // Process frame directly
  console.log(videoFrame.timestamp);
  console.log(videoFrame.codedWidth);
});
```

### Encoding Options

Configure WebCodecs encoder settings:

```ts
await studio.export({
  format: "mp4",
  encoder: {
    codec: "avc1.42E01E", // H.264 baseline
    width: 1920,
    height: 1080,
    bitrate: 5_000_000, // 5 Mbps
    framerate: 30,
    hardwareAcceleration: "prefer-hardware",
    latencyMode: "quality", // "quality" or "realtime"
  },
});
```

### Hardware Acceleration

Leverage hardware encoding when available:

```ts
const encoderConfig = {
  codec: "avc1.42E01E",
  hardwareAcceleration: "prefer-hardware", // "no-preference", "prefer-hardware", "prefer-software"
};

// Check if config is supported
const support = await VideoEncoder.isConfigSupported(encoderConfig);
if (support.supported) {
  console.log("Hardware acceleration available!");
}
```

## Performance Optimization

### WebGL Rendering Optimization

```ts
// Configure PixiJS renderer
const studio = new Combo.Studio("canvas-container", {
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
  },
  renderer: {
    antialias: false, // Disable for better performance
    resolution: 1, // Device pixel ratio
    autoDensity: true,
    powerPreference: "high-performance",
    clearBeforeRender: true,
  },
});
```

### Texture Management

```ts
// Optimize texture usage
studio.optimize({
  texturePool: true, // Reuse textures
  maxTextureSize: 2048, // Limit texture size
  generateMipmaps: false, // Disable for better performance
  unloadInvisible: true, // Unload offscreen textures
});
```

### Frame Caching

```ts
// Cache rendered frames for better playback
studio.setRenderSettings({
  cacheFrames: true,
  maxCachedFrames: 300, // Cache up to 300 frames
  cacheQuality: "medium", // "low", "medium", "high"
});
```

### Batch Rendering

```ts
// Batch multiple operations
studio.batch(() => {
  studio.add(clip1, clip2, clip3);
  studio.addTransition(clip1, clip2, { type: "fade", duration: 30 });
  studio.addTransition(clip2, clip3, { type: "fade", duration: 30 });
  // Only renders once after all changes
});
```

## WebGL Shaders

Create custom effects using WebGL shaders (PixiJS):

```ts
import { Filter } from "pixi.js";

// Custom shader effect
const fragmentShader = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float time;
  
  void main() {
    vec4 color = texture2D(uSampler, vTextureCoord);
    color.rgb += sin(time + vTextureCoord.y * 10.0) * 0.1;
    gl_FragColor = color;
  }
`;

class WaveEffect extends Combo.Effect {
  constructor() {
    super();
    this.filter = new Filter(null, fragmentShader, {
      time: 0,
    });
  }

  apply(container, frame) {
    this.filter.uniforms.time = frame * 0.01;
    if (!container.filters) {
      container.filters = [];
    }
    container.filters.push(this.filter);
  }
}

const waveEffect = new WaveEffect();
clip.addEffect(waveEffect);
```

## Custom Clip Rendering

Leverage PixiJS containers for custom rendering:

```ts
class ParticleClip extends Combo.Clip {
  constructor(options) {
    super(options);

    this.container = new PIXI.Container();
    this.particles = [];

    // Create particles
    for (let i = 0; i < 100; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(0xffffff);
      particle.drawCircle(0, 0, 2);
      particle.endFill();

      this.particles.push({
        sprite: particle,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      });

      this.container.addChild(particle);
    }
  }

  render(frame) {
    // Update particles each frame
    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around
      if (particle.x < 0) particle.x = this.width;
      if (particle.x > this.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.height;
      if (particle.y > this.height) particle.y = 0;

      particle.sprite.x = particle.x;
      particle.sprite.y = particle.y;
    }

    return this.container;
  }
}

const particles = new ParticleClip({ width: 1920, height: 1080 });
studio.add(particles);
```

## WebCodecs Frame Processing

Process video frames with WebCodecs:

```ts
// Custom frame processor
class FrameProcessor {
  async processFrame(videoFrame) {
    // videoFrame is WebCodecs VideoFrame
    const canvas = new OffscreenCanvas(
      videoFrame.codedWidth,
      videoFrame.codedHeight
    );
    const ctx = canvas.getContext("2d");

    // Draw and process
    ctx.drawImage(videoFrame, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Custom processing
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      // Invert colors
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }

    ctx.putImageData(imageData, 0, 0);

    // Create new VideoFrame from processed data
    return new VideoFrame(canvas, {
      timestamp: videoFrame.timestamp,
    });
  }
}

// Apply to clip
const processor = new FrameProcessor();
videoClip.setFrameProcessor(processor);
```

## Memory Management

### With PixiJS

```ts
// Proper cleanup for PixiJS textures
studio.on("clipRemoved", (clip) => {
  // Destroy PixiJS resources
  if (clip.texture) {
    clip.texture.destroy(true);
  }
  if (clip.container) {
    clip.container.destroy({ children: true, texture: true });
  }
});
```

### With WebCodecs

```ts
// Properly close VideoFrames to free memory
videoClip.on("frameProcessed", (frame) => {
  // Always close VideoFrames when done
  frame.close();
});

// Clean up decoder/encoder
studio.on("exportComplete", () => {
  studio.closeEncoders();
});
```

## Extending DesignCombo

### Custom Studio Extensions

```ts
class ExtendedStudio extends Combo.Studio {
  constructor(container, options) {
    super(container, options);

    // Add custom functionality
    this.customData = {};
  }

  addCustomFeature() {
    // Custom studio method
  }

  // Override render method
  async render(frame) {
    // Pre-render logic
    await super.render(frame);
    // Post-render logic
  }
}

const studio = new ExtendedStudio("el", { settings: {...} });
```

### Plugin System

```ts
// Create a plugin
class Plugin {
  install(scene) {
    // Add methods to studio
    studio.customMethod = () => {
      console.log("Custom functionality!");
    };

    // Listen to studio events
    studio.on("frameUpdate", (frame) => {
      // Plugin logic
    });
  }
}

// Use plugin
const plugin = new Plugin();
plugin.install(scene);
```

## WebGL Context Management

### Context Loss Handling

```ts
studio.on("webglContextLost", () => {
  console.log("WebGL context lost - pausing");
  studio.pause();
});

studio.on("webglContextRestored", () => {
  console.log("WebGL context restored");
  // Reload textures
  studio.reloadTextures();
});
```

### Multiple Studios

```ts
// Share WebGL context between studios
const studio1 = new Combo.Studio("container1", {
  settings: { width: 1920, height: 1080, fps: 30 },
  sharedContext: true,
});

const studio2 = new Combo.Studio("container2", {
  settings: { width: 1920, height: 1080, fps: 30 },
  sharedContext: scene1.pixiApp.renderer.context,
});
```

## WebCodecs Best Practices

### Encoder Configuration

```ts
// Optimal settings for different platforms
const isMobile = /Mobile|Android/i.test(navigator.userAgent);

await studio.export({
  format: "mp4",
  encoder: {
    codec: "avc1.42E01E",
    bitrate: isMobile ? 2_000_000 : 5_000_000,
    hardwareAcceleration: "prefer-hardware",
    latencyMode: "quality",
  },
});
```

### Frame Rate Conversion

```ts
// Export at different frame rate
await studio.export({
  format: "mp4",
  fps: 60, // Export at 60fps even if studio is 30fps
  frameRateConversion: "interpolate", // "interpolate" or "duplicate"
});
```

### Chunk-based Encoding

For very long videos, encode in chunks:

```ts
async function exportLongVideo() {
  const chunks = Math.ceil(studio.duration / 300); // 300 frames per chunk

  for (let i = 0; i < chunks; i++) {
    const startFrame = i * 300;
    const endFrame = Math.min((i + 1) * 300, studio.duration);

    await studio.export({
      format: "mp4",
      startFrame,
      endFrame,
      filename: `chunk-${i}.mp4`,
    });
  }

  // Merge chunks server-side
}
```

## PixiJS Filters Integration

Map PixiJS filters to DesignCombo effects:

```ts
import { BlurFilter, AdjustmentFilter, NoiseFilter } from "@pixi/filter-blur";

// Create DesignCombo effect from PixiJS filter
class PixiFilterEffect extends Combo.Effect {
  constructor(pixiFilter, options = {}) {
    super(options);
    this.pixiFilter = pixiFilter;
  }

  apply(container) {
    if (!container.filters) {
      container.filters = [];
    }
    container.filters.push(this.pixiFilter);
  }

  remove(container) {
    if (container.filters) {
      const index = container.filters.indexOf(this.pixiFilter);
      if (index > -1) {
        container.filters.splice(index, 1);
      }
    }
  }
}

// Use any PixiJS filter
const pixiBlur = new BlurFilter(8);
const effect = new PixiFilterEffect(pixiBlur);
clip.addEffect(effect);

// Update filter
pixiBlur.blur = 15;
```

## Render Pipeline

### Custom Render Pipeline

Hook into the render pipeline:

```ts
studio.on("beforeRender", (frame) => {
  // Pre-render processing
  console.log(`Preparing frame ${frame}`);
});

studio.on("afterRender", (frame, canvas) => {
  // Post-render processing
  const ctx = canvas.getContext("2d");
  // Apply custom post-processing
});

studio.on("beforeExport", () => {
  // Optimize for export
  studio.pixiApp.renderer.resolution = 1;
});

studio.on("afterExport", () => {
  // Restore settings
  studio.pixiApp.renderer.resolution = window.devicePixelRatio;
});
```

### Custom Compositor

Create a custom compositing layer:

```ts
class CustomCompositor {
  compose(layers, frame) {
    const container = new PIXI.Container();

    // Custom layer composition logic
    for (const layer of layers) {
      if (this.shouldRenderLayer(layer, frame)) {
        const sprite = this.createSprite(layer);
        container.addChild(sprite);
      }
    }

    return container;
  }
}

studio.setCompositor(new CustomCompositor());
```

## Debugging

### PixiJS DevTools

Enable PixiJS debugging:

```ts
const studio = new Combo.Studio("el", {
  settings: { width: 1920, height: 1080, fps: 30 },
  debug: true,
});

// Access PixiJS stats
console.log(studio.pixiApp.renderer.plugins);
console.log(studio.pixiApp.stage.children.length);

// Enable PixiJS debug mode
studio.pixiApp.renderer.debug = true;
```

### Performance Monitoring

```ts
// Monitor frame timing
studio.on("frameUpdate", (frame) => {
  const start = performance.now();

  studio.on("afterRender", () => {
    const renderTime = performance.now() - start;
    console.log(`Frame ${frame} rendered in ${renderTime}ms`);
  });
});

// Monitor memory
setInterval(() => {
  if (performance.memory) {
    console.log(`Used: ${performance.memory.usedJSHeapSize / 1048576}MB`);
    console.log(`Total: ${performance.memory.totalJSHeapSize / 1048576}MB`);
  }
}, 1000);
```

### WebCodecs Debugging

```ts
// Monitor encoder state
studio.on("encoderStateChange", (state) => {
  console.log(`Encoder state: ${state}`);
});

// Track encoding queue
studio.on("frameEncoded", ({ frame, queueSize }) => {
  console.log(`Frame ${frame} encoded, queue: ${queueSize}`);
});
```

## Best Practices

### PixiJS

1. **Reuse containers** - Don't create new containers each frame
2. **Batch sprite updates** - Update multiple sprites, then render once
3. **Use sprite pools** - Recycle sprites instead of creating new ones
4. **Optimize textures** - Use texture atlases, power-of-2 sizes
5. **Cull offscreen objects** - Don't render invisible items
6. **Limit filter usage** - Filters are expensive, use sparingly
7. **Destroy resources** - Always destroy textures/sprites when done

### WebCodecs

1. **Close VideoFrames** - Always call `frame.close()` when done
2. **Manage encoder queue** - Don't overflow the encode queue
3. **Handle errors** - Encoding can fail, always handle errors
4. **Hardware acceleration** - Prefer hardware encoding when available
5. **Chunk long videos** - Encode very long videos in chunks
6. **Monitor memory** - WebCodecs can use significant memory
7. **Test on target devices** - Encoding performance varies by device

## Platform-Specific Optimizations

### Desktop (Chrome/Edge)

```ts
// Use maximum quality and performance
await studio.export({
  format: "mp4",
  quality: "ultra",
  encoder: {
    hardwareAcceleration: "prefer-hardware",
    latencyMode: "quality",
  },
  useWorkers: true,
  workerThreads: 4,
});
```

### Mobile (Safari iOS/Android)

```ts
// Optimize for mobile constraints
await studio.export({
  format: "mp4",
  quality: "medium",
  encoder: {
    codec: "avc1.42E01E", // Baseline profile for compatibility
    bitrate: 2_000_000,
    hardwareAcceleration: "prefer-hardware",
    latencyMode: "realtime",
  },
  width: 1280, // Lower resolution for mobile
  height: 720,
  useWorkers: false, // Limited workers on mobile
});
```

## Troubleshooting

### WebGL Not Available

```ts
if (!Combo.checkSupport().webgl) {
  console.error("WebGL not supported");
  // Provide fallback or error message
}
```

### WebCodecs Not Available

```ts
if (!Combo.checkSupport().webcodecs) {
  console.warn("WebCodecs not supported - export disabled");
  // Offer alternative: frame sequence export
  await studio.exportFrameSequence({
    format: "png",
    onFrame: (frame, blob) => {
      // Download or upload frames
    },
  });
}
```

### Out of Memory

```ts
studio.on("outOfMemory", () => {
  // Reduce quality
  studio.setRenderSettings({
    resolution: 0.5,
    maxCachedFrames: 50,
  });

  // Clear caches
  studio.clearCache();

  // Force garbage collection (if available)
  if (window.gc) window.gc();
});
```

## Integration Examples

### React Integration

```ts
import { useEffect, useRef } from "react";
import * as Combo from "designcombo";

function VideoEditor() {
  const containerRef = useRef(null);
  const studioRef = useRef(null);

  useEffect(() => {
    const studio = new Combo.Studio(containerRef.current, {
      settings: { width: 1920, height: 1080, fps: 30 },
    });

    sceneRef.current = scene;

    return () => {
      studio.destroy();
    };
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue Integration

```ts
<template>
  <div ref="container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import * as Combo from "designcombo";

const container = ref(null);
let scene = null;

onMounted(() => {
  scene = new Combo.Studio(container.value, {
    settings: { width: 1920, height: 1080, fps: 30 },
  });
});

onUnmounted(() => {
  scene?.destroy();
});
</script>
```

## Resources

- [PixiJS Documentation](https://pixijs.com/docs)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [WebGL Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [Performance Best Practices](https://pixijs.com/guides/performance)
