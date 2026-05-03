---
name: auto-caption
description: Automatically transcribes all video/audio clips and adds styled text overlays (captions) to the timeline.
---

# auto-caption

## Overview
This skill automates the process of adding accessibility captions to a video. It uses speech-to-text to find timecodes and generates text clips.

## Instructions
Use this skill when the user asks for "subtitles", "captions", "transcription", or "text for what is said".

### Implementation Details
If you use this skill via a `skill` step:
1. The backend will scan all audio/video clips.
2. It will generate a transcription job.
3. It will add a sequence of `Caption` clips to a new "Captions" track.

### When to use
- Improving accessibility.
- Creating "viral" styled captions.
- When the user says "add subtitles".
