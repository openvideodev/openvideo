---
name: highlight-reel
description: Analyzes long-form video content to find the most engaging moments and creates a short, fast-paced montage.
---

# highlight-reel

## Overview
Summarizes long footage into a high-energy highlight reel.

## Instructions
Use this when the user asks to "summarize", "find the best parts", or "make a montage".

### Implementation Details
The backend will:
1. Scan for high-motion or high-audio-amplitude segments.
2. Cut the best 15-30 seconds.
3. Arrange them with fast cuts.
