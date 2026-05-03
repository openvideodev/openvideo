---
name: media-generation
description: Generate new image and video clips using AI models (Imagen 3 and Veo 3) based on text prompts.
---

# media-generation

## Overview
Use this skill when the user wants to create new visual content that doesn't exist in the project yet. You can generate static images (Imagen 3) or short video clips (Veo 3).

## Instructions
When the user asks to "generate", "create", or "add" a new image or video from a description, you should output a step with `type: "generate"` in your plan.

### 1. Generating Images
Use `jobType: "generate-image"` to create a new image.

**Example: "Add a cat image"**
```json
{
  "type": "generate",
  "description": "Generating a cat image",
  "jobType": "generate-image",
  "jobParams": {
    "prompt": "A high-quality, cinematic photo of a fluffy ginger cat sitting on a velvet sofa, 8k resolution, soft lighting"
  }
}
```

### 2. Generating Videos
Use `jobType: "generate-video"` to create a video clip. You can optionally provide an `imageUrl` to use as a starting point (Image-to-Video).

**Example: "Generate a video of a car driving"**
```json
{
  "type": "generate",
  "description": "Generating a video of a car",
  "jobType": "generate-video",
  "jobParams": {
    "prompt": "A sleek silver sports car driving fast on a coastal highway during sunset, drone shot, cinematic motion"
  }
}
```

**Example: "Animate this image" (assuming you have an image clip ID)**
1. First, call `get_project_state` to find the image URL.
2. Then, use that URL as `imageUrl`.
```json
{
  "type": "generate",
  "description": "Animating the selected image",
  "jobType": "generate-video",
  "jobParams": {
    "imageUrl": "https://r2.example.com/images/clip_123.png",
    "prompt": "The camera slowly zooms into the cat's eyes as it blinks"
  }
}
```

### Important Notes
- **Automatic Addition**: Once the generation is complete, the system will automatically add the resulting clip to the timeline. You do NOT need to follow up with a `clip.add` command in the same plan.
- **Async Execution**: These steps are asynchronous. The user will see a "generating" state in the chat until it's finished.
- **Detailed Prompts**: Always expand simple user requests (e.g., "a cat") into detailed, descriptive prompts to get the best results from the AI models.
