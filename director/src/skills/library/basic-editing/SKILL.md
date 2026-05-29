---
name: basic-editing
description: Learn how to add, modify, and delete basic clips (Text, Image, Video, Audio) and adjust their properties (opacity, rotation, etc) using low-level commands.
---

# basic-editing

## Overview

This skill documents how to use the underlying command-based API to directly manipulate clips on the timeline. It supports `Text`, `Image`, `Video`, and `Audio` clips.

## Instructions

When the user asks to add or edit basic clips or adjust properties (opacity, filters, position, rotation), you should output a step with `type: "command"` in your plan.

### 1. Adding Clips

Use the `clip.add` command to add a new clip to the timeline. You only need to provide the minimal required payload. The backend will automatically generate the unique ID, apply default sizing, and manage the tracks for you.

**Example: Adding a Text Clip**

```json
{
  "type": "command",
  "description": "Adding a text clip",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Text",
        "text": "Hello World"
      }
    }
  }
}
```

**Example: Adding an Image/Video Clip**

By default the system scales the clip to fit **inside** the canvas (`objectFit: "contain"`). You can override this per-clip:

```json
{
  "type": "command",
  "description": "Adding an image (default: contain — fits inside canvas, no cropping)",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Image",
        "src": "https://example.com/image.jpg"
      }
    }
  }
}
```

```json
{
  "type": "command",
  "description": "Adding a video filling the canvas (cover — may crop edges)",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Video",
        "src": "https://example.com/video.mp4",
        "objectFit": "cover"
      }
    }
  }
}
```

> `objectFit` is only meaningful for `Image` and `Video` clips. Valid values: `"contain"` (default — scales to fit, no cropping), `"cover"` (scales to fill, crops edges).

### 2. Updating Clips

Use the `clip.update` command to modify an existing clip. First, use `get_project_state` to find the exact `id` of the clip you want to modify.

**Example: Changing Position, Rotation, and Opacity**

```json
{
  "type": "command",
  "description": "Rotating the text and fading it",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "clip_abc123",
      "updates": {
        "transform": {
          "opacity": 0.5,
          "angle": 45,
          "x": 960,
          "y": 540
        }
      }
    }
  }
}
```

**Example: Changing Text Content and Style**

```json
{
  "type": "command",
  "description": "Updating text to say 'Welcome' with new styling",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "clip_abc123",
      "updates": {
        "text": "Welcome",
        "style": {
          "color": "#ff5700",
          "fontSize": 48,
          "align": "center"
        }
      }
    }
  }
}
```

**Example: Batch Updating Multiple Clips in a Single Step (Recommended)**

If you need to update multiple clips (for example, reducing the font size of all captions or editing the styling/properties of multiple text blocks), you MUST combine them into a single command step with an array payload instead of using multiple command steps. This ensures that only one step is displayed to the user and executed atomically.

```json
{
  "type": "command",
  "description": "Reducing font size for all caption clips from 80 to 60",
  "command": {
    "type": "clip.update",
    "payload": [
      {
        "id": "caption_clip_1",
        "updates": {
          "style": {
            "fontSize": 60
          }
        }
      },
      {
        "id": "caption_clip_2",
        "updates": {
          "style": {
            "fontSize": 60
          }
        }
      },
      {
        "id": "caption_clip_3",
        "updates": {
          "style": {
            "fontSize": 60
          }
        }
      }
    ]
  }
}
```

### 3. Removing Clips

Use the `clip.remove` command to delete one or more clips by their IDs.

**Example: Deleting a clip**

```json
{
  "type": "command",
  "description": "Removing the logo",
  "command": {
    "type": "clip.remove",
    "payload": {
      "ids": ["clip_abc123"]
    }
  }
}
```

### 4. Removing a Track (and all its clips)

Use the `track.remove` command to delete an entire track by its ID. This will automatically remove all clips that belong to that track as well.

> First call `get_project_state` to find the track ID you want to remove.

**Example: Deleting a track**

```json
{
  "type": "command",
  "description": "Removing the text track",
  "command": {
    "type": "track.remove",
    "payload": {
      "id": "track_abc123"
    }
  }
}
```

> ⚠️ Tracks with `static: true` cannot be auto-removed by the system during clip cleanup. You can still explicitly remove them with `track.remove`.

### Important Properties Reference

- `type`: Must be `"Text"`, `"Image"`, `"Video"`, or `"Audio"`.
- `text`: The string content (only for Text clips).
- `src`: The media URL (only for Image, Video, Audio).
- `transform`: Coordinates, size, rotation, opacity, and layering.
  - `x` / `y`: Position in pixels. 1920x1080 is the default canvas resolution. Center is (960, 540).
  - `width` / `height`: Dimensions in pixels.
  - `opacity`: Number from 0 (transparent) to 1 (opaque).
  - `angle`: Rotation in degrees (e.g., 90, 180).
  - `zIndex`: Layering order (higher numbers render on top).
  - `flip`: Horizontal/vertical mirroring, e.g., `{ "x": true, "y": false }`.
- `timing`: Placement and playback details.
  - `display`: Defines when the clip is visible on the timeline. e.g., `{ "from": 0, "to": 5000000 }` (microseconds). Default duration is 5 seconds.
  - `trim`: Crop of the source media, e.g., `{ "from": 0, "to": 5000000 }`.
  - `duration`: Duration of the clip in microseconds, e.g., `5000000`.
  - `playbackRate`: Playback speed, e.g. `1` or `1.5`.
- `style`: Visual styling block.
  - `color`: Text color code, e.g., `"#ffffff"` (only for Text clips).
  - `fontSize`: Text font size in pixels, e.g., `48`.
  - `fontFamily`: Google Fonts family name, e.g., `"Inter"`.
  - `align`: Text alignment (`"left"`, `"center"`, `"right"`).
  - `stroke`: Border around text/clip elements, e.g., `{ "color": "#000000", "width": 4 }`.
  - `shadow`: Shadow properties, e.g., `{ "color": "#000000", "alpha": 0.5, "blur": 4, "offsetX": 2, "offsetY": 2 }`.

### 5. Note on Transitions and Effects

Transitions and Effects have been moved to their own dedicated skills:

- For transitions (crossfades, slides, wipes, GLSL, etc.), see the `transition-editing` skill.
- For visual filters and effects (blur, pixelate, emboss, noise, custom shaders, etc.), see the `effect-editing` skill.
