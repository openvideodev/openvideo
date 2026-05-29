---
name: effect-editing
description: Learn how to add, modify, and remove visual effects on timeline clips for video ads, promos, and motivational videos. Includes the full effect catalog with descriptions and AI prompt examples.
---

# effect-editing

## Overview

This skill documents how to apply visual effects on the timeline for social media video production — ads, promos, motivational videos, and reels. Effects are placed as clips of type `"Effect"` on the timeline, covering a specific time range.

All `effectKey` values come from the catalog in Section 4.

## Instructions

When the user asks to add, change, or remove effects, output commands with `type: "clip.add"`, `type: "clip.update"`, or `type: "clip.remove"`.

## Two Ways to Apply Effects

### Mode A — Timeline Effect Clip (`clip.add` with `type: "Effect"`)

A standalone effect clip placed on a track for a time range. Affects all clips rendered beneath it during that window.

### Mode B — Clip-attached Effect (`clip.add-effect`)

Attaches an effect directly to a specific clip by `clipId`. Use this when targeting one clip.

---

### 1. Adding an Effect (Timeline Clip)

- `type`: Must be `"Effect"`
- `effectKey`: Key from the catalog (Section 4)
- `values`: Uniform overrides (optional — defaults are sensible)
- `timing.duration`: Duration in microseconds
- `timing.display.from` / `timing.display.to`: Absolute time range in microseconds

**Example: Add a fade-in at the start of the project (first 1 second)**

```json
{
  "type": "command",
  "description": "Adding fade-in at project start",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Effect",
        "name": "Fade In",
        "effectKey": "fadeIn",
        "values": {
          "uDuration": 1.0
        },
        "timing": {
          "duration": 1000000,
          "display": {
            "from": 0,
            "to": 1000000
          }
        }
      }
    }
  }
}
```

**Example: Add a fade-out at the end of the project (last 1 second, project duration = 10s)**

```json
{
  "type": "command",
  "description": "Adding fade-out at project end",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Effect",
        "name": "Fade Out",
        "effectKey": "fadeOut",
        "values": {
          "uDuration": 1.0
        },
        "timing": {
          "duration": 1000000,
          "display": {
            "from": 9000000,
            "to": 10000000
          }
        }
      }
    }
  }
}
```

### 2. Adding a Clip-attached Effect

**Example: Apply vignette to a specific clip**

```json
{
  "type": "command",
  "description": "Attaching vignette effect to clip",
  "command": {
    "type": "clip.add-effect",
    "payload": {
      "clipId": "clip_123",
      "effect": {
        "key": "vignette",
        "name": "Vignette",
        "values": {
          "uIntensity": 0.6,
          "uSoftness": 0.3
        }
      }
    }
  }
}
```

### 3. Modifying Effect Parameters

**Example: Adjust glitch intensity**

```json
{
  "type": "command",
  "description": "Updating glitch intensity",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "clip_effect_abc",
      "updates": {
        "values": {
          "intensity": 0.8
        }
      }
    }
  }
}
```

### 4. Removing an Effect

```json
{
  "type": "command",
  "description": "Removing effect clip",
  "command": {
    "type": "clip.remove",
    "payload": {
      "ids": ["clip_effect_abc"]
    }
  }
}
```

---

## Timing Reference

- All times are in **microseconds** (1 second = `1000000`)
- For **fade-in at clip start**: `from` = clip display start, `to` = clip start + fade duration
- For **fade-out at clip end**: `from` = clip end − fade duration, `to` = clip end
- For **full-clip effect**: `from` = clip display start, `to` = clip display end
- For **project-wide effect**: `from` = 0, `to` = total project duration

---

## Effect Catalog

All supported effects for social media video production. Use the `key` as `effectKey`.

### Fade / Opacity

| Key           | Name         | Description                                                        | Best For                  |
| ------------- | ------------ | ------------------------------------------------------------------ | ------------------------- |
| `fadeIn`      | Fade In      | Smoothly fades opacity from black to full over `uDuration` seconds | Clip/project entrance     |
| `fadeOut`     | Fade Out     | Smoothly fades opacity from full to black over `uDuration` seconds | Clip/project exit         |
| `blink`       | Blink        | Rhythmic brightness pulse cycling between min and max intensity    | Attention-grab, beat sync |
| `blackFlash`  | Black Flash  | Rapid flash to black and back — high-energy cut punctuation        | Transitions, drops        |
| `brightPulse` | Bright Pulse | White brightness surge — like a camera flash                       | Hype moments, reveals     |
| `flashLoop`   | Flash Loop   | Repeating flash bursts — stroboscopic energy                       | Music videos, ads         |

### Color Grading

| Key         | Name      | Description                                             | Best For                 |
| ----------- | --------- | ------------------------------------------------------- | ------------------------ |
| `sepia`     | Sepia     | Warm brown tone — animates intensity over time          | Vintage, nostalgic feel  |
| `grayscale` | Grayscale | Desaturates to black & white                            | Dramatic moments, B-roll |
| `invert`    | Invert    | Inverts all colors                                      | Creative emphasis        |
| `duotone`   | Duotone   | Maps shadows to one color, highlights to another        | Brand color grading      |
| `tritone`   | Tritone   | Three-color map (shadows / mids / highlights)           | Stylized promos          |
| `hueShift`  | Hue Shift | Animates hue rotation over time                         | Psychedelic, vibrant ads |
| `hdr`       | HDR       | Boosts contrast and saturation for a cinematic HDR look | Hero shots               |
| `hdrV2`     | HDR V2    | Enhanced HDR with richer tone mapping                   | Premium cinematic look   |

### Motion & Camera

| Key                | Name              | Description                                      | Best For                    |
| ------------------ | ----------------- | ------------------------------------------------ | --------------------------- |
| `cameraMove`       | Camera Move       | Simulates handheld camera drift/shake            | Documentary, authentic feel |
| `fastZoom`         | Fast Zoom         | Rapid zoom-in punch effect                       | Emphasis, hype              |
| `scaleMoveBlur`    | Scale Move Blur   | Zoom with motion blur — dynamic push-in          | Transitions, reveals        |
| `rotationMovement` | Rotation Movement | Spins the frame around a center point            | Creative intros             |
| `swirlMovement`    | Swirl Movement    | Spiraling vortex camera motion with rainbow fade | Dramatic openings           |
| `spring`           | Spring            | Elastic bounce/shake displacement                | Playful energy, emphasis    |
| `warpTransition`   | Warp Transition   | Distortion warp that expands from center         | Scene reveals               |
| `slitScan`         | Slit Scan         | Sweeping scan-line stretch effect                | Sci-fi, tech aesthetic      |
| `slitScanGlitch`   | Slit Scan Glitch  | Slit scan with RGB noise artifacts               | Glitchy tech content        |

### Focus & Blur

| Key               | Name             | Description                                     | Best For                |
| ----------------- | ---------------- | ----------------------------------------------- | ----------------------- |
| `focusTransition` | Focus Transition | Blurs in then sharpens — like a camera focusing | Clip entrances, reveals |
| `curtainBlur`     | Curtain Blur     | Blur that opens like a curtain                  | Dramatic reveals        |

### Reveal & Entrance

| Key                  | Name                | Description                               | Best For             |
| -------------------- | ------------------- | ----------------------------------------- | -------------------- |
| `curtainOpen`        | Curtain Open        | Screen wipes open like stage curtains     | Scene openers        |
| `paperBreakReveal`   | Paper Break Reveal  | Content breaks through like tearing paper | Energetic reveals    |
| `inverseAperture`    | Inverse Aperture    | Circular iris close/open effect           | Cinematic bookends   |
| `pixelateTransition` | Pixelate Transition | Pixelates then resolves — digital effect  | Tech, gaming content |

### Glitch & Digital

| Key         | Name       | Description                                  | Best For                  |
| ----------- | ---------- | -------------------------------------------- | ------------------------- |
| `glitch`    | Glitch     | Horizontal slice displacement with RGB shift | Tech, cyberpunk, energy   |
| `rgbGlitch` | RGB Glitch | Per-channel color glitch with scanline noise | Digital distortion        |
| `rgbShift`  | RGB Shift  | Chromatic aberration wobble effect           | Stylized intros           |
| `chromatic` | Chromatic  | Static chromatic aberration offset           | Cinematic lens distortion |

### Texture & Overlay

| Key            | Name           | Description                                | Best For                   |
| -------------- | -------------- | ------------------------------------------ | -------------------------- |
| `vignette`     | Vignette       | Darkens edges, focuses attention to center | All video — cinematic feel |
| `tvScanlines`  | TV Scanlines   | Horizontal CRT scanline overlay            | Retro, vintage, VHS        |
| `filmStripPro` | Film Strip Pro | Film grain + strip artifacts               | Cinematic, film look       |
| `halftone`     | Halftone       | Dot-pattern comic/print texture            | Stylized, graphic design   |
| `pixelate`     | Pixelate       | Blocky pixel grid texture                  | Digital, retro game        |
| `mirrorTile`   | Mirror Tile    | Mirrors the frame in a tiled pattern       | Abstract, artistic         |

### Energy & FX

| Key           | Name         | Description                               | Best For                |
| ------------- | ------------ | ----------------------------------------- | ----------------------- |
| `neonFlash`   | Neon Flash   | Neon glow burst effect                    | Nightlife, music, ads   |
| `shine`       | Shine        | Rotating light rays emanating from center | Product reveals, luxury |
| `laser`       | Laser        | Laser beam sweep across frame             | Action, gaming          |
| `wave`        | Wave         | Undulating wave distortion                | Music, energy           |
| `waveDistort` | Wave Distort | More aggressive wave displacement         | Hype, drops             |
| `sinewave`    | Sinewave     | Smooth sinusoidal warp                    | Subtle motion texture   |
| `sparks`      | Sparks       | Particle spark burst overlay              | Action, celebration     |

### Distort & Warp

| Key                 | Name               | Description                           | Best For             |
| ------------------- | ------------------ | ------------------------------------- | -------------------- |
| `distort`           | Distort            | Mesh distortion of the frame          | Creative, abstract   |
| `distortV2`         | Distort V2         | Enhanced distortion with more control | Premium warp effects |
| `distortSpin`       | Distort Spin       | Spinning distortion vortex            | Dynamic transitions  |
| `distortGrid`       | Distort Grid       | Grid-based distortion pattern         | Geometric, tech      |
| `perspectiveSingle` | Perspective Single | Single-point perspective tilt         | Depth, 3D feel       |

---

## AI Prompt Examples

| User Prompt                        | Effect Key                         | Placement                     |
| ---------------------------------- | ---------------------------------- | ----------------------------- |
| "add a fade in at the start"       | `fadeIn`                           | `from: 0`, `to: 1000000` (1s) |
| "add a fade out at the end"        | `fadeOut`                          | last 1s of project            |
| "make it look cinematic"           | `vignette` + `hdr`                 | full project duration         |
| "add a glitch effect on clip 2"    | `glitch`                           | clip 2 display range          |
| "dramatic zoom punch on the intro" | `fastZoom`                         | first 0.5s of clip 1          |
| "add a retro film look"            | `sepia` + `tvScanlines`            | full project duration         |
| "make colors pop for Instagram"    | `hdrV2`                            | full project duration         |
| "add energy/hype to the drop"      | `flashLoop` + `rgbGlitch`          | beat/drop time range          |
| "add a cinematic reveal on clip 3" | `curtainOpen` or `focusTransition` | start of clip 3               |
| "add black flash between clips"    | `blackFlash`                       | at the cut point (±0.1s)      |
| "add a vignette to all clips"      | `vignette`                         | full project duration         |
| "blur in the first clip"           | `focusTransition`                  | start of clip 1               |
