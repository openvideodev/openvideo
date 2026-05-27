---
name: transition-editing
description: Learn how to add and modify transition clips to bridge two adjacent clips seamlessly. Includes the full catalog of available transitions with descriptions.
---

# transition-editing

## Overview

This skill documents how to apply and customize transitions between adjacent clips on the timeline. A transition connects a source clip (`fromClipId`) and a destination clip (`toClipId`).

The transition catalog is maintained in `@openvideo/core` — use the keys listed in Section 4 when setting `transitionKey`.

## Instructions

When the user asks to add or edit transitions (e.g. crossfades, slides, wipes, custom glsl transitions), you should output batch commands in your plan to:

1. Add the transition clip.
2. Link the adjacent clips.

### 1. Adding a Transition

A transition clip is placed at the overlapping intersection of two adjacent clips.

- `type`: Must be `"Transition"`
- `transitionKey`: The transition effect key from the catalog (Section 4) — e.g. `"fade"`, `"GlitchMemories"`, `"cube"`
- `fromClipId`: The ID of the preceding clip
- `toClipId`: The ID of the succeeding clip
- `timing`: Nested timing block specifying duration and position.
  - `duration`: The transition duration in microseconds (e.g., `1000000` for 1 second)
  - `display`: The time range `{ "from": start, "to": end }` where the transition occurs (centered on the transition boundary)

**Example: Adding a fade transition**

```json
{
  "type": "command",
  "description": "Adding a fade transition",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Transition",
        "name": "fade",
        "transitionKey": "fade",
        "fromClipId": "clip_123",
        "toClipId": "clip_456",
        "timing": {
          "duration": 1000000,
          "display": {
            "from": 4500000,
            "to": 5500000
          }
        }
      }
    }
  }
}
```

### 2. Linking Adjacent Clips

To ensure the rendering engine properly blends the two clips during transition, you must link the adjacent clips by updating their `transition` metadata property.

**Example: Updating fromClip and toClip metadata**

```json
[
  {
    "type": "command",
    "description": "Linking source clip to transition",
    "command": {
      "type": "clip.update",
      "payload": {
        "id": "clip_123",
        "updates": {
          "transition": {
            "key": "fade",
            "name": "fade",
            "fromClipId": "clip_123",
            "toClipId": "clip_456",
            "timing": {
              "duration": 1000000,
              "display": {
                "from": 4500000,
                "to": 5500000
              }
            }
          }
        }
      }
    }
  },
  {
    "type": "command",
    "description": "Linking destination clip to transition",
    "command": {
      "type": "clip.update",
      "payload": {
        "id": "clip_456",
        "updates": {
          "transition": {
            "key": "fade",
            "name": "fade",
            "fromClipId": "clip_123",
            "toClipId": "clip_456",
            "timing": {
              "duration": 1000000,
              "display": {
                "from": 4500000,
                "to": 5500000
              }
            }
          }
        }
      }
    }
  }
]
```

### 3. Customizing or Updating a Transition

To modify an existing transition (e.g. changing its key or duration), use `clip.update`.

**Example: Changing transition to slide and duration to 1.5 seconds**

```json
{
  "type": "command",
  "description": "Updating transition key and duration",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "clip_transition_789",
      "updates": {
        "transitionKey": "Directional",
        "timing": {
          "duration": 1500000
        }
      }
    }
  }
}
```

---

## 4. Transition Catalog

All supported transitions are listed below, grouped by visual category. Use the `key` value as the `transitionKey` in commands.

> **Provider**: All transitions below are supported by `engine-pixi`. Additional providers (e.g. `react-skia`) may support a subset.

### Fade

| Key              | Name               | Description                                                                                               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `fade`           | Fade               | A simple cross-dissolve where the outgoing scene fades out while the incoming scene fades in.             |
| `fadecolor`      | Fade Through Color | Fades out through a solid color (default: black) then fades into the next scene — cinematic dip-to-color. |
| `fadegrayscale`  | Fade to Grayscale  | Transitions by temporarily desaturating both clips before blending — nostalgic film-like feel.            |
| `burn`           | Burn               | A vibrant, fiery cross-burn blend using a warm color overlay during the transition.                       |
| `multiply_blend` | Multiply Blend     | Blends scenes using multiply compositing mode for a dark, layered photographic look.                      |
| `colorphase`     | Color Phase        | Shifts through RGBA color channel phases during the transition for a chromatic prism effect.              |
| `luma`           | Luma Matte         | Uses a custom luminance matte image to control the reveal pattern.                                        |
| `luminance_melt` | Luminance Melt     | Melts the scene by luminance — brighter areas transition first, creating a gradient melt-away.            |

### Wipe

| Key                | Name               | Description                                                               |
| ------------------ | ------------------ | ------------------------------------------------------------------------- |
| `wipeDown`         | Wipe Down          | Reveals the next scene with a clean line sweeping downward.               |
| `wipeUp`           | Wipe Up            | Reveals the next scene with a clean line sweeping upward.                 |
| `wipeLeft`         | Wipe Left          | Reveals the next scene with a clean line sweeping right to left.          |
| `wipeRight`        | Wipe Right         | Reveals the next scene with a clean line sweeping left to right.          |
| `directionalwipe`  | Directional Wipe   | A smooth diagonal wipe with configurable direction and softness.          |
| `windowblinds`     | Window Blinds      | Simulates horizontal window blinds closing over the scene.                |
| `windowslice`      | Window Slice       | Slices the screen into vertical strips that independently slide away.     |
| `squareswire`      | Squares Wire       | A grid of squares animating in a diagonal wave pattern across the screen. |
| `wind`             | Wind               | A subtle horizontal streak effect blowing the scene away.                 |
| `BowTieHorizontal` | Bow Tie Horizontal | Two bow-tie shapes expand horizontally from center to reveal next scene.  |
| `BowTieVertical`   | Bow Tie Vertical   | Two bow-tie shapes expand vertically from center to reveal next scene.    |

### Slide

| Key               | Name              | Description                                                                           |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `Directional`     | Directional Slide | The incoming clip slides in from a configurable direction while outgoing slides out.  |
| `directionalwarp` | Directional Warp  | Slides with a warping distortion in the movement direction, adding flow and energy.   |
| `Mosaic`          | Mosaic Slide      | A diagonal mosaic scroll moving the outgoing scene off while bringing in the new one. |

### Zoom

| Key                 | Name              | Description                                                                                |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `SimpleZoom`        | Simple Zoom       | Fast zoom-in/zoom-out — zooms into outgoing clip then zooms out on incoming clip.          |
| `DreamyZoom`        | Dreamy Zoom       | A dreamy zoom that rotates and scales the scene, creating a soft cinematic blur-zoom feel. |
| `CrossZoom`         | Cross Zoom        | A zoom-through where both clips rush through each other with radial motion blur.           |
| `ZoomInCircles`     | Zoom In Circles   | Zooms concentrically inward in expanding circular rings to reveal the next scene.          |
| `rotate_scale_fade` | Rotate Scale Fade | Outgoing scene rotates and scales down while the incoming rotates and scales up.           |

### Geometric

| Key                | Name               | Description                                                                            |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `circle`           | Circle             | A circle expands from the center — like a camera iris opening.                         |
| `circleopen`       | Circle Open        | A circular mask opens or closes with configurable smoothness.                          |
| `CircleCrop`       | Circle Crop        | The outgoing scene is cropped into a shrinking circle before the next fills the frame. |
| `heart`            | Heart              | A heart-shaped mask expands to reveal the next scene — great for romantic moments.     |
| `angular`          | Angular            | A rotating angular wipe sweeping around from a configurable starting angle.            |
| `Radial`           | Radial Wipe        | A radial sweep (like a clock hand) wiping from 0 to 360 degrees.                       |
| `radialSwipe`      | Radial Swipe       | Custom radial swipe rotating the new scene in from behind like turning a page.         |
| `polar_function`   | Polar Function     | Uses a polar function to create a petal/star shaped wipe pattern.                      |
| `cannabisleaf`     | Cannabis Leaf      | A cannabis leaf silhouette morphs to reveal the next scene.                            |
| `crosshatch`       | Crosshatch         | A crosshatching pattern burns through the scene from center.                           |
| `hexagonalize`     | Hexagonalize       | Breaks into a hexagonal grid that progressively transitions to the next scene.         |
| `GridFlip`         | Grid Flip          | Divides the screen into tiles that individually flip to reveal the next scene.         |
| `PolkaDotsCurtain` | Polka Dots Curtain | Polka dots expand from a corner, like a curtain of growing circles.                    |
| `pinwheel`         | Pinwheel           | A spinning pinwheel sweeps the scene away.                                             |
| `StereoViewer`     | Stereo Viewer      | Simulates a stereoscopic slide viewer clicking to the next slide.                      |

### Blur

| Key          | Name        | Description                                                                  |
| ------------ | ----------- | ---------------------------------------------------------------------------- |
| `LinearBlur` | Linear Blur | Outgoing scene blurs out while the incoming scene blurs in.                  |
| `Dreamy`     | Dreamy      | Dreamy wavy blur that distorts both clips with soft ripple blur.             |
| `morph`      | Morph       | Smoothly morphs between scenes using pixel displacement — fluid and natural. |

### Distort

| Key                     | Name             | Description                                                                        |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `Swirl`                 | Swirl            | A swirling vortex spins the outgoing scene away into the center.                   |
| `WaterDrop`             | Water Drop       | Ripple waves emanate from center as if a water drop hit the screen.                |
| `ripple`                | Ripple           | Full-screen ripple waves (like a water reflection) distort the scene during blend. |
| `ButterflyWaveScrawler` | Butterfly Wave   | A butterfly-wing shaped wave crawls across the scene with color separation.        |
| `CrazyParametricFun`    | Crazy Parametric | A wild parametric math-based warping pattern — highly energetic.                   |
| `crosswarp`             | Cross Warp       | Both scenes warp toward and away from each other — vortex pull effect.             |
| `flyeye`                | Fly Eye          | Compound fly-eye lens fractures the scene into many small circular lenses.         |
| `kaleidoscope`          | Kaleidoscope     | A rotating kaleidoscope mirror effect fractures and spins the scene.               |
| `perlin`                | Perlin Noise     | Perlin noise organically dissolves the scene in flowing, cloud-like patches.       |
| `randomsquares`         | Random Squares   | A grid of squares that randomly disappear to reveal the next scene.                |
| `pixelize`              | Pixelize         | Pixelates into large blocks that progressively shrink into the new scene.          |
| `displacement`          | Displacement Map | Uses a custom displacement map texture to warp the scene — configurable shape.     |

### Stylized

| Key                    | Name                | Description                                                                      |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `Bounce`               | Bounce              | The outgoing scene drops away with a bouncing shadow — like a stage trapdoor.    |
| `ColourDistance`       | Colour Distance     | Transitions pixels based on color difference — organic chemical reaction look.   |
| `cube`                 | 3D Cube             | A 3D cube rotation where scenes are mapped to cube faces rotating into view.     |
| `doorway`              | Doorway             | Opens like double doors — the scene splits and swings open to reveal the next.   |
| `swap`                 | Swap                | Outgoing and incoming scenes swap positions with a perspective flip.             |
| `InvertedPageCurl`     | Inverted Page Curl  | Simulates a page being curled back from the corner, like turning a book page.    |
| `DoomScreenTransition` | Doom                | The classic Doom screen melt — outgoing screen melts downward in jagged strips.  |
| `squeeze`              | Squeeze             | The scene squeezes horizontally with chromatic color separation artifacts.       |
| `undulatingBurnOut`    | Undulating Burn Out | The outgoing scene burns away in an undulating wave pattern from center outward. |

### Glitch

| Key              | Name            | Description                                                                       |
| ---------------- | --------------- | --------------------------------------------------------------------------------- |
| `GlitchDisplace` | Glitch Displace | Digital glitch displacing pixel rows — like a VHS tracking error.                 |
| `GlitchMemories` | Glitch Memories | Nostalgic glitch with chromatic aberration and random block corruption artifacts. |

---

## 5. Adding New Transitions

To add a new transition manually:

1. Add an `ITransitionDefinition` entry to `packages/core/src/transitions/catalog.ts`
2. Set `supportedProviders` to the appropriate renderer(s)
3. Register the actual shader/implementation in the provider package (e.g. call `registerCustomTransition()` in `engine-pixi`)

To support a new rendering provider (e.g. `react-skia`), add your provider key to `supportedProviders` in each relevant catalog entry and implement the transition handler in your provider package.
