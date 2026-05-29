---
name: project-settings
description: Learn how to change project-level settings — canvas size (aspect ratio presets), background color, and frame rate.
---

# project-settings

## Overview

This skill documents how to use the `project.updateSettings` command to modify the global settings of the project: canvas dimensions, background color, and FPS. All values are merged into the existing settings, so you only need to include the fields you want to change.

## Instructions

When the user asks to change the canvas size, aspect ratio, background color, or frame rate, output a step with `type: "command"` using `project.updateSettings`.

---

## 1. Changing Aspect Ratio / Canvas Size

Use the standard presets below. Always set **both** `width` and `height` together.

### Presets

| Name                   | Ratio | Width | Height | Use case                |
| ---------------------- | ----- | ----- | ------ | ----------------------- |
| Vertical / Portrait    | 9:16  | 1080  | 1920   | TikTok, Reels, Shorts   |
| Horizontal / Landscape | 16:9  | 1920  | 1080   | YouTube, presentations  |
| Square                 | 1:1   | 1080  | 1080   | Instagram feed, profile |
| Portrait (Instagram)   | 4:5   | 1080  | 1350   | Instagram portrait feed |
| Classic TV             | 4:3   | 1440  | 1080   | Legacy, classic look    |
| Cinescope              | 21:9  | 2560  | 1080   | Ultra-wide cinematic    |

**Example: Set canvas to vertical 9:16**

```json
{
  "type": "command",
  "description": "Set canvas to vertical 9:16 (1080×1920)",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "width": 1080,
      "height": 1920
    }
  }
}
```

**Example: Set canvas to square 1:1**

```json
{
  "type": "command",
  "description": "Set canvas to square 1:1 (1080×1080)",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "width": 1080,
      "height": 1080
    }
  }
}
```

**Example: Set canvas to horizontal 16:9**

```json
{
  "type": "command",
  "description": "Set canvas to horizontal 16:9 (1920×1080)",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

---

## 2. Changing Background Color

`backgroundColor` is a hex color string. It sets the canvas background behind all clips.

**Example: Set background to black**

```json
{
  "type": "command",
  "description": "Set background color to black",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "backgroundColor": "#000000"
    }
  }
}
```

**Example: Set background to white**

```json
{
  "type": "command",
  "description": "Set background color to white",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "backgroundColor": "#ffffff"
    }
  }
}
```

**Example: Set background to a custom brand color**

```json
{
  "type": "command",
  "description": "Set background to deep navy",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "backgroundColor": "#0f172a"
    }
  }
}
```

---

## 3. Changing Frame Rate

`fps` controls how many frames per second the project renders. Standard values are `24`, `25`, `30`, `60`.

**Example: Set FPS to 24 (cinematic)**

```json
{
  "type": "command",
  "description": "Set frame rate to 24 fps",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "fps": 24
    }
  }
}
```

---

## 4. Combining Multiple Settings in One Step

You can change multiple settings in a single command. Only include the fields you want to change.

**Example: Switch to vertical 9:16 with a black background**

```json
{
  "type": "command",
  "description": "Switch to vertical 9:16 with black background",
  "command": {
    "type": "project.updateSettings",
    "payload": {
      "width": 1080,
      "height": 1920,
      "backgroundColor": "#000000"
    }
  }
}
```

---

## 5. Settings Reference

| Field             | Type     | Description                                                                |
| ----------------- | -------- | -------------------------------------------------------------------------- |
| `width`           | `number` | Canvas width in pixels                                                     |
| `height`          | `number` | Canvas height in pixels                                                    |
| `backgroundColor` | `string` | Hex color, e.g. `"#000000"`                                                |
| `fps`             | `number` | Frames per second (e.g. `24`, `30`, `60`)                                  |
| `duration`        | `number` | Total project duration in **microseconds** (usually managed automatically) |

> ⚠️ Do **not** set `duration` manually unless explicitly asked. It is recalculated automatically from clip timings.

---

## When to use

- User says "make it vertical", "switch to 9:16", "TikTok format", "Reels format" → set `width: 1080, height: 1920`
- User says "make it horizontal", "YouTube format", "widescreen" → set `width: 1920, height: 1080`
- User says "make it square", "Instagram square" → set `width: 1080, height: 1080`
- User says "change background color to X", "set background to X", "background should be X" → set `backgroundColor`
- User says "change FPS", "set frame rate" → set `fps`
