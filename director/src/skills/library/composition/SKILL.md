---
name: composition
description: Auto-compose a complete video from a topic prompt using existing assets, then generate background music and sound effects with ElevenLabs.
---

# composition

## Overview

Use this skill when the user asks you to **automatically build a complete video** from their uploaded assets based on a topic, theme, or mood — and optionally add AI-generated background music and/or sound effects.

**Trigger phrases**: "create a video about X", "make a 45-second composition on Y", "build a video using my assets about Z", "auto-edit a video on topic X".

---

## Workflow (always follow this exact order)

### Step 1 — Understand the request

Extract from the user's message:

- **topic**: the subject/theme (e.g. "Artificial Intelligence", "nature", "product launch")
- **duration**: total target duration in seconds (default: 30s if not specified)
- **bgMusic**: whether background music is requested (boolean, default true)
- **sfx**: whether sound effects are requested (boolean, default false)
- **style**: optional style hint (e.g. "cinematic", "energetic", "calm")

### Step 2 — Discover assets

Call `get_space_state` to retrieve all available assets. Note their `id`, `type`, `src`, `name`, and `duration`.

### Step 3 — Semantic search for matching segments

Call `search_all_context` with a query derived from the topic to find the most relevant video/image segments from indexed assets. Use a rich query like:

- `"<topic> scenes visuals concepts"`

Also call `search_space_context` if you want to search within a specific asset's transcript or visual descriptions.

Use the returned segments (with `Asset ID`, `Source URL`, `Time Range`) to select which clips and which trim points to use.

### Step 4 — Build the video timeline

Based on the target duration and discovered segments, output `type: "command"` steps that:

1. **Add video clips** from matching assets, trimmed to the relevant segments.
   - Spread them to fill the total target duration.
   - Use `objectFit: "cover"` for full-canvas video clips.
   - Convert RAG time ranges from **milliseconds → microseconds** (×1000) for the `trim` field.
   - Space the `display` windows end-to-end: first clip from 0 to N, second from N to M, etc.

2. **Add a title card** (optional but recommended) as a `Text` clip at the start.
   - e.g. `{ type: "Text", text: "<topic>", timing: { display: { from: 0, to: 3000000 } } }`

3. **Add crossfade transitions** between video clips using:
   ```json
   {
     "type": "command",
     "command": {
       "type": "clip.add",
       "payload": {
         "type": "Transition",
         "transitionKey": "fade",
         "fromClipId": "<clip_A_id>",
         "toClipId": "<clip_B_id>",
         "timing": { "duration": 800000 }
       }
     }
   }
   ```
   > ⚠️ You do NOT know the generated clip IDs ahead of time. Use a `type: "skill"` step with `skillName: "transition-editing"` and `skillParams: { transitionKey: "fade", durationMs: 800 }` to add transitions after clips are placed.

### Step 5 — Generate background music (if requested)

Output a `type: "generate"` step:

```json
{
  "id": "step_bgm",
  "type": "generate",
  "description": "Generating background music for the composition",
  "jobType": "generate-background-music",
  "jobParams": {
    "prompt": "Soft ambient background music for a video about <topic>, <style> mood, <duration> seconds, instrumental",
    "durationSeconds": <duration>,
    "audioType": "background-music"
  }
}
```

### Step 6 — Generate sound effects (if requested)

For each major scene transition or key moment, output a `type: "generate"` step:

```json
{
  "id": "step_sfx_1",
  "type": "generate",
  "description": "Generating sound effect for opening scene",
  "jobType": "generate-sound-effect",
  "jobParams": {
    "prompt": "Subtle whoosh sound effect for a video intro, futuristic technology theme",
    "durationSeconds": 2,
    "audioType": "sound-effect"
  }
}
```

---

## Important Rules

- **ALWAYS call `get_space_state` and `search_all_context` before building any steps** — do not invent asset IDs or URLs.
- If no relevant segments are found via semantic search, fall back to using all available video assets in order.
- If the user doesn't specify duration, default to **30 seconds**.
- Spread clips to fill the requested duration. If asset segments are shorter than needed, loop or repeat across assets.
- Convert all RAG timestamps: RAG returns **milliseconds**, timeline needs **microseconds** (multiply by 1000).
- Background music clip should span the **entire composition** duration: `display: { from: 0, to: <totalDurationMicroseconds> }`.
- Sound effects are placed at key moments (0, mid-point, transitions).
- When `bgMusic` or `sfx` is requested, always queue the respective `generate` steps — the system will call ElevenLabs and automatically add the audio clip to the timeline.
- Keep the summary friendly and tell the user exactly what you are building and from which assets.

---

## Narrative Composition Mode

Use this mode when the user provides a **structured brief** with sections, a target audience, tone, or narrative arc — e.g. "employee highlight reel", "brand story", "product launch video", "day in the life".

### Detecting Narrative Mode

Switch to Narrative Mode when the prompt includes ANY of:

- Numbered sections / narrative flow (intro → middle → closing)
- A defined audience ("early career talent", "customers", "investors")
- A tone descriptor ("authentic", "energetic", "inspiring", "warm")
- Multiple content themes to cover in sequence
- Output format requirements (vertical, LinkedIn, Reels, TikTok)

### Narrative Mode Workflow

#### Step 1 — Parse the brief

Extract:

- **sections**: ordered list of narrative beats (e.g. `["introductions", "daily routines", "collaboration", "culture", "closing"]`)
- **durationRange**: `{ min: N, max: M }` in seconds (if a range is given, target the midpoint)
- **outputFormat**: `"vertical"` (9:16) or `"horizontal"` (16:9). Default to `"vertical"` for LinkedIn Reels / TikTok / Instagram
- **tone**: e.g. "energetic", "warm", "inspiring"
- **cutPace**: derive from tone:
  - `"fast"` → target 2.5–4s per soundbite (energetic, TikTok, social reel)
  - `"medium"` → target 4–7s per soundbite (warm, narrative, documentary)
- **subtitles**: true if brief mentions "subtitles", "captions", or "quote callouts"
- **bgMusic**: true if brief mentions "music" (default true for social reels)

---

#### Step 2 — Set canvas format first

**Always the very first command step** when output is vertical:

```json
{
  "id": "step_canvas",
  "type": "command",
  "description": "Set canvas to vertical 9:16 for social media",
  "command": {
    "type": "project.updateSettings",
    "payload": { "width": 1080, "height": 1920, "backgroundColor": "#000000" }
  }
}
```

---

#### Step 3 — Discover assets

Call `get_space_state`. Note each asset's `id`, `name`, `type`, `src`, and `duration`.

---

#### Step 4 — Section-by-section semantic search (with topK=20)

For each narrative section, run a **separate `search_all_context` call** using `topK=20`. Do NOT use a single broad query for the whole video.

Example section → query mapping for an employee highlight reel:

- `"introductions"` → `"employee introduction name role team greeting hi hello"`
- `"daily routines"` → `"morning routine daily work desk laptop office focused working"`
- `"collaboration"` → `"team meeting together discussion whiteboard pair programming review"`
- `"culture"` → `"company culture values celebration fun lunch team bonding energy"`
- `"closing"` → `"why I love working here inspiring closing statement proud meaningful"`

Collect all results per section. You will filter them in Step 5.

---

#### Step 5 — Professional clip selection (the most important step)

This is where quality is determined. For each section, go through the results and apply ALL of the following filters before selecting a segment:

**A. Sentence boundary check (never cut mid-sentence)**

- Examine the `pageContent` field of each RAG result.
- Only select segments where the `pageContent` text **starts at the beginning of a sentence or phrase** (begins with a capital letter or a name) and **ends at a natural pause** (ends with `.`, `?`, `!`, `,`, `—`, or a complete phrase).
- Discard any segment whose `pageContent` starts mid-word or mid-sentence.
- If the segment text is a complete, self-contained thought or soundbite, it is a good candidate.

**B. Minimum duration floor**

- The natural duration of the segment = `(endMs - startMs)` from the RAG result.
- Discard any segment shorter than **2000ms** (2 seconds). These are too short to feel complete.
- Prefer segments in the **3000ms–8000ms** range. They are long enough to feel meaningful but short enough to stay punchy.
- For a `"fast"` cut pace, trim the trim end to `startMs + 3500ms` if the segment is longer than 4s, preserving the start of the sentence.
- For a `"medium"` pace, use the full natural segment up to 7s.

**C. Global deduplication (critical — prevents repeated clips)**

- Maintain a mental set of all used segments: `usedSegments = Set` of `"assetId::startMs"` strings.
- Before selecting any segment, check: if `"assetId::startMs"` is already in `usedSegments`, **skip it entirely** — do not use it even if it scores well for the current section.
- After selecting a segment, immediately add it to `usedSegments`.
- This applies **across all sections** — a segment used in "introductions" must never appear again in "collaboration" or any other section.

**D. Per-asset variety (diversity of speakers/scenes)**

- Within a single section, do not use the same `Asset ID` more than twice.
- Never place two clips from the same asset back-to-back. Always alternate assets between consecutive clips.
- If only one or two assets are available, allow repeats but still enforce minimum 15 seconds of source distance between uses of the same asset (i.e. `|startMs_B - startMs_A| >= 15000`).

**E. Relevance threshold**

- If a result's `pageContent` is clearly off-topic (e.g. a "culture" section gets a result about technical onboarding), skip it.
- Prefer results whose `Topics` metadata includes keywords matching the section theme.

After filtering, **rank candidates by**: completeness of sentence → natural duration in target range → asset variety. Pick the top N for the section based on the section's allocated time.

---

#### Step 6 — Calculate section time budgets

Before writing steps, calculate how many seconds each section gets:

```
targetDuration = midpoint of durationRange (e.g. 75s for 60–90s)
perSectionSeconds = targetDuration / numberOfSections
```

Then for each section, calculate how many clips fit:

```
clipsPerSection = floor(perSectionSeconds / avgClipDuration)
```

- If a section has fewer valid candidates than `clipsPerSection`, reduce that section's clips and redistribute to adjacent sections.
- Never add clips just to hit a duration target if they fail the quality filters in Step 5.

---

#### Step 7 — Assemble the timeline

Place clips sequentially, tracking a running `cursor` (starts at 0):

For each selected segment:

1. Set `trim.from = segmentStartMs * 1000` (convert to µs)
2. Set `trim.to`:
   - For `"fast"` pace: `min(segmentEndMs, segmentStartMs + 3500) * 1000`
   - For `"medium"` pace: `min(segmentEndMs, segmentStartMs + 7000) * 1000`
3. Set `display.from = cursor`
4. Set `display.to = cursor + (trim.to - trim.from)`
5. Advance `cursor = display.to`
6. Use `objectFit: "cover"` for all video clips

```json
{
  "type": "command",
  "description": "Add intro clip — Employee greeting",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Video",
        "src": "<asset src URL>",
        "name": "<asset name>",
        "objectFit": "cover",
        "timing": {
          "display": { "from": 0, "to": 3500000 },
          "trim": { "from": 2000000, "to": 5500000 }
        }
      }
    }
  }
}
```

> ⚠️ All timing values are in **microseconds**. RAG returns milliseconds — always multiply by 1000.

---

#### Step 8 — Add quote callout text overlays (for key soundbites only)

Select 2–3 emotionally strong segments — typically from "culture", "why I love it", and "closing" — and add a `Text` clip that overlaps the video clip's exact display window.

**Pull the quote text verbatim from the segment's `pageContent`** in the RAG result. Use the actual words the person said — never invent a quote.

Trim long quotes to the most impactful 6–10 words. Wrap in quotation marks.

```json
{
  "type": "command",
  "description": "Quote callout: key soundbite",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Text",
        "text": "\"The energy here is unlike anywhere else.\"",
        "timing": { "display": { "from": <same_from_as_video_clip>, "to": <same_to_as_video_clip> } },
        "style": {
          "fontSize": 52,
          "color": "#ffffff",
          "align": "center",
          "fontFamily": "Inter",
          "shadow": { "color": "#000000", "alpha": 0.65, "blur": 10, "offsetX": 0, "offsetY": 3 }
        },
        "transform": { "x": 540, "y": 1580, "width": 980 }
      }
    }
  }
}
```

---

#### Step 9 — Add subtitles / auto-captions

If `subtitles: true`, add this **after all video clip steps**:

```json
{
  "id": "step_captions",
  "type": "skill",
  "description": "Adding subtitles from speech",
  "skillName": "auto-caption",
  "skillParams": {}
}
```

---

#### Step 10 — Generate background music

Music should sit **under** speech, not over it. The prompt should describe the emotional arc, not just the genre.

```json
{
  "id": "step_bgm",
  "type": "generate",
  "description": "Generating background music for the highlight reel",
  "jobType": "generate-background-music",
  "jobParams": {
    "prompt": "Upbeat, warm, human background music for a company culture highlight reel targeting early career professionals. Energetic but not overwhelming. Acoustic and electronic blend, no vocals, builds gradually, ~<targetDuration> seconds.",
    "durationSeconds": <targetDuration>
  }
}
```

---

## Narrative Rules

- **Canvas format is always set first** — before any clip.add steps.
- **Never fabricate asset IDs or src URLs** — use only what `get_space_state` returns.
- **Never cut mid-sentence** — always verify `pageContent` starts and ends at a natural speech boundary.
- **Never repeat a segment** — global dedup across all sections is mandatory.
- **Never place the same asset back-to-back** — alternate speakers/scenes between consecutive clips.
- **Never add a clip shorter than 2 seconds** — it will feel like a glitch, not an edit.
- **Duration range**: target the midpoint. If exact fit is impossible after quality filtering, prefer going slightly over the minimum rather than adding low-quality filler clips.
- **If a section has zero valid segments**: skip the section entirely, log it in the plan `summary` ("I couldn't find strong intro segments, so I merged that time into the collaboration section"), and redistribute time.
- **Quote text must be verbatim from RAG `pageContent`** — never write fictional quotes.
- **Music prompt must describe emotion and context** — not just "upbeat music". The more specific, the better the ElevenLabs output.

---

## Example Plan (60–90s Employee Highlight Reel)

**User prompt**: "Create a 60–90 second vertical highlight reel from employee videos. Theme: A Day in the Life. Include subtitles and upbeat music. Fast-paced cuts. Sections: introductions, daily routines, collaboration, culture, closing."

**Tool calls**:

1. `get_space_state` → list employee video assets
2. `search_all_context("employee introduction name role greeting")` → intro segments
3. `search_all_context("daily routine morning desk office working")` → routine segments
4. `search_all_context("team meeting collaboration discussion together")` → collab segments
5. `search_all_context("company culture values fun celebration")` → culture segments
6. `search_all_context("why I love working here inspiration closing")` → closing segments

**Then output steps** (targeting 75s total, 2–3s cuts, vertical):

```
1. command: project.updateSettings (1080×1920, black bg)
2. command: clip.add Video (intro employee 1, 2s cut)
3. command: clip.add Video (intro employee 2, 2s cut)
4. command: clip.add Video (intro employee 3, 2s cut)
5. command: clip.add Video (daily routine moment, 3s cut)
6. command: clip.add Video (daily routine moment 2, 3s cut)
7. command: clip.add Video (collaboration moment 1, 2s cut)
8. command: clip.add Video (collaboration moment 2, 3s cut)
9. command: clip.add Text (quote overlay on collab clip)
10. command: clip.add Video (culture moment 1, 3s cut)
11. command: clip.add Video (culture moment 2, 2s cut)
12. command: clip.add Video (closing statement, 4s cut)
13. command: clip.add Text (quote overlay on closing)
14. skill: auto-caption
15. generate: generate-background-music (75s, upbeat energetic)
```

---

## Example Plan (45-second AI topic video)

**User prompt**: "Using my assets, create a 45 seconds video about AI. Add background music and sound effects."

**Tool calls to make first**:

1. `get_space_state` → discover available assets
2. `search_all_context` with query `"artificial intelligence technology machine learning"` → find matching segments

**Then output steps**:

```
1. clip.add (Video, asset matching AI segment 0–15s)
2. clip.add (Video, asset matching AI segment 15–30s)
3. clip.add (Video, asset matching AI segment 30–45s)
4. clip.add (Text, title "Artificial Intelligence")
5. generate (generate-background-music, 45s, ambient AI theme)
6. generate (generate-sound-effect, opening whoosh)
7. generate (generate-sound-effect, mid-point transition)
```

---

## ElevenLabs Audio Generation Notes

- `generate-background-music` and `generate-sound-effect` are both dispatched via **ElevenLabs Sound Generation API**.
- The system handles the API call, uploads the audio to storage, and adds the clip to the timeline automatically.
- You only need to set a descriptive `prompt` and `durationSeconds`.
- `audioType` must be either `"background-music"` or `"sound-effect"`.
- Keep prompts descriptive: include the mood, energy level, instruments (for music) or the event being sonified (for SFX).
