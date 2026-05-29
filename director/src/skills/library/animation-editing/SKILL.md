---
name: animation-editing
description: Apply entrance, exit, and combo animations to any clip using named presets or fully custom keyframes. Supports clip-level keyframe animations and text/caption stagger animations (letter-by-letter, word-by-word).
---

# animation-editing

## Overview

This skill documents how to apply animations to clips using the `clip.update` command with an `animations` array. There are two animation types:

| Type | Registered name | Works on | Description |
|---|---|---|---|
| Keyframe | `"keyframes"` | All clip types | Interpolates visual properties across percentage-keyed stops |
| Stagger | `"stagger"` | `Text`, `Caption` only | GSAP-powered animation applied per-character or per-word |

Multiple animations can be stacked on a single clip — they composite additively (transforms accumulate, opacities multiply).

---

## How to apply

Use `clip.update` and **replace the entire `animations` array**. The array is always replaced (not merged), so include all animations you want active.

```json
{
  "type": "command",
  "description": "Apply fade + scale + slight rotate entrance to clip",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "<clipId>",
      "updates": {
        "animations": [
          {
            "type": "keyframes",
            "options": {
              "duration": 800000,
              "delay": 0,
              "easing": "easeOutCubic",
              "iterCount": 1
            },
            "params": {
              "0%": { "opacity": 0, "scale": 0.85, "angle": -6 },
              "100%": { "opacity": 1, "scale": 1, "angle": 0 }
            }
          }
        ]
      }
    }
  }
}
```

To **clear all animations** from a clip, set `"animations": []`.

---

## Section 1 — AnimationOptions reference

| Field | Type | Unit | Description |
|---|---|---|---|
| `duration` | `number` | **microseconds** | How long the animation runs. 1 second = `1000000` |
| `delay` | `number` | **microseconds** | When the animation starts (relative to clip start). Default: `0` |
| `easing` | `string` | — | Global easing applied to the whole timeline (see easing table below) |
| `iterCount` | `number` | — | Number of repetitions. Use `1` for entrance/exit. For combo (loops): use `1` with `mirror: 1` |

### Available easings

| Key | Character |
|---|---|
| `"linear"` | Constant speed |
| `"easeInQuad"` | Accelerates in |
| `"easeOutQuad"` | Decelerates out (good default for entrances) |
| `"easeInOutQuad"` | Smooth in and out |
| `"easeInCubic"` | Strong acceleration in |
| `"easeOutCubic"` | Strong deceleration out |
| `"easeInOutCubic"` | Strong in and out |
| `"easeInSine"` | Gentle acceleration |
| `"easeOutSine"` | Gentle deceleration |
| `"easeInOutSine"` | Gentle smooth |
| `"easeInExpo"` | Exponential acceleration |
| `"easeOutExpo"` | Exponential deceleration |
| `"easeInBack"` | Slight overshoot backward at start |
| `"easeOutBack"` | Slight overshoot at end (springy) |
| `"slow"` | Slow middle, fast at extremes |

---

## Section 2 — AnimationProps reference (keyframe properties)

These are the properties you can set in any keyframe stop. All timing is handled by `options`, not here.

| Property | Composition | Default | Range | Description |
|---|---|---|---|---|
| `opacity` | **multiplicative** | `1` | 0–1 | `0` = transparent, `1` = fully visible |
| `scale` | **multiplicative** | `1` | 0–3 | Uniform scale. `0` = invisible, `1` = normal, `1.5` = 50% larger |
| `scaleX` | **multiplicative** | `1` | 0–3 | Horizontal scale only |
| `scaleY` | **multiplicative** | `1` | 0–3 | Vertical scale only |
| `x` | **additive** | `0` | -2000–2000 | Horizontal offset in pixels from clip's base position |
| `y` | **additive** | `0` | -2000–2000 | Vertical offset in pixels from clip's base position |
| `angle` | **additive** | `0` | -360–360 | Rotation in degrees |
| `blur` | **additive** | `0` | 0–100 | Gaussian blur amount |
| `motionBlur` | **additive** | `0` | 0–500 | Directional motion blur amount |
| `brightness` | **multiplicative** | `1` | 0–5 | `0` = black, `1` = normal, `3` = overexposed |
| `mirror` | **max** | `0` | 0 or 1 | Set to `1` for combo animations (enables looping mirror mode) |
| `width` | **additive** | `0` | -1000–1000 | Width offset in pixels |
| `height` | **additive** | `0` | -1000–1000 | Height offset in pixels |

> **Multiplicative defaults:** for `scale`, `opacity`, `brightness` — the default at any unspecified stop is `1` (not 0). An omitted property means "no change from base value."
> **Additive defaults:** for `x`, `y`, `angle`, `blur`, `motionBlur` — the default is `0` (no offset).

---

## Section 3 — Custom keyframe authoring

The agent MUST be able to compose `params` from scratch. Do not only pick from presets — build custom animations when the user describes a specific look.

### Entrance animation (starts at 0%, ends at 100%)

```json
"params": {
  "0%": { "opacity": 0, "scale": 0.85, "angle": -6 },
  "100%": { "opacity": 1, "scale": 1, "angle": 0 }
}
```

### Exit animation (starts at 100%, ends at 0%)

Set `delay = clip_duration_us - animation_duration_us` so it fires at the end.

```json
"options": { "duration": 600000, "delay": 4400000 },
"params": {
  "0%": { "opacity": 1, "scale": 1 },
  "100%": { "opacity": 0, "scale": 0.85 }
}
```

### Multi-stop with overshoot (bounce effect)

```json
"params": {
  "0%": { "scale": 0, "opacity": 0 },
  "60%": { "scale": 1.15, "opacity": 1 },
  "80%": { "scale": 0.95 },
  "100%": { "scale": 1 }
}
```

### Per-segment easing override

Each keyframe stop can have its own `easing` key that overrides the global easing for that segment:

```json
"params": {
  "0%": { "x": -400, "opacity": 0 },
  "70%": { "x": 20, "opacity": 1, "easing": "easeOutBack" },
  "100%": { "x": 0 }
}
```

### Common custom recipes

| User says | params to write |
|---|---|
| "fade in and scale up" | `{ "0%": { opacity: 0, scale: 0.85 }, "100%": { opacity: 1, scale: 1 } }` |
| "slide in from left" | `{ "0%": { x: -400, opacity: 0 }, "100%": { x: 0, opacity: 1 } }` |
| "slide in from right" | `{ "0%": { x: 400, opacity: 0 }, "100%": { x: 0, opacity: 1 } }` |
| "slide in from top" | `{ "0%": { y: -300, opacity: 0 }, "100%": { y: 0, opacity: 1 } }` |
| "slide in from bottom" | `{ "0%": { y: 300, opacity: 0 }, "100%": { y: 0, opacity: 1 } }` |
| "fade in with slight rotate" | `{ "0%": { opacity: 0, angle: -8 }, "100%": { opacity: 1, angle: 0 } }` |
| "zoom in with blur" | `{ "0%": { scale: 1.5, blur: 25, opacity: 0 }, "100%": { scale: 1, blur: 0, opacity: 1 } }` |
| "drop in from above" | `{ "0%": { y: -400, blur: 20, scale: 0.9 }, "100%": { y: 0, blur: 0, scale: 1 } }` |
| "spin in" | `{ "0%": { angle: 180, scale: 0.5, blur: 10, opacity: 0 }, "100%": { angle: 0, scale: 1, blur: 0, opacity: 1 } }` |
| "fade out" | `{ "0%": { opacity: 1 }, "100%": { opacity: 0 } }` + delay = end |
| "slide out to right" | `{ "0%": { x: 0, opacity: 1 }, "100%": { x: 400, opacity: 0 } }` + delay = end |

---

## Section 4 — Named Preset Catalog

Use a preset by setting `"type": "keyframes"` and copying the `params` directly. Alternatively, reference the preset name as a shorthand when the user's intent clearly matches.

### Entrance presets (set delay: 0)

| Preset key | Label | Notable properties |
|---|---|---|
| `fadeIn` | Fade In | opacity 0→1, scale 0.9→1 |
| `zoomIn` | Zoom In | scale 0→1, opacity 0→1 |
| `slideIn` | Slide In (left) | x -300→0, opacity 0→1 |
| `blurIn` | Blur In | blur 20→0, opacity 0→1 |
| `motionBlurIn` | Motion Blur In | motionBlur 40→0, opacity 0→1 |
| `blurSlideRightIn` | Blur Slide Right In | x +300→0, blur 20→0, scale 0.7→1 |
| `blurSlideLeftIn` | Blur Slide Left In | x -400→0, blur 25→0 |
| `blurSlideRightStrongIn` | Blur Slide Right Strong In | x +600→0, blur 40→0 |
| `wobbleZoomIn` | Wobble Zoom In | scale overshoot + angle wobble |
| `spinZoomIn` | Spin Zoom In | angle 180→0, scale 0.7→1 |
| `cinematicZoomSlideIn` | Cinematic Zoom Slide In | scale 1.5→1, blur, x offset |
| `elasticTwistIn` | Elastic Twist In | scale + angle elastic |
| `spinFadeIn` | Spin Fade In | angle 90→0, blur, scale |
| `flashZoomIn` | Flash Zoom In | brightness flash + scale pulse |
| `tiltSlideRightIn` | Tilt Slide Right In | angle -12→0, x -400→0 |
| `tiltZoomIn` | Tilt Zoom In | angle 15→0, scale 0.7→1 |
| `glitchSlideIn` | Glitch Slide In | x + angle + scale multi-stop |
| `dropBlurIn` | Drop Blur In | y -500→0, blur 30→0 |
| `fallZoomIn` | Fall Zoom In | y -400→0, scale overshoot |
| `zoomSpinIn` | Zoom Spin In | scale 3→1, angle -45→0 |
| `dramaticSpinSlideIn` | Dramatic Spin Slide In | x +800→0, angle -60→0, blur |
| `slideRotateIn` | Slide Rotate In | x -200→0, angle -15→0 |
| `slideBlurIn` | Slide Blur In | x +250→0, blur 20→0 |
| `zoomRotateIn` | Zoom Rotate In | scale 1.4→1, angle 20→0 |
| `zoomBlurIn` | Zoom Blur In | scale 1.6→1, blur 30→0 |
| `slideZoomIn` | Slide Zoom In | x -300→0, scale 0.7→1 |
| `verticalBlurIn` | Vertical Blur In | y +200→0, blur 25→0 |
| `rotateBlurIn` | Rotate Blur In | angle 45→0, blur 20→0 |
| `cinematicSlideZoomBlurIn` | Cinematic Slide Zoom Blur In | x +300→0, scale 0.7→1, blur 40→0 |
| `brightnessZoomIn` | Brightness Zoom In | scale 1.3→1, brightness 3→1 |
| `brightnessSlideIn` | Brightness Slide In | x -200→0, brightness 0.3→1 |
| `tiltZoomBlurIn` | Tilt Zoom Blur In | angle -10→0, scale 1.4→1, blur 20→0 |
| `dropRotateIn` | Drop Rotate In | y -250→0, angle 15→0 |
| `spiralIn` | Spiral In | scale 0.7→1, angle 90→0, blur |
| `flashSlideIn` | Flash Slide In | x +150→0, brightness 4→1 |
| `heavyCinematicIn` | Heavy Cinematic In | x -300→0, scale 0.7→1, angle -20→0, blur |
| `diagonalSlideRotateIn` | Diagonal Slide Rotate In | x -200→0, y +150→0, angle -20→0 |
| `diagonalBlurZoomIn` | Diagonal Blur Zoom In | x +150→0, y -150→0, scale 0.7→1 |
| `rotateBrightnessIn` | Rotate Brightness In | angle 60→0, brightness 0.2→1 |
| `zoomBrightnessBlurIn` | Zoom Brightness Blur In | scale 1.8→1, brightness 3→1, blur 25→0 |
| `slideUpRotateZoomIn` | Slide Up Rotate Zoom In | y +250→0, angle -15→0, scale 0.7→1 |
| `fallBlurRotateIn` | Fall Blur Rotate In | y -300→0, blur 40→0, angle 25→0 |
| `sideStretchZoomIn` | Side Stretch Zoom In | x +300→0, scale 1.6→1 |
| `darkSlideBlurIn` | Dark Slide Blur In | x -250→0, blur 35→0, brightness 0.3→1 |
| `liftZoomRotateIn` | Lift Zoom Rotate In | y +200→0, scale 0.7→1, angle 12→0 |
| `overexposedZoomIn` | Overexposed Zoom In | scale 1.4→1, brightness 4→1 |
| `pushDownZoomBlurIn` | Push Down Zoom Blur In | y -180→0, scale 1.5→1, blur 20→0 |
| `twistSlideBrightnessIn` | Twist Slide Brightness In | x +200→0, angle 25→0, brightness 0.4→1 |
| `collapseRotateZoomIn` | Collapse Rotate Zoom In | scale 0.7→1, angle -45→0 |
| `ultraCinematicIn` | Ultra Cinematic In | x +400, y +200, scale 0.7, blur 60, angle 30 → all 0 |

### Exit presets (set delay = clip_duration - animation_duration)

| Preset key | Label |
|---|---|
| `fadeOut` | Fade Out |
| `zoomOut` | Zoom Out |
| `slideOut` | Slide Out |
| `blurOut` | Blur Out |
| `motionBlurOut` | Motion Blur Out |
| `blurSlideRightOut` | Blur Slide Right Out |
| `blurSlideLeftOut` | Blur Slide Left Out |
| `tiltSlideRightOut` | Tilt Slide Right Out |
| `tiltZoomOut` | Tilt Zoom Out |
| `glitchSlideOut` | Glitch Slide Out |
| `dropBlurOut` | Drop Blur Out |
| `fallZoomOut` | Fall Zoom Out |
| `zoomSpinOut` | Zoom Spin Out |
| `dramaticSpinSlideOut` | Dramatic Spin Slide Out |
| `wobbleZoomOut` | Wobble Zoom Out |
| `spinZoomOut` | Spin Zoom Out |
| `cinematicZoomSlideOut` | Cinematic Zoom Slide Out |
| `elasticTwistOut` | Elastic Twist Out |
| `spinFadeOut` | Spin Fade Out |
| `flashZoomOut` | Flash Zoom Out |
| `slideRotateOut` | Slide Rotate Out |
| `slideBlurOut` | Slide Blur Out |
| `zoomRotateOut` | Zoom Rotate Out |
| `zoomBlurOut` | Zoom Blur Out |
| `slideZoomOut` | Slide Zoom Out |
| `verticalBlurOut` | Vertical Blur Out |
| `rotateBlurOut` | Rotate Blur Out |
| `cinematicSlideZoomBlurOut` | Cinematic Slide Zoom Blur Out |
| `brightnessZoomOut` | Brightness Zoom Out |
| `brightnessSlideOut` | Brightness Slide Out |
| `tiltZoomBlurOut` | Tilt Zoom Blur Out |
| `dropRotateOut` | Drop Rotate Out |
| `spiralOut` | Spiral Out |
| `flashSlideOut` | Flash Slide Out |
| `heavyCinematicOut` | Heavy Cinematic Out |
| `diagonalSlideRotateOut` | Diagonal Slide Rotate Out |
| `diagonalBlurZoomOut` | Diagonal Blur Zoom Out |
| `rotateBrightnessOut` | Rotate Brightness Out |
| `zoomBrightnessBlurOut` | Zoom Brightness Blur Out |
| `slideUpRotateZoomOut` | Slide Up Rotate Zoom Out |
| `fallBlurRotateOut` | Fall Blur Rotate Out |
| `sideStretchZoomOut` | Side Stretch Zoom Out |
| `darkSlideBlurOut` | Dark Slide Blur Out |
| `liftZoomRotateOut` | Lift Zoom Rotate Out |
| `overexposedZoomOut` | Overexposed Zoom Out |
| `pushDownZoomBlurOut` | Push Down Zoom Blur Out |
| `twistSlideBrightnessOut` | Twist Slide Brightness Out |
| `collapseRotateZoomOut` | Collapse Rotate Zoom Out |
| `ultraCinematicOut` | Ultra Cinematic Out |

### Combo presets (full clip duration, set `mirror: 1` in all keyframes)

Combo animations fill the **entire clip duration**. Always set `duration = clip_duration_us`.

| Preset key | Label | Character |
|---|---|---|
| `comboZoom1` | Combo Zoom 1 | Zoom in then back out |
| `comboZoom2` | Combo Zoom 2 | Zoom out then back in |
| `comboPendulum1` | Combo Pendulum 1 | Slide right, settle, slide out left |
| `comboPendulum2` | Combo Pendulum 2 | Slide left, settle, slide out right |
| `comboRightDistort` | Combo Right Distort | Scale distort + angle drift |
| `comboLeftDistort` | Combo Left Distort | Mirror of right distort |
| `comboWobble` | Combo Wobble | Wobble in, settle, zoom out |
| `comboSpinningTop1` | Combo Spinning Top 1 | Scale zoom + angle spin |
| `comboSpinningTop2` | Combo Spinning Top 2 | Reverse spinning top |
| `comboSwayOut` | Combo Sway Out | Zoom in, sway, tilt out |
| `comboBounce1` | Combo Bounce 1 | Bounce scale rhythm |
| `comboSwayIn` | Combo Sway In | Zoom in with angle sway |

### Caption-specific keyframe presets (for Caption clips only)

| Preset key | Label |
|---|---|
| `popCaption` | Pop |
| `bounceCaption` | Bounce |
| `scaleCaption` | Scale |
| `slideLeftCaption` | Slide Left |
| `slideRightCaption` | Slide Right |
| `slideUpCaption` | Slide Up |
| `slideDownCaption` | Slide Down |
| `fadeCaption` | Fade |
| `scaleMidCaption` | Scale Mid |
| `scaleDownCaption` | Scale Down |
| `upDownCaption` | Up Down (loop) |
| `upLeftCaption` | Up Left (loop) |

---

## Section 5 — Stagger animations (Text and Caption only)

Stagger animations use GSAP to animate individual **characters** or **words** within a Text or Caption clip.

> ⚠️ **Only valid for `Text` and `Caption` clip types.** Do NOT use on Video, Image, or Audio.

Use `"type": "stagger"` and provide `params` with `type`, `from`, `to`, and `stagger`:

```json
{
  "type": "stagger",
  "options": {
    "duration": 1200000,
    "delay": 0,
    "easing": "power2.out",
    "iterCount": 1
  },
  "params": {
    "type": "word",
    "from": { "alpha": 0, "y": "+=40" },
    "to": { "alpha": 1, "y": "-=40" },
    "stagger": 0.08
  }
}
```

### Stagger `params` fields

| Field | Values | Description |
|---|---|---|
| `type` | `"character"` or `"word"` | Whether to animate per-character or per-word |
| `from` | GSAP TweenVars | Starting state of each element |
| `to` | GSAP TweenVars | Ending state of each element |
| `stagger` | `number` (seconds) | Delay between each element's animation start. `0.05`=fast, `0.15`=slow |

### GSAP stagger property reference

| Property | Effect |
|---|---|
| `alpha` | Opacity (0–1) |
| `x`, `y` | Position offset. Can use `"+=50"` / `"-=50"` for relative |
| `scale` | Uniform scale |
| `scaleX`, `scaleY` | Independent axis scale |
| `rotation` | Rotation in degrees |
| `skewX`, `skewY` | Skew in degrees |
| `blur` | Gaussian blur |

### Named stagger presets (by character)

| Key | Label | Description |
|---|---|---|
| `charFadeIn` | Char Fade In | alpha + scale 0→1 per character |
| `charSlideUp` | Char Slide Up | alpha + y slide per character |
| `charTypewriter` | Char Typewriter | Instant alpha reveal per character (typewriter effect) |

### Named stagger presets (by word)

| Key | Label | Description |
|---|---|---|
| `fadeByWord` | Fade By Word | alpha 0→1 per word |
| `slideFadeByWord` | Slide Fade By Word | alpha + x slide per word |
| `popByWord` | Pop By Word | scale pop (0→1.2→1) per word |
| `scaleFadeByWord` | Scale Fade By Word | alpha + scale 0.7→1 per word |
| `bounceByWord` | Bounce By Word | alpha + y bounce per word |
| `rotateInByWord` | Rotate In By Word | alpha + rotation per word |
| `slideRightByWord` | Slide Right By Word | alpha + x slide right per word |
| `slideLeftByWord` | Slide Left By Word | alpha + x slide left per word |
| `fadeRotateByWord` | Fade Rotate By Word | alpha + rotation 90→0 per word |
| `skewByWord` | Skew By Word | alpha + skewX 45→0 per word |
| `waveByWord` | Wave By Word | alpha + y wave per word |
| `blurInByWord` | Blur In By Word | alpha + blur 10→0 per word |
| `dropSoftByWord` | Drop Soft By Word | alpha + y drop + scaleY per word |
| `elasticPopByWord` | Elastic Pop By Word | alpha + scale elastic per word |
| `flipUpByWord` | Flip Up By Word | alpha + skewX per word |
| `spinInByWord` | Spin In By Word | alpha + rotation -180→0 + scale per word |
| `stretchInByWord` | Stretch In By Word | alpha + scaleX/scaleY stretch per word |
| `revealZoomByWord` | Reveal Zoom By Word | alpha + scale 1.4→1 per word |
| `floatWaveByWord` | Float Wave By Word | alpha + y float wave per word |

---

## Section 6 — Applying to multiple clips (batch)

Use the array form of `clip.update` to apply animations to multiple clips at once:

```json
{
  "type": "command",
  "description": "Apply alternating slide-in directions to all image clips",
  "command": {
    "type": "clip.update",
    "payload": [
      {
        "id": "clip_img_1",
        "updates": {
          "animations": [
            {
              "type": "keyframes",
              "options": { "duration": 700000, "delay": 0, "easing": "easeOutCubic", "iterCount": 1 },
              "params": { "0%": { "x": -400, "opacity": 0 }, "100%": { "x": 0, "opacity": 1 } }
            }
          ]
        }
      },
      {
        "id": "clip_img_2",
        "updates": {
          "animations": [
            {
              "type": "keyframes",
              "options": { "duration": 700000, "delay": 0, "easing": "easeOutCubic", "iterCount": 1 },
              "params": { "0%": { "x": 400, "opacity": 0 }, "100%": { "x": 0, "opacity": 1 } }
            }
          ]
        }
      }
    ]
  }
}
```

---

## Section 7 — Stacking multiple animations

Multiple animations can coexist on one clip. They accumulate additively. This is useful for combining a clip-level entrance with a sustained motion:

```json
"animations": [
  {
    "type": "keyframes",
    "options": { "duration": 800000, "delay": 0, "easing": "easeOutCubic", "iterCount": 1 },
    "params": { "0%": { "opacity": 0, "scale": 0.85 }, "100%": { "opacity": 1, "scale": 1 } }
  },
  {
    "type": "keyframes",
    "options": { "duration": 5000000, "delay": 0, "easing": "linear", "iterCount": 1 },
    "params": { "0%": { "scale": 1 }, "100%": { "scale": 1.08 } }
  }
]
```

The above applies a fade-in entrance AND a slow Ken Burns zoom over the full clip duration simultaneously.

---

## Section 8 — Timing reference

| Scenario | How to set duration and delay |
|---|---|
| Entrance (fires at clip start) | `delay: 0`, `duration`: 400000–1200000 (0.4s–1.2s) |
| Exit (fires at clip end) | `delay: clip_duration_us - animation_duration_us` |
| Combo (fills entire clip) | `duration: clip_duration_us`, `delay: 0` |
| Stagger (Text/Caption entrance) | `delay: 0`, `duration`: 800000–2000000 — longer = slower stagger spread |

**Microseconds conversion:**
- 0.4 s = `400000`
- 0.5 s = `500000`
- 0.6 s = `600000`
- 0.8 s = `800000`
- 1.0 s = `1000000`
- 1.5 s = `1500000`
- 2.0 s = `2000000`

---

## Section 9 — Clip type compatibility matrix

| Clip type | `keyframes` | `stagger` |
|---|---|---|
| `Video` | ✅ | ❌ |
| `Image` | ✅ | ❌ |
| `Text` | ✅ | ✅ |
| `Caption` | ✅ | ✅ |
| `Audio` | ✅ (opacity/volume only) | ❌ |

---

## When to use

- User says "animate all images sliding in from alternating sides" → batch `clip.update` with alternating `x` direction
- User says "fade in, scale and slight rotate" → custom keyframes: `{ "0%": { opacity: 0, scale: 0.85, angle: -6 }, "100%": { opacity: 1, scale: 1, angle: 0 } }`
- User says "letter by letter fade in" → stagger with `type: "character"`, `charFadeIn` preset
- User says "word by word slide up" → stagger with `type: "word"`, `slideFadeByWord` or custom word stagger
- User says "typewriter effect" → `charTypewriter` stagger preset
- User says "combo zoom" or "Ken Burns" → `comboZoom1` or custom full-duration scale keyframes
- User says "entrance animation" → keyframes with delay 0, duration ~800000, easeOutCubic
- User says "exit animation" or "outro" → keyframes with delay = clip_duration - animation_duration
- User says "remove animations" → `clip.update` with `animations: []`
