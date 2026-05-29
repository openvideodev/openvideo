---
name: cinematic
description: Applies a cinematic look: adds a teal-orange color grade, a slow zoom-in effect, and crossfade transitions between all video clips.
---

# cinematic

## Overview

This skill transforms a raw sequence of video clips into a cinematic edit. It applies professional color grading, dynamic motion, and smooth transitions.

## Instructions

When the user asks for a "cinematic" look or feel, you should use this skill.

### Implementation Details

If you use this skill via a `skill` step, the backend will automatically:

1. Identify all video clips in the project.
2. Apply a `colorGrade` effect (Teal & Orange) with 0.8 intensity.
3. Apply a `zoom` effect (Slow Zoom In) with 0.05 speed.
4. Add `crossfade` transitions (1 second duration) between all adjacent video clips.

### When to use

- To give the video a "movie" feel.
- To polish a rough edit quickly.
- When the user mentions "teal and orange" or "pro look".
