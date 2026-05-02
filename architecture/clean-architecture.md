# OpenVideo Clean Architecture

OpenVideo follows a strict "Brain-Muscle-UI" separation to ensure composability, headless usage, and AI-first workflows.

## 🧠 `openvideo/core` (THE BRAIN)
**Role**: Headless, deterministic engine containing all business logic and state.

### Responsibilities
*   **Project Schema**: Tracks, clips, assets, and effects definition.
*   **Timeline Model**: Time, duration, trimming, and grouping logic.
*   **State Management**: Immutable state, CRDT-ready for collaboration.
*   **Command API**: Single source of truth for all mutations (undo/redo).
*   **Serialization**: JSON project format.
*   **Plugin System**: Registration for effects and transitions.

### MUST NOT DO
*   ❌ Rendering (Canvas, WebGL, etc.)
*   ❌ UI Logic (DOM, event listeners for mouse/keyboard)
*   ❌ Framework-specific code (React, Vue, etc.)

---

## 🎬 `openvideo/engine-*` (THE MUSCLE)
**Role**: Platform-specific adapters that render Core state to pixels.

### Responsibilities
*   **Rendering**: Convert timeline state to frames.
*   **Asset Resolution**: Loading video, image, and audio files.
*   **Visual Effects**: Applying shaders and filters.
*   **Playback Sync**: Keeping visual time in sync with Core time.
*   **Export**: Encoding the final video (FFmpeg, MediaRecorder).

### Engines
*   `engine-pixi`: Real-time canvas rendering for interactive editors.
*   `engine-remotion`: Server-side rendering pipeline for high-quality export.
*   `engine-skia`: Mobile/native rendering.

### MUST NOT DO
*   ❌ Modify timeline logic (only Core does this).
*   ❌ Own source of truth (Engines are stateless views over Core).

---

## 🧭 `openvideo/timeline` (THE UI)
**Role**: Reference UI package for building editor interfaces.

### Responsibilities
*   **Visual Timeline**: Tracks, clip bars, and handles.
*   **Interaction Layer**: Drag-and-drop, snapping, and scrubbing.
*   **Selection**: Managing active items visually.
*   **Command Dispatch**: Translating user intent to `core.execute()`.

### MUST NOT DO
*   ❌ Contain business logic.
*   ❌ Direct rendering logic (delegates to an engine).

---

## 🧩 Architectural Diagram

```
           +-------------------+
           |   openvideo/core  |
           |-------------------|
           | state + commands  |
           +-------------------+
                    |
     -------------------------------------
     |                 |                 |
+----------+     +------------+     +-----------+
| engine   |     | engine     |     | engine    |
| pixi     |     | remotion   |     | skia      |
+----------+     +------------+     +-----------+
     |
+----------------------+
| openvideo/timeline   |
| (optional UI layer)  |
+----------------------+
```

## Critical Design Decisions
1.  **Single Source of Truth**: ONLY `core` holds the state.
2.  **Deterministic Rendering**: Same core state = same video output across ALL engines.
3.  **Strict Layer Boundaries**: If boundaries are broken, engines will drift and collaboration will fail.
