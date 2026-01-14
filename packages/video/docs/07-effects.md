# Effects

Effects allow you to apply filters and visual modifications to clips. DesignCombo supports a wide range of built-in shader effects.

## Applying Effects

Effects are added to clips using the `addEffect` method with a configuration object.

```ts
import * as Combo from "@designcombo/video";

const clip = await Combo.Video.fromUrl("video.mp4");

// Add an effect
clip.addEffect({
  id: "effect-1", // specific ID
  key: "sepia", // effect key
  startTime: 0,
  duration: 5000,
});
```

## Built-in Effects


clip.addEffect(brightnessEffect);
```

### Contrast

Adjust the contrast:

```ts
const contrastEffect = new Combo.Effect.Contrast({
  value: 1.2, // 0 = gray, 1 = normal, >1 = more contrast
});

clip.addEffect(contrastEffect);
```

### Saturation

Adjust color saturation:

```ts
const saturationEffect = new Combo.Effect.Saturation({
  value: 0.8, // 0 = grayscale, 1 = normal, >1 = more saturated
});

clip.addEffect(saturationEffect);
```

### Blur

Apply blur effect:

```ts
const blurEffect = new Combo.Effect.Blur({
  radius: 10, // Blur radius in pixels
});

clip.addEffect(blurEffect);
```

### Hue Rotate

Rotate colors on the color wheel:

```ts
const hueEffect = new Combo.Effect.HueRotate({
  degrees: 90, // Rotation in degrees (0-360)
});

clip.addEffect(hueEffect);
```

### Invert

Invert colors:

```ts
const invertEffect = new Combo.Effect.Invert({
  amount: 1.0, // 0 = no invert, 1 = full invert
});

clip.addEffect(invertEffect);
```

### Grayscale

Convert to grayscale:

```ts
const grayscaleEffect = new Combo.Effect.Grayscale({
  amount: 1.0, // 0 = color, 1 = full grayscale
});

clip.addEffect(grayscaleEffect);
```

### Sepia

Apply sepia tone:

```ts
const sepiaEffect = new Combo.Effect.Sepia({
  amount: 0.8, // 0 = no sepia, 1 = full sepia
});

clip.addEffect(sepiaEffect);
```

## Color Adjustments

### Color Matrix

Apply custom color transformations:

```ts
const colorMatrixEffect = new Combo.Effect.ColorMatrix({
  matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
});

clip.addEffect(colorMatrixEffect);
```

### Temperature

Adjust color temperature:

```ts
const temperatureEffect = new Combo.Effect.Temperature({
  value: 0, // -1 = cooler (blue), 0 = normal, 1 = warmer (orange)
});

clip.addEffect(temperatureEffect);
```

### Tint

Add color tint:

```ts
const tintEffect = new Combo.Effect.Tint({
  color: "#ff6600",
  amount: 0.3, // 0 = no tint, 1 = full tint
});

clip.addEffect(tintEffect);
```

### Exposure

Adjust exposure:

```ts
const exposureEffect = new Combo.Effect.Exposure({
  value: 0.5, // -1 = underexposed, 0 = normal, 1 = overexposed
});

clip.addEffect(exposureEffect);
```

## Stylistic Effects

### Vignette

Add vignette effect:

```ts
const vignetteEffect = new Combo.Effect.Vignette({
  amount: 0.5, // Vignette strength
  radius: 0.8, // Inner radius (0-1)
  softness: 0.5, // Edge softness
});

clip.addEffect(vignetteEffect);
```

### Glow

Add glow effect:

```ts
const glowEffect = new Combo.Effect.Glow({
  color: "#ffffff",
  intensity: 0.5,
  radius: 10,
});

clip.addEffect(glowEffect);
```

### Shadow

Add drop shadow:

```ts
const shadowEffect = new Combo.Effect.Shadow({
  color: "rgba(0, 0, 0, 0.5)",
  blur: 10,
  offsetX: 5,
  offsetY: 5,
});

clip.addEffect(shadowEffect);
```

### Pixelate

Pixelate effect:

```ts
const pixelateEffect = new Combo.Effect.Pixelate({
  size: 10, // Pixel size
});

clip.addEffect(pixelateEffect);
```

## Distortion Effects

### Noise

Add film grain/noise:

```ts
const noiseEffect = new Combo.Effect.Noise({
  amount: 0.1, // Noise intensity (0-1)
  monochrome: false, // Color or monochrome noise
});

clip.addEffect(noiseEffect);
```

### Glitch

Add glitch effect:

```ts
const glitchEffect = new Combo.Effect.Glitch({
  amount: 0.5,
  frequency: 0.1, // How often glitch occurs
});

clip.addEffect(glitchEffect);
```

### ChromaticAberration

RGB channel shift effect:

```ts
const chromaticEffect = new Combo.Effect.ChromaticAberration({
  offsetX: 5,
  offsetY: 0,
});

clip.addEffect(chromaticEffect);
```

## Managing Effects

### Adding Effects

```ts
// Add single effect
clip.addEffect(effect);

// Add multiple effects
clip.addEffect(effect1, effect2, effect3);

// Effects are applied in order
```

### Removing Effects

```ts
// Remove specific effect
clip.removeEffect(effect);

// Remove all effects
clip.clearEffects();

// Remove by type
clip.removeEffectsByType("blur");
```

### Updating Effects

```ts
// Update effect properties
effect.set({
  value: 1.5,
});

// Toggle effect
effect.enabled = false; // Disable without removing
effect.enabled = true; // Re-enable
```

### Querying Effects

```ts
// Get all effects
const effects = clip.getEffects();

// Get effects by type
const blurEffects = clip.getEffectsByType("blur");

// Check if has effect
if (clip.hasEffect("blur")) {
  // Clip has blur effect
}
```

## Animating Effects

Animate effect properties over time:

```ts
const blurEffect = new Combo.Effect.Blur({ radius: 0 });
clip.addEffect(blurEffect);

// Animate blur radius
blurEffect.animate({
  property: "radius",
  fromValue: 0,
  toValue: 20,
  startFrame: 0,
  duration: 60,
});
```

## Effect Presets

### Black & White

```ts
clip.addEffect(
  new Combo.Effect.Grayscale({ amount: 1.0 }),
  new Combo.Effect.Contrast({ value: 1.2 })
);
```

### Vintage

```ts
clip.addEffect(
  new Combo.Effect.Sepia({ amount: 0.4 }),
  new Combo.Effect.Vignette({ amount: 0.5 }),
  new Combo.Effect.Noise({ amount: 0.05 })
);
```

### Cinematic

```ts
clip.addEffect(
  new Combo.Effect.Contrast({ value: 1.3 }),
  new Combo.Effect.Saturation({ value: 0.9 }),
  new Combo.Effect.Temperature({ value: -0.1 }),
  new Combo.Effect.Vignette({ amount: 0.3 })
);
```

### Dramatic

```ts
clip.addEffect(
  new Combo.Effect.Contrast({ value: 1.5 }),
  new Combo.Effect.Saturation({ value: 1.2 }),
  new Combo.Effect.Brightness({ value: 0.9 }),
  new Combo.Effect.Vignette({ amount: 0.6 })
);
```

## Custom Effects

### Using PixiJS Filters

DesignCombo is built on PixiJS, so you can use any PixiJS filter as an effect:

```ts
import { BlurFilter, ColorMatrixFilter } from "pixi.js";

// Wrap PixiJS filter as DesignCombo effect
class PixiFilterEffect extends Combo.Effect {
  constructor(pixiFilter) {
    super();
    this.pixiFilter = pixiFilter;
  }

  apply(container) {
    if (!container.filters) {
      container.filters = [];
    }
    container.filters.push(this.pixiFilter);
  }
}

// Use any PixiJS filter
const blurFilter = new BlurFilter(8);
const blurEffect = new PixiFilterEffect(blurFilter);
clip.addEffect(blurEffect);

// Update filter properties
blurFilter.blur = 15;
```

### Custom Canvas-based Effects

Create custom effects by extending the base Effect class:

```ts
class CustomEffect extends Combo.Effect {
  constructor(options) {
    super(options);
    this.amount = options.amount || 1.0;
  }

  apply(ctx, clip) {
    // Custom effect logic
    const imageData = ctx.getImageData(0, 0, clip.width, clip.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      // Modify pixel data
      pixels[i] *= this.amount; // Red
      pixels[i + 1] *= this.amount; // Green
      pixels[i + 2] *= this.amount; // Blue
      // pixels[i + 3] is alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

// Use custom effect
const customEffect = new CustomEffect({ amount: 1.5 });
clip.addEffect(customEffect);
```

## Performance Tips

1. **Effect Order Matters** - Apply expensive effects last
2. **Use Caching** - Cache effect results when possible
3. **Combine Effects** - Merge multiple effects into one when possible
4. **Disable Unused** - Disable effects instead of removing/adding repeatedly
5. **Optimize Parameters** - Lower blur radius, noise amount for better performance
6. **Limit Effect Count** - Too many effects can slow rendering

## Effect Events

Listen to effect-related events:

```ts
// Effect added
clip.on("effectAdded", (effect) => {
  console.log("Effect added:", effect.type);
});

// Effect removed
clip.on("effectRemoved", (effect) => {
  console.log("Effect removed:", effect.type);
});

// Effect changed
effect.on("change", (property, value) => {
  console.log(`${property} changed to ${value}`);
});
```

## Best Practices

1. **Apply effects in order** - Basic adjustments first, stylistic effects last
2. **Use presets** - Start with presets and customize as needed
3. **Animate smoothly** - Use easing for smooth effect transitions
4. **Test performance** - Profile with multiple effects
5. **Reuse effects** - Create effect instances once and reuse
6. **Document custom effects** - Clearly document custom effect behavior
