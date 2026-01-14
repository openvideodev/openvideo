# Animations

Animations allow you to create dynamic effects by changing clip properties over time. All clips (text, images, videos, shapes) can be animated.

## Basic Animation

```ts
import * as Combo from "@designcombo/video";

const studio = new Combo.Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  bgColor: "#000000",
  canvas: document.getElementById('canvas'),
});

const text = new Combo.Text("Hello World", {
  fontSize: 48,
  fontFamily: "Ubuntu",
});
text.set({ x: 0, y: 540 });

// Animate text position from left to right
text.animate({
  property: "x",
  fromValue: 0,
  toValue: 1920,
  startFrame: 0, // start at frame 0
  duration: 90, // animate for 90 frames (3 seconds at 30fps)
});

await studio.addClip(text);
```

## Animation Properties

### Supported Properties

You can animate any numeric property:

- **Position**: `x`, `y`
- **Size**: `width`, `height`, `scale`, `scaleX`, `scaleY`
- **Rotation**: `rotation`
- **Opacity**: `opacity`
- **Text**: `fontSize`, `letterSpacing`, `lineHeight`
- **Effects**: `blur`, `brightness`, `contrast`, `saturation`

## Multiple Animations

Apply multiple animations to the same clip:

```ts
const imageClip = await Combo.Image.fromUrl("photo.jpg");
imageClip.set({
  x: 960,
  y: 540,
  width: 400,
  height: 300,
});

// Fade in
imageClip.animate({
  property: "opacity",
  fromValue: 0,
  toValue: 1,
  startFrame: 0,
  duration: 30,
});

// Scale up
imageClip.animate({
  property: "scale",
  fromValue: 0.5,
  toValue: 1,
  startFrame: 0,
  duration: 60,
});

// Rotate
imageClip.animate({
  property: "rotation",
  fromValue: 0,
  toValue: 360,
  startFrame: 60,
  duration: 90,
});

await studio.addClip(imageClip);
```

## Easing Functions

Control animation timing with easing functions:

```ts
text.animate({
  property: "x",
  fromValue: 0,
  toValue: 1920,
  startFrame: 0,
  duration: 120,
  easing: "easeInOut", // smooth acceleration and deceleration
});
```

### Available Easing Options

- `linear` - Constant speed
- `easeIn` - Slow start, fast end
- `easeOut` - Fast start, slow end
- `easeInOut` - Slow start and end, fast middle
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInBack`, `easeOutBack`, `easeInOutBack`
- `easeInElastic`, `easeOutElastic`, `easeInOutElastic`
- `easeInBounce`, `easeOutBounce`, `easeInOutBounce`

## Keyframe Animations

Create complex animations with multiple keyframes for precise control over the animation path.

### Basic Keyframe Animation

```ts
text.animate({
  property: "x",
  keyframes: [
    { frame: 0, value: 0, easing: "easeOut" },
    { frame: 60, value: 960, easing: "easeInOut" },
    { frame: 120, value: 1920, easing: "easeIn" },
  ],
});
```

### Multi-Property Keyframe Animations

Animate multiple properties with synchronized keyframes:

```ts
const imageClip = await Combo.Image.fromUrl("photo.jpg");

// Animate position with keyframes
imageClip.animate({
  property: "x",
  keyframes: [
    { frame: 0, value: 0 },
    { frame: 30, value: 500 },
    { frame: 60, value: 800 },
    { frame: 90, value: 1920 },
  ],
});

// Animate opacity in sync
imageClip.animate({
  property: "opacity",
  keyframes: [
    { frame: 0, value: 0 },
    { frame: 30, value: 1 },
    { frame: 60, value: 1 },
    { frame: 90, value: 0 },
  ],
});

// Animate scale
imageClip.animate({
  property: "scale",
  keyframes: [
    { frame: 0, value: 0.5 },
    { frame: 45, value: 1.2 },
    { frame: 90, value: 1 },
  ],
});
```

### Complex Motion Paths

Create complex motion paths with keyframes:

```ts
const element = new Combo.Text("Follow the path");

// Horizontal movement
element.animate({
  property: "x",
  keyframes: [
    { frame: 0, value: 100, easing: "easeInOut" },
    { frame: 30, value: 400, easing: "easeInOut" },
    { frame: 60, value: 800, easing: "easeInOut" },
    { frame: 90, value: 1200, easing: "easeInOut" },
    { frame: 120, value: 1600 },
  ],
});

// Vertical movement (creates curved path)
element.animate({
  property: "y",
  keyframes: [
    { frame: 0, value: 540, easing: "easeOut" },
    { frame: 30, value: 200, easing: "easeInOut" },
    { frame: 60, value: 540, easing: "easeInOut" },
    { frame: 90, value: 800, easing: "easeInOut" },
    { frame: 120, value: 540, easing: "easeIn" },
  ],
});
```

### Keyframe with Easing Per Segment

Each keyframe can have its own easing function:

```ts
text.animate({
  property: "rotation",
  keyframes: [
    { frame: 0, value: 0, easing: "linear" },
    { frame: 30, value: 90, easing: "easeInBack" },
    { frame: 60, value: 180, easing: "easeOutBounce" },
    { frame: 90, value: 270, easing: "easeInOutElastic" },
    { frame: 120, value: 360, easing: "linear" },
  ],
});
```

### Keyframe Shortcuts

Use helper methods for common keyframe patterns:

```ts
// Linear interpolation between points
text.animate({
  property: "x",
  keyframes: [
    { frame: 0, value: 0 },
    { frame: 60, value: 960 },
    { frame: 120, value: 1920 },
  ],
  interpolation: "linear", // All segments use linear easing
});

// Smooth curve through all points
text.animate({
  property: "y",
  keyframes: [
    { frame: 0, value: 0 },
    { frame: 30, value: 300 },
    { frame: 60, value: 100 },
    { frame: 90, value: 500 },
  ],
  interpolation: "smooth", // Smooth curve through all points
});
```

**Note:** With keyframes, use `frame` and `value` directly instead of `fromValue`/`toValue`/`startFrame`.

## Animation Presets

Use built-in animation presets for common effects. Presets are pre-configured animations that handle all the property values for you.

### Basic Preset Usage

```ts
// Fade in
text.animate("fadeIn", {
  startFrame: 0,
  duration: 30,
});

// Slide in from left
text.animate("slideInLeft", {
  startFrame: 0,
  duration: 45,
});

// Bounce in
text.animate("bounceIn", {
  startFrame: 30,
  duration: 60,
});

// Zoom in
text.animate("zoomIn", {
  startFrame: 0,
  duration: 45,
});
```

### Customizing Presets

Override preset defaults with custom parameters:

```ts
// Fade in with custom timing and easing
text.animate("fadeIn", {
  startFrame: 60,
  duration: 90,
  easing: "easeInCubic",
});

// Slide in from custom distance
text.animate("slideInLeft", {
  startFrame: 0,
  duration: 45,
  distance: 500, // Slide from 500px off-screen
});

// Bounce with custom intensity
text.animate("bounceIn", {
  startFrame: 0,
  duration: 60,
  intensity: 1.5, // Higher bounce
});
```

### Combining Multiple Presets

Create complex animations by combining presets:

```ts
const imageClip = await Combo.Image.fromUrl("photo.jpg");

// Enter with fade and zoom
imageClip.animate("fadeIn", {
  startFrame: 0,
  duration: 30,
});

imageClip.animate("zoomIn", {
  startFrame: 0,
  duration: 30,
});

// Attention effect in the middle
imageClip.animate("pulse", {
  startFrame: 100,
  duration: 60,
  loop: 3,
});

// Exit with slide and fade
imageClip.animate("slideOutRight", {
  startFrame: 250,
  duration: 45,
});

imageClip.animate("fadeOut", {
  startFrame: 250,
  duration: 45,
});
```

### Available Presets

**Entrance Animations:**

- **Fade**

  - `fadeIn` - Simple fade in
  - `fadeInUp` - Fade in while moving up
  - `fadeInDown` - Fade in while moving down
  - `fadeInLeft` - Fade in while moving from left
  - `fadeInRight` - Fade in while moving from right

- **Slide**

  - `slideInUp` - Slide in from bottom
  - `slideInDown` - Slide in from top
  - `slideInLeft` - Slide in from left
  - `slideInRight` - Slide in from right

- **Zoom**

  - `zoomIn` - Zoom in from center
  - `zoomInUp` - Zoom in from bottom
  - `zoomInDown` - Zoom in from top
  - `zoomInLeft` - Zoom in from left
  - `zoomInRight` - Zoom in from right

- **Bounce**

  - `bounceIn` - Bounce into view
  - `bounceInUp` - Bounce in from bottom
  - `bounceInDown` - Bounce in from top
  - `bounceInLeft` - Bounce in from left
  - `bounceInRight` - Bounce in from right

- **Special Entrances**
  - `flipInX` - Flip in along X axis
  - `flipInY` - Flip in along Y axis
  - `rotateIn` - Rotate into view
  - `rollIn` - Roll in from side

**Exit Animations:**

- **Fade**

  - `fadeOut` - Simple fade out
  - `fadeOutUp` - Fade out while moving up
  - `fadeOutDown` - Fade out while moving down
  - `fadeOutLeft` - Fade out while moving left
  - `fadeOutRight` - Fade out while moving right

- **Slide**

  - `slideOutUp` - Slide out to top
  - `slideOutDown` - Slide out to bottom
  - `slideOutLeft` - Slide out to left
  - `slideOutRight` - Slide out to right

- **Zoom**

  - `zoomOut` - Zoom out to center
  - `zoomOutUp` - Zoom out to top
  - `zoomOutDown` - Zoom out to bottom
  - `zoomOutLeft` - Zoom out to left
  - `zoomOutRight` - Zoom out to right

- **Bounce**

  - `bounceOut` - Bounce out of view
  - `bounceOutUp` - Bounce out to top
  - `bounceOutDown` - Bounce out to bottom
  - `bounceOutLeft` - Bounce out to left
  - `bounceOutRight` - Bounce out to right

- **Special Exits**
  - `flipOutX` - Flip out along X axis
  - `flipOutY` - Flip out along Y axis
  - `rotateOut` - Rotate out of view
  - `rollOut` - Roll out to side

**Attention Animations:**

- `pulse` - Pulsing scale effect
- `shake` - Shake horizontally
- `shakeVertical` - Shake vertically
- `swing` - Swing rotation
- `wobble` - Wobble effect
- `bounce` - Bounce in place
- `flash` - Flash opacity
- `rubberBand` - Rubber band effect
- `jello` - Jello wiggle
- `heartBeat` - Heart beat pulse
- `headShake` - Head shake rotation
- `tada` - Ta-da celebration effect

### Creating Custom Presets

Define your own reusable animation presets:

```ts
// Define custom preset
const customPresets = {
  fadeSlideIn: (options) => ({
    keyframes: [
      { frame: 0, value: { opacity: 0, x: -200 } },
      { frame: options.duration / 2, value: { opacity: 0.5, x: 0 } },
      { frame: options.duration, value: { opacity: 1, x: 0 } },
    ],
  }),
};

// Use custom preset
text.animate("fadeSlideIn", {
  startFrame: 0,
  duration: 60,
});
```

### Preset Performance Tips

1. **Entrance animations**: Use on initial clip appearance
2. **Exit animations**: Use at the end of clip visibility
3. **Attention animations**: Use sparingly with `loop` option
4. **Combine wisely**: Too many simultaneous presets can be overwhelming
5. **Duration**: Most presets work best with 30-60 frame duration

## Removing Animations

```ts
// Remove specific animation
text.removeAnimation("x");

// Remove all animations
text.clearAnimations();
```

## Advanced: Custom Easing Functions

Define your own easing function:

```ts
text.animate({
  property: "x",
  fromValue: 0,
  toValue: 1920,
  startFrame: 0,
  duration: 120,
  easing: (t) => t * t * t, // cubic easing
});
```

## Chaining Animations

Create sequences with the `chain` method:

```ts
text
  .animate("fadeIn", { startFrame: 0, duration: 30 })
  .chain("slideInLeft", { duration: 45 })
  .chain("pulse", { duration: 60 })
  .chain("fadeOut", { duration: 30 });
```

## Loop Animations

```ts
text.animate({
  property: "rotation",
  fromValue: 0,
  toValue: 360,
  startFrame: 0,
  duration: 90,
  loop: true, // repeat indefinitely
});

// Or loop a specific number of times
text.animate({
  property: "y",
  fromValue: 500,
  toValue: 580,
  startFrame: 0,
  duration: 30,
  loop: 5, // repeat 5 times
  yoyo: true, // alternate direction
});
```
