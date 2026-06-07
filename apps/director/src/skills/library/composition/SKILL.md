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
- A `Highlight:` bullet list (e.g. "* Team collaboration", "* Daily routines")

### Chapter Detection from Highlight Lists

If the prompt contains a `Highlight:` section (a list of bullet points like `* Team collaboration`, `* Daily routines`, `* Innovation and impact`), **treat each bullet as an individual chapter** with a title card. This is the primary structure for the video.

- Each highlight bullet → one chapter block: `[Title Card] → [2–3 video clips from different speakers]`
- Derive a short title label from the bullet text (e.g. `"* Team collaboration"` → `"Team Collaboration"`)
- Run a dedicated semantic search for each chapter's topic
- Use the Narrative Flow section (if present) only as pacing/story guidance — NOT as the chapter structure
- This automatically activates **Chaptered Mode** (see Chaptered Composition & Title Cards section below)

### Speaker Identification (for Lower Thirds)

Before building the timeline, identify the speaker/person for each asset:

1. Parse the asset `name` filename — e.g. `john_doe_intro.mp4` → `"John Doe"`, `sarah_k_culture.mp4` → `"Sarah K"`
2. Convert `_` and `-` to spaces, capitalize each word, strip extensions and trailing descriptors (e.g. `_intro`, `_q1`, `_clip2`)
3. If multiple assets share the same derived name prefix → they are the same person
4. Build a map: `speakerMap[assetId] = "FirstName LastName"`
5. Use this map when adding lower third overlays (see Step 8a below)

### Narrative Mode Workflow

#### Step 1 — Parse the brief

Extract:

- **chapters**: if `Highlight:` bullet list is present, extract each bullet as an ordered chapter (e.g. `["Team Collaboration", "Positive Culture Moments", "Daily Routines", "Cross-functional Work", "Flexibility and Wellbeing", "Innovation and Impact", "Employee Authenticity"]`). Otherwise extract from Narrative Flow numbered list.
- **durationRange**: `{ min: N, max: M }` in seconds (if a range is given, target the midpoint)
- **outputFormat**: `"vertical"` (9:16) or `"horizontal"` (16:9). Default to `"vertical"` for LinkedIn Reels / TikTok / Instagram
- **tone**: e.g. "energetic", "warm", "inspiring"
- **cutPace**: derive from tone:
  - `"fast"` → target 2.5–4s per soundbite (energetic, TikTok, social reel)
  - `"medium"` → target 4–7s per soundbite (warm, narrative, documentary)
- **subtitles**: true if brief mentions "subtitles", "captions", or "quote callouts"
- **bgMusic**: true if brief mentions "music" (default true for social reels)
- **lowerThirds**: true when assets are person-facing videos (Q&A responses, interviews, introductions). Default true for employee highlight reels.

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

#### Step 3 — Discover assets (get canonical URLs)

Call `get_space_state`. Note each asset's `id`, `name`, `type`, `src`, and `duration`.

**Important**: The `src` URLs from `get_space_state` are the **authoritative, current URLs**. RAG search results may contain stale URLs if assets were re-uploaded. Always use the `src` from this step when generating clip.add commands.

---

#### Step 4 — Chapter-by-chapter semantic search (with topK=20)

For each chapter (derived from `Highlight:` bullets or Narrative Flow), run a **separate `search_all_context` call** using `topK=20`. Do NOT use a single broad query for the whole video.

Example chapter → query mapping for an employee highlight reel:

- `"Team Collaboration"` → `"team meeting together working discussion whiteboard pair programming review collaboration"`
- `"Positive Culture Moments"` → `"company culture values celebration fun energy enthusiasm bonding proud"`
- `"Daily Routines"` → `"morning routine daily work desk laptop office focused working schedule"`
- `"Cross-functional Work"` → `"cross-team departments different functions coordination alignment stakeholders"`
- `"Flexibility and Wellbeing"` → `"flexible work remote home balance wellbeing health wellness mental life"`
- `"Innovation and Impact"` → `"innovation impact change building shipping product solving challenges creative ideas"`
- `"Employee Authenticity"` → `"authentic real genuine personal story real talk honest moment candid"`
- `"Quick Employee Introductions"` → `"employee introduction name role team greeting hi hello I am my name"`
  - For introduction queries, add **content validation**: verify `pageContent` actually contains self-introduction patterns like "I'm [Name]", "I work as [Role]", "my name is", "I joined [Company]"
  - **Per-person targeted search**: If you need to find an introduction for a specific person, include their name in the query: `"RJ Banez introduction name role team"`
- `"What They Enjoy Most"` → `"enjoy love best part favorite meaningful rewarding proud accomplishment"`
- `"Why the Culture Stands Out"` → `"why I love working here culture stands out different unique special proud"`

Adapt the queries to match the actual chapter names from the prompt. Collect all results per chapter. You will filter them in Step 5.

---

#### Step 5 — Professional clip selection (the most important step)

This is where quality is determined. For each section, go through the results and apply ALL of the following filters before selecting a segment:

**A. Timestamp validation (CRITICAL — must have valid timing)**

- **REJECT any RAG result where `startMs` or `endMs` is missing/undefined.**
- Only use segments with valid timestamps: `typeof startMs === 'number' && typeof endMs === 'number'`
- Layers that typically have timestamps: `asset-transcript`, `asset-chapters`, `video-chunk`, `transcript`
- Layers that do NOT have timestamps (reject these): `asset-summary`, `asset-topics`, `asset-description`
- Without valid `startMs`/`endMs`, you cannot calculate `trim.from` and `trim.to` — these segments cannot be used for video clips.

**⚠️ CRITICAL: Source URL Verification**
- RAG results may contain stale `src` URLs (asset may have been re-uploaded after indexing).
- **ALWAYS get the authoritative `src` URL from `get_space_state`** using the `assetId` from the RAG result.
- Never use the `src` directly from RAG metadata — use it only to identify which asset, then look up the current URL from the canonical asset list.

**B. Sentence boundary check (never cut mid-sentence)**

- Examine the `pageContent` field of each RAG result.
- Only select segments where the `pageContent` text **starts at the beginning of a sentence or phrase** (begins with a capital letter or a name) and **ends at a natural pause** (ends with `.`, `?`, `!`, `—`, or a complete phrase).
- **If a segment's `pageContent` ends mid-sentence** (no terminal punctuation, clearly not a complete thought), look for the immediately following RAG result from the **same `assetId`** and check if `nextSegment.startMs ≈ thisSegment.endMs` (within 200ms). If so, **merge them**: use `thisSegment.startMs` as `trim.from` and `nextSegment.endMs` as `trim.to`, and combine their text. Keep merging until you reach a sentence-ending word.
- Discard any segment that cannot be completed by merging (no following segment from same asset available).
- If the segment text is a complete, self-contained thought or soundbite, it is a good candidate.

**C. Duration floor and cutPace guidance**

- The natural duration of the segment = `(endMs - startMs)` from the RAG result (or the merged span).
- Discard any segment shorter than **2000ms** (2 seconds). Too short to feel complete.
- **NEVER artificially cut a segment shorter than its natural RAG end boundary.** The sentence must finish.
- `cutPace` is a **selection preference only** — it guides which naturally-complete segments to prefer:
  - `"fast"` pace → prefer segments whose natural duration is **2s–5s** (pick shorter, punchy soundbites that are already complete)
  - `"medium"` pace → prefer segments whose natural duration is **4s–10s** (pick more developed thoughts)
- If a segment naturally ends at 8s, use the full 8s — do **not** cut it to 3.5s.
- If only long segments (>10s) are available and the pace is `"fast"`, it is acceptable to use them whole rather than cut mid-sentence. Video length is secondary to content integrity.


**D. Global deduplication (critical — prevents repeated clips)**

- Maintain a mental set of all used segments: `usedSegments = Set` of `"assetId::startMs"` strings.
- Before selecting any segment, check: if `"assetId::startMs"` is already in `usedSegments`, **skip it entirely** — do not use it even if it scores well for the current section.
- After selecting a segment, immediately add it to `usedSegments`.
- This applies **across all sections** — a segment used in "introductions" must never appear again in "collaboration" or any other section.

**E. Speaker & Asset Variety (No Back-to-Back Same Speaker/Person)**

- **Speaker Identification**: Identify the speaker/person for each asset. Group assets by speaker based on the asset filename (e.g., `john_doe_intro.mp4` -> "John Doe"), metadata, or transcript content.
- **No Back-to-Back Same Speaker**: Never place two clips featuring the same speaker back-to-back on the timeline, even if they are from different files (assets). Always alternate speakers between consecutive clips (e.g., Speaker A → Speaker B → Speaker A → Speaker C).
- **Limit Speaker Frequency Per Section**: Within a single narrative section or question block, do not use the same speaker more than once. If multiple short videos answer the same question, select the single best clip for each speaker and sequence them alternatingly.
- **Asset ID Limit**: Within a single section, do not use the same `Asset ID` more than once.
- **If only 1 or 2 speakers/assets exist**: You may repeat them, but still enforce a minimum 15 seconds of source timeline distance between uses of the same asset (i.e., `|startMs_B - startMs_A| >= 15000`).

**F. Strict relevance validation (CRITICAL — prevent off-topic clips)**

This filter prevents the "weird content" problem where an off-topic clip gets selected just to "fill a slot" or because it's from the right person/asset.

**The Golden Rule: Content must serve the narrative.**

Every clip must earn its place in the video. Ask: "Does this clip directly serve the section's purpose?" If not, skip it.

**Relevance Score (apply to each RAG result):**

| Score | Definition | Example for "Adventure Vlog" | Example for "Product Demo" | Example for "Employee Intros" |
|-------|------------|------------------------------|----------------------------|-------------------------------|
| **HIGH** | Content explicitly matches the section's core intent | Cliff jumping, trail hiking, mountain scenery | Feature walkthrough, user interaction, benefit explanation | "I'm [Name]", "I work as [Role]", self-introduction language |
| **MEDIUM** | Related but not core to the section's purpose | Packing gear, driving to location, meal break | Company history, team culture, general talking | Daily routine, collaboration footage, but not introducing self |
| **LOW** | Off-topic or tangential only | Hotel room tour, unrelated conversation, someone else's footage | Competitor mention, off-topic anecdote, technical troubleshooting | Weekend plans, technical deep-dive, talking about others |

**Universal Rules (apply to ALL formats):**
1. **ONLY use HIGH relevance clips.** Skip MEDIUM and LOW.
2. **Never force a clip** to hit a "one per person/asset" quota. If the content doesn't serve the narrative, skip it.
3. **Never pad with "best available" weak clips.** A shorter, cohesive video beats a longer one with jarring content.
4. Check `Topics` metadata — if it doesn't align with the section theme, treat as LOW relevance.

**When an asset/person lacks HIGH relevance clips:**
- **Skip them entirely.** Do not include their off-topic content.
- Note in summary: "Found 3 strong adventure clips; 2 assets had no relevant content for this section."
- The final video includes only assets that serve the narrative purpose.

After filtering, **rank candidates by**: completeness of sentence → natural duration in target range → asset variety. Pick the top N for the section based on the section's allocated time.

---

#### Step 6 — Calculate section time budgets

Before writing steps, calculate how many seconds each section gets:

```
targetDuration = midpoint of durationRange (e.g. 75s for 60–90s)
perSectionSeconds = targetDuration / numberOfSections
```

Then for each section, calculate how many clips fit:
Then for each section, estimate the number of clips:

```
// Select clips first to determine actual total section duration
// clipsPerSection is dynamic based on available content quality
```

- If a section has fewer valid candidates than `clipsPerSection`, reduce that section's clips and redistribute to adjacent sections.
- Never add clips just to hit a duration target if they fail the quality filters in Step 5.

---

#### Step 7 — Assemble the timeline

Place clips sequentially, tracking a running `cursor` (starts at 0):

For each selected segment:

1. Set `trim.from = segmentStartMs * 1000` (convert to µs)
2. Set `trim.to = segmentEndMs * 1000` — **always use the full natural segment end from RAG**. Never cap or shorten this.
3. Compute `clipDuration = trim.to - trim.from`
4. Set `display.from = cursor`
5. Set `display.to = cursor + clipDuration` ← **this MUST always equal display.from + (trim.to - trim.from)**
6. Advance `cursor = display.to`
7. Use `objectFit: "cover"` for all video clips

> 🚨 **CRITICAL — `display.to - display.from` MUST equal `trim.to - trim.from`.**
> The display window is the on-screen duration of the clip. The trim window is which portion of the source video plays.
> They must be the same length. A clip with `trim: { from: 1200000, to: 7800000 }` has a natural duration of **6,600,000 µs**.
> Its `display` must therefore span exactly **6,600,000 µs**: e.g. `{ from: 14000000, to: 20600000 }`.
> **NEVER set `display.to = cursor + 5000000` or any other fixed number.** Always compute from the trim span.

> Worked example:
> RAG segment → `startMs: 1200, endMs: 7800` (milliseconds from RAG)
> → `trim.from = 1200 * 1000 = 1200000`
> → `trim.to   = 7800 * 1000 = 7800000`
> → `clipDuration = 7800000 - 1200000 = 6600000` (6.6 seconds)
> → If cursor is at 14000000: `display = { from: 14000000, to: 20600000 }`
> → cursor advances to 20600000

> ⚠️ **No hard cuts allowed.** If the RAG segment says a speaker talks from 4200ms to 9800ms, use exactly `trim: { from: 4200000, to: 9800000 }`. Do not cap it at 7500000 or any other value. The total video may be longer than the target duration — that is acceptable. Content integrity always wins over hitting an exact runtime.

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

#### Step 7b — Template Formula (COPY THIS PATTERN)

When generating `clip.add` commands, use this exact template and substitute the RAG values:

```json
{
  "type": "command",
  "description": "Add video clip — <brief description>",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Video",
        "src": "<asset.src from get_space_state>",
        "name": "<asset.name>",
        "objectFit": "cover",
        "timing": {
          "trim": {
            "from": <segmentStartMs * 1000>,
            "to": <segmentEndMs * 1000>
          },
          "display": {
            "from": <cursor>,
            "to": <cursor + ((segmentEndMs - segmentStartMs) * 1000)>
          }
        }
      }
    }
  }
}
```

**Template Rules:**
1. **`src` MUST come from `get_space_state`** — RAG may have stale URLs. Use RAG only for `assetId`, `segmentStartMs`, `segmentEndMs` and content. Look up the current `asset.src` from the canonical asset list.
2. `trim.to` MUST equal `segmentEndMs * 1000` — never calculate it as `trim.from + 5000000`
3. `display.to - display.from` MUST equal `trim.to - trim.from` (same duration)
4. Advance cursor: `cursor = display.to` for the next clip

**Anti-Pattern Detection:**
If you find yourself writing `trim.to = trim.from + 5000000` or any fixed number, **STOP**. Use `segmentEndMs * 1000` instead.

---

#### Step 8a — Add lower third speaker name overlays (for every video clip with a known speaker)

If `lowerThirds: true`, for **every video clip** add a companion `Text` clip that shows the speaker's name at the bottom of the frame. This is a **lower third** — it appears in the lower portion of the frame overlapping the video, exactly matching the video clip's `display.from` and `display.to`.

- Use `speakerMap[assetId]` from Step 1 to get the speaker's name.
- If the name is unknown, skip the lower third for that clip.
- Style: small, clean, left-aligned, slightly above the bottom edge.

```json
{
  "type": "command",
  "description": "Lower third: John Doe",
  "command": {
    "type": "clip.add",
    "payload": {
      "clip": {
        "type": "Text",
        "text": "John Doe",
        "timing": { "display": { "from": <same_from_as_video_clip>, "to": <same_to_as_video_clip> } },
        "style": {
          "fontSize": 38,
          "color": "#ffffff",
          "align": "left",
          "fontFamily": "Inter",
          "shadow": { "color": "#000000", "alpha": 0.75, "blur": 8, "offsetX": 0, "offsetY": 2 }
        },
        "transform": { "x": 90, "y": 1760, "width": 900 }
      }
    }
  }
}
```

> For **horizontal (16:9)** canvas: position at `y: 940, x: 80` instead.
> Place lower third commands **immediately after** the video clip command they belong to, so the intent is clear.

---

#### Step 8b — Add quote callout text overlays (for key soundbites only)

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
- **🚫 NEVER cut mid-sentence** — always use the full `segmentEndMs` from the RAG result as `trim.to`. Do not cap a clip to a shorter duration. A speaker must finish their thought completely.
- **🚫 NEVER artificially shorten a clip to hit a duration target** — the total video may run longer than the requested range. Content integrity always wins. A 95-second video where every clip is complete is better than a 75-second video that cuts speakers mid-word.
- **cutPace is a selection preference, NOT a trim instruction** — use it to choose *which* naturally-complete segments to prefer (shorter for fast pace, longer for medium pace), never to truncate a chosen segment.
- **Never repeat a segment** — global dedup across all sections is mandatory.
- **Never place the same asset back-to-back** — alternate speakers/scenes between consecutive clips.
- **Never add a clip shorter than 2 seconds** — it will feel like a glitch, not an edit.
- **If a section has zero valid segments**: skip the section entirely, log it in the plan `summary` ("I couldn't find strong intro segments, so I merged that time into the collaboration section"), and redistribute time.
- **Quote text must be verbatim from RAG `pageContent`** — never write fictional quotes.
- **Music prompt must describe emotion and context** — not just "upbeat music". The more specific, the better the ElevenLabs output.

---

## Video Formats and Styles

Adjust editing pacing, canvas settings, transitions, captions, and audio generation depending on the requested format:

### 1. Vlog (Video Log / Storytelling)
- **Pacing**: Medium cuts (4.0s to 7.0s per clip). Emphasize speech and personal narratives.
- **Layout & Tracks**: Place talking-head clips on the base track. Overlay contextual images or b-roll footage on top (higher `zIndex`).
- **Transitions**: Direct cuts (no transitions) or short crossfades (max 400ms).
- **Captions**: Always enable subtitles via the `auto-caption` skill step.
- **Audio**: Low-volume, friendly, conversational instrumental background music.

### 2. Travel Montage
- **Pacing**: Fast-paced, high-energy cuts (2.0s to 3.5s per clip).
- **Visuals**: Focus on diverse landscapes, activity, or landmarks matching visual descriptions.
- **Transitions**: Crossfades or slides (800ms) between adjacent video clips. Invoke `transition-editing` skill.
- **SFX**: Add atmospheric/cinematic sound effects (whoosh, sweep, zoom, water splash) at transitions.
- **Audio**: Dynamic, energetic, or cinematic music. Captions are usually omitted unless voiceover exists.

### 3. Podcast
- **Pacing**: Slower cuts (6.0s to 12.0s per clip) matching speaker changes.
- **Layout**: Simple talking heads. Alternate clips based on active speaker segments.
- **Captions**: Always enable subtitles via the `auto-caption` skill step.
- **Audio**: Extremely low-volume, minimal ambient instrumental music.

### 4. Film (Cinematic / Atmospheric)
- **Pacing**: Slow, cinematic pacing (6.0s to 10.0s per clip).
- **Visuals**: Emphasize mood, color, lighting, and composition details.
- **Transitions**: Long crossfades (800ms to 1200ms) or fade-to-black.
- **Audio**: Orchestral or ambient/atmospheric synth pad music.

---

## Chaptered Composition & Title Cards

### Deciding When to Add Title/Chapter Cards
The addition of standalone title cards or chapter dividers is conditional and depends on the user's intent, the editing format, and asset structure:

1. **YES — Add Chapter/Title Cards**:
   - **Trigger (primary)**: The prompt contains a `Highlight:` bullet list (e.g. `* Team collaboration`, `* Daily routines`, `* Innovation and impact`). Each bullet becomes a chapter with a title card.
   - **Trigger (secondary)**: The prompt explicitly asks to answer specific questions, cover distinct numbered chapters, or create sections (e.g., "Answer Q1 and Q2 from my responses", "create a video divided into three chapters").
   - **Asset Structure**: Assets are short Q&A response snippets or employee video responses organized by topic.
   - **Layout**: Every chapter begins with a standalone `Text` clip occupying the timeline for **2 seconds** (`2,000,000` microseconds) on a blank/black background (no overlapping video). This is the chapter title card.
   - **Chapter Title Style**:
     ```json
     {
       "type": "Text",
       "text": "Team Collaboration",
       "style": {
         "fontSize": 56,
         "fontFamily": "Outfit",
         "color": "#ffffff",
         "align": "center",
         "shadow": { "color": "#000000", "alpha": 0.5, "blur": 12, "offsetX": 0, "offsetY": 2 }
       },
       "transform": { "x": 540, "y": 960, "width": 960 }
     }
     ```
     (For 16:9: `x: 960, y: 540`)
   - **Chapter Structure**: `[Chapter Title Card 2s] → [2–3 clips from different speakers on this topic]`
   - **After each chapter**: continue directly to next chapter's title card — no gap.
   - **Do NOT** add a global intro title card at `t=0` when using chapter mode — the first chapter's title card IS the opening.

2. **NO — Do NOT Add Chapter/Title Cards (Seamless Sequencing)**:
   - **Trigger**: The prompt describes a continuous storytelling narrative (e.g. "travel montage", "product promo vlog", "cinematic atmosphere video", "brand story") with NO `Highlight:` list and no numbered questions.
   - **Asset Structure**: The assets are a mix of B-roll and continuous speaking clips.
   - **Layout**: Video clips are sequenced end-to-end continuously without divider screens. Set `timing.display` of each clip to start exactly where the previous clip ends (i.e. `from` of clip $N$ is equal to `to` of clip $N-1$). Use soft transitions (like crossfades) to bridge them.

### Timeline Math & Offsets (For Chaptered Mode)

If chapter cards are enabled:
1. Maintain a running timeline position variable: `cursor = 0` (in microseconds).
2. For each chapter:
   - **Add Title Card**:
     - `clip.type = "Text"`
     - `timing.display = { from: cursor, to: cursor + 2000000 }`
     - Update `cursor = cursor + 2000000`
   - **Add Video Clips for that Chapter** (2–3 clips, alternating speakers):
     - For each video clip in this chapter:
       - `clip.type = "Video"`
       - `timing.display = { from: cursor, to: cursor + clipDuration }`
       - Update `cursor = cursor + clipDuration`
     - Immediately after each video clip command, add a lower third `Text` clip with the same `display.from`/`display.to`
3. **Audio Clips**:
   - Background music must span the entire composition: `timing.display = { from: 0, to: cursor }`.

---

## Example Plan (Employee Highlight Reel with Highlight-Bullet Chapters)

**User prompt**: _"Create a 60–90 second vertical highlight reel... Highlight: * Team collaboration * Daily routines * Employee authenticity..."_

**Detected**: Chaptered mode (Highlight list found). lowerThirds = true. outputFormat = vertical. cutPace = fast.

**Tool calls**:
1. `get_space_state` → build speakerMap from filenames
2. `search_all_context("team meeting together working discussion collaboration", topK=20)` → for Team Collaboration
3. `search_all_context("morning routine daily work desk laptop office", topK=20)` → for Daily Routines
4. `search_all_context("authentic real genuine personal honest candid", topK=20)` → for Employee Authenticity

**Steps** (cursor tracked in microseconds, all clip durations derived from RAG segment boundaries):

> In this example, RAG returned segments with these natural durations (endMs - startMs):
> - John Doe team clip: 3200ms → 3,200,000 µs
> - Sarah K team clip: 4700ms → 4,700,000 µs
> - Maria L routine clip: 5100ms → 5,100,000 µs
> - John Doe routine clip: 3800ms → 3,800,000 µs
> - Sarah K authentic clip: 6200ms → 6,200,000 µs
> - Maria L authentic clip: 4400ms → 4,400,000 µs

```
cursor = 0

[Chapter: Team Collaboration]
1.  command: project.updateSettings (1080×1920, black bg)  ← always first
2.  command: clip.add Text ("Team Collaboration", 0–2s)     cursor → 2,000,000
3.  command: clip.add Video (John Doe — team clip, display: 2s–5.2s, trim derived from RAG startMs/endMs)    cursor → 5,200,000
4.  command: clip.add Text (lower third: "John Doe", display: 2s–5.2s)
5.  command: clip.add Video (Sarah K — team clip, display: 5.2s–9.9s, trim derived from RAG startMs/endMs)   cursor → 9,900,000
6.  command: clip.add Text (lower third: "Sarah K", display: 5.2s–9.9s)

[Chapter: Daily Routines]
7.  command: clip.add Text ("Daily Routines", 9.9s–11.9s)   cursor → 11,900,000
8.  command: clip.add Video (Maria L — routine clip, display: 11.9s–17s, trim derived from RAG startMs/endMs) cursor → 17,000,000
9.  command: clip.add Text (lower third: "Maria L", display: 11.9s–17s)
10. command: clip.add Video (John Doe — routine clip, display: 17s–20.8s, trim derived from RAG startMs/endMs) cursor → 20,800,000
11. command: clip.add Text (lower third: "John Doe", display: 17s–20.8s)

[Chapter: Employee Authenticity]
12. command: clip.add Text ("Employee Authenticity", 20.8s–22.8s) cursor → 22,800,000
13. command: clip.add Video (Sarah K — authentic clip, display: 22.8s–29s, trim derived from RAG startMs/endMs) cursor → 29,000,000
14. command: clip.add Text (lower third: "Sarah K", display: 22.8s–29s)
15. command: clip.add Video (Maria L — authentic clip, display: 29s–33.4s, trim derived from RAG startMs/endMs) cursor → 33,400,000
16. command: clip.add Text (lower third: "Maria L", display: 29s–33.4s)

[Audio]
17. generate: generate-background-music (33.4s, upbeat warm human acoustic)
```

> ⚠️ NOTE: Every clip duration above comes from the RAG segment's (endMs - startMs). None are rounded to 4s or 5s.

---

## Example Plan (Chaptered Q&A Video)

**User prompt**: "Answer these questions using my clips: Q1: What is the main goal? Q2: How do we get there? Format: Film. Add music."

**Tool calls**:
1. `get_space_state`
2. `search_all_context("main goal mission vision objective")`
3. `search_all_context("how to get there steps strategy action plan")`

**Steps**:
```
1. command: project.updateSettings (1920×1080 horizontal, black bg)
2. command: clip.add Text (Q1 Title Card, 0s to 2s)
   cursor = 2,000,000
3. command: clip.add Video (Q1 Answer clip 1 — RAG: startMs=1800, endMs=7300 → trim: 1800000–7300000, clipDuration=5500000)
   display: { from: 2000000, to: 7500000 }   cursor = 7,500,000
4. command: clip.add Text (lower third: Speaker Name, display: 2s–7.5s)
5. command: clip.add Video (Q1 Answer clip 2 — RAG: startMs=400, endMs=6100 → trim: 400000–6100000, clipDuration=5700000)
   display: { from: 7500000, to: 13200000 }  cursor = 13,200,000
6. command: clip.add Text (lower third: Speaker Name, display: 7.5s–13.2s)
7. command: clip.add Text (Q2 Title Card, 13.2s to 15.2s)
   cursor = 15,200,000
8. command: clip.add Video (Q2 Answer clip 1 — RAG: startMs=2100, endMs=8900 → trim: 2100000–8900000, clipDuration=6800000)
   display: { from: 15200000, to: 22000000 } cursor = 22,000,000
9. command: clip.add Text (lower third: Speaker Name, display: 15.2s–22s)
10. command: clip.add Video (Q2 Answer clip 2 — RAG: startMs=500, endMs=5800 → trim: 500000–5800000, clipDuration=5300000)
    display: { from: 22000000, to: 27300000 } cursor = 27,300,000
11. command: clip.add Text (lower third: Speaker Name, display: 22s–27.3s)
12. skill: transition-editing (between adjacent video clips only, skip text clips)
13. generate: generate-background-music (27.3s, slow cinematic orchestral pad)
```

> Each clip's display window = trim span. No fixed 5s or 6s slots — every duration is computed from (segmentEndMs - segmentStartMs) × 1000.

---

## Example Plan (Employee Introductions — Strict Relevance Pattern)

> **Note**: This example illustrates the universal "strict relevance" principle. The same pattern applies to ALL formats:
> - **Adventure vlog**: Skip scenic shots that don't show adventure/action, even from the right location
> - **Product demo**: Skip testimonials about company culture, even from the right customer
> - **Wedding film**: Skip generic reception footage, keep only emotional/key moments
> - **Documentary**: Skip tangential B-roll, keep only content serving the narrative arc

**User prompt**: "Using my assets, create a short video composition that introduces all company employees."

**Assets**: 30 short videos from 5 employees (RJ Banez, Mina Moriguchi, Elizabeth Santandreu, Blessiva Johnson, Carden Jung). Some videos contain introductions, others contain daily routines, collaboration, or general commentary.

**Strategy**: Search per person to find their best introduction clip. Skip anyone without a clear self-introduction segment.

**Tool calls**:
1. `get_space_state` → identify all assets and their speakers from filenames
2. `search_all_context("RJ Banez introduction name role I am my name")` → find RJ's intro
3. `search_all_context("Mina Moriguchi introduction name role I am my name")` → find Mina's intro
4. `search_all_context("Elizabeth Santandreu introduction name role I am")` → find Elizabeth's intro
5. `search_all_context("Blessiva Johnson introduction name role I am")` → find Blessiva's intro
6. `search_all_context("Carden Jung introduction name role I am")` → find Carden's intro

**Step 5 Filtering (Critical):**
For each person's results, apply strict relevance check:
- **HIGH relevance**: pageContent contains "I'm [Name]", "My name is", "I work as", "I'm a [role]"
- **MEDIUM/LOW**: pageContent is about daily work, collaboration, but NOT self-introduction
- **Action**: Only select HIGH relevance. If none found, **skip that person entirely**.

**Example outcome after filtering:**
- ✅ RJ Banez: Found strong introduction (pageContent: "I'm RJ Banez, I work as a hospitality intern...")
- ✅ Mina Moriguchi: Found strong introduction (pageContent: "My name is Mina, I'm on the marketing team...")
- ✅ Elizabeth Santandreu: Found strong introduction
- ❌ Blessiva Johnson: **No HIGH relevance clip found** (her clips are about daily routines, not self-introduction)
- ✅ Carden Jung: Found strong introduction

**Decision**: Include 4 employees. Skip Blessiva. Note in summary: "Found strong introduction clips for 4 of 5 employees; Blessiva Johnson did not have a clear self-introduction segment."

**Steps**:
```
1. command: project.updateSettings (1080×1920, black bg)
2. command: clip.add Text ("Meet the Team", 0s–2s)              cursor → 2,000,000
3. command: clip.add Video (RJ Banez intro, display: 2s–7.5s, trim: startMs/endMs from RAG, src: from get_space_state)
   cursor → 7,500,000
4. command: clip.add Text (lower third: "RJ Banez", display: 2s–7.5s)
5. command: clip.add Video (Mina Moriguchi intro, display: 7.5s–13s, trim from RAG, src from get_space_state)
   cursor → 13,000,000
6. command: clip.add Text (lower third: "Mina Moriguchi", display: 7.5s–13s)
7. command: clip.add Video (Elizabeth Santandreu intro, display: 13s–19.2s, trim from RAG, src from get_space_state)
   cursor → 19,200,000
8. command: clip.add Text (lower third: "Elizabeth Santandreu", display: 13s–19.2s)
9. command: clip.add Video (Carden Jung intro, display: 19.2s–25.8s, trim from RAG, src from get_space_state)
   cursor → 25,800,000
10. command: clip.add Text (lower third: "Carden Jung", display: 19.2s–25.8s)
11. generate: generate-background-music (25.8s, warm upbeat team welcome acoustic)
```

> ⚠️ **Note 1**: Blessiva Johnson is intentionally skipped. Her clips were about daily routines, not self-introduction. A 25-second cohesive video with 4 strong introductions is better than a 35-second video with 1 weak, off-topic clip.
>
> ⚠️ **Note 2**: **Source URL pattern**: `trim` timing comes from RAG search results (segment startMs/endMs), but `src` URL comes from `get_space_state` (authoritative current URL). RAG may have stale URLs if assets were re-uploaded.

---

## Example Plan (Travel Montage)

**User prompt**: "Create a 30-second travel montage about exploring the mountains using my video assets. Add fast-paced music, transitions, and whoosh sounds."

**Tool calls**:
1. `get_space_state`
2. `search_all_context("mountains climbing hiking peaks visual landscapes nature")`

**Steps**:
```
1. command: project.updateSettings (1920×1080, black bg)
2. command: clip.add Text (Title card: "Mountain Exploration", 0s to 3s)
3. command: clip.add Video (mountain clip 1, 3s to 9s)
4. command: clip.add Video (mountain clip 2, 9s to 15s)
5. command: clip.add Video (mountain clip 3, 15s to 21s)
6. command: clip.add Video (mountain clip 4, 21s to 27s)
7. command: clip.add Video (mountain clip 5, 27s to 33s)
8. skill: transition-editing (crossfades between all adjacent video clips, duration 800ms)
9. generate: generate-background-music (33s, high energy rhythmic travel beat)
10. generate: generate-sound-effect (opening whoosh, 2s, placed at 3s transition)
11. generate: generate-sound-effect (transition whoosh, 2s, placed at 15s transition)
```

---

## ElevenLabs Audio Generation Notes

- `generate-background-music` and `generate-sound-effect` are both dispatched via **ElevenLabs Sound Generation API**.
- The system handles the API call, uploads the audio to storage, and adds the clip to the timeline automatically.
- You only need to set a descriptive `prompt` and `durationSeconds`.
- `audioType` must be either `"background-music"` or `"sound-effect"`.
- Keep prompts descriptive: include the mood, energy level, instruments (for music) or the event being sonified (for SFX).
