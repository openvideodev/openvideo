# Installation

## Package Manager

Install DesignCombo using your preferred package manager:

```bash
# pnpm (recommended)
pnpm add @designcombo/video

# npm
npm install @designcombo/video

# yarn
yarn add @designcombo/video
```

**Note:** DesignCombo includes PixiJS as a dependency - no need to install it separately.

## Browser Support

DesignCombo requires modern browsers with support for:

- **WebCodecs API** - For video encoding/decoding (required)
- **WebGL** - For hardware-accelerated rendering (required)
- **Web Workers** - For background processing
- **ES2020+** - Modern JavaScript features

### Supported Browsers

| Browser | Version | WebCodecs | Notes                          |
| ------- | ------- | --------- | ------------------------------ |
| Chrome  | 94+     | ✅        | Full support, best performance |
| Edge    | 94+     | ✅        | Full support                   |
| Safari  | 16.4+   | ✅        | Full support (macOS/iOS)       |
| Firefox | 100+    | ⚠️        | Limited WebCodecs support      |

**Note:** WebCodecs support is required for video export. Preview rendering works in all browsers with WebGL support.

## Quick Start

```ts
import * as Combo from "designcombo";

const studio = new Combo.Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  bgColor: "#000000",
  canvas: document.getElementById("canvas-container"), // Optional
});

// Load a video clip
const videoClip = await Combo.Video.fromUrl("video.mp4");
videoClip.set({ display: { from: 0, to: 300 } });

// Add to studio
studio.add(videoClip);

// Play preview
studio.play();
```

## TypeScript

DesignCombo is written in TypeScript and includes full type definitions:

```ts
import * as Combo from "designcombo";

const studio: Combo.Studio = new Combo.Studio("el", { settings: {...} });
```

## CDN (Browser)

For quick prototyping, use the CDN version:

```html
<script type="module">
  import * as Combo from "https://cdn.jsdelivr.net/npm/designcombo/+esm";

  const studio = new Combo.Studio("canvas-container", {
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
    },
  });
</script>
```

## Verifying Installation

```ts
import * as Combo from "designcombo";

console.log(Combo.version); // Check version

// Check browser capabilities
const support = Combo.checkSupport();
console.log(support.webcodecs); // WebCodecs support
console.log(support.webgl); // WebGL support
console.log(support.workers); // Web Workers support

// Quick check - returns true if all required features supported
console.log(Combo.isSupported());
```

## System Requirements

### For Preview (Rendering)

- **WebGL 2.0** support (all modern browsers)
- Minimum 2GB RAM
- Dedicated GPU recommended for smooth playback

### For Export (Video Encoding)

- **WebCodecs API** support (Chrome 94+, Safari 16.4+, Edge 94+)
- Minimum 4GB RAM
- Dedicated GPU highly recommended
- Fast CPU for encoding performance

## Next Steps

- [Basic Usage](./02-basic-usage.md) - Learn the fundamentals
- [Studio API](./03-studio.md) - Master studio management
- [Working with Clips](./04-clips.md) - Load and configure media
- [Animations](./05-animations.md) - Add motion to your videos
- [Transitions](./06-transitions.md) - Create smooth transitions
