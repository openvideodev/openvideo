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
```json
{
  "type": "command",
  "description": "Adding an image",
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
        "opacity": 0.5,
        "angle": 45,
        "left": 960,
        "top": 540
      }
    }
  }
}
```

**Example: Changing Text Content**
```json
{
  "type": "command",
  "description": "Updating text to say 'Welcome'",
  "command": {
    "type": "clip.update",
    "payload": {
      "id": "clip_abc123",
      "updates": {
        "text": "Welcome"
      }
    }
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

### Important Properties Reference
- `type`: Must be `"Text"`, `"Image"`, `"Video"`, or `"Audio"`.
- `text`: The string content (only for Text clips).
- `src`: The media URL (only for Image, Video, Audio).
- `left` / `top`: Position in pixels. 1920x1080 is the default resolution. Center is (960, 540).
- `width` / `height`: Dimensions in pixels.
- `opacity`: Number from 0 (transparent) to 1 (opaque).
- `angle`: Rotation in degrees (e.g., 90, 180).
- `display`: Defines when the clip is visible on the timeline. e.g., `{ "from": 0, "to": 5000000 }` (microseconds). Default duration is 5 seconds.
