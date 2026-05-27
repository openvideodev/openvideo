---
name: social-clip
description: Converts a horizontal video to a vertical format suitable for TikTok/Reels/Shorts. Center-crops the video and adds auto-captions.
---

# social-clip

## Overview

This skill repurposes horizontal content for social media platforms that require vertical video (9:16 aspect ratio). It handles resizing, cropping, and prepares captions.

## Instructions

When a user asks to make a "TikTok", "Reel", "Short", or "vertical video", use this skill.

### Implementation Details

If you use this skill via a `skill` step, the backend will:

1. Update project settings to 1080x1920 (9:16).
2. Rescale and center-crop all existing video clips to fit the vertical frame.
3. Trigger an asynchronous auto-captioning process (if media allows).

### When to use

- Repurposing existing footage for mobile.
- Formatting for TikTok, Instagram Reels, or YouTube Shorts.
- When the user says "make this vertical".
