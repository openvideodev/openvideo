# OpenVideo Clean Architecture

OpenVideo follows a strict "Brain-Muscle-UI" separation to ensure composability, headless usage, and AI-first workflows.

## 🧠 `openvideo/core` (THE BRAIN)
**Role**: Headless, deterministic, **environment-agnostic** engine containing all business logic and state. Runs identically in both the **browser** and **Node.js**.

### Responsibilities
*   **Project Schema**: Tracks, clips, assets, and effects definition.
*   **Timeline Model**: Time, duration, trimming, and grouping logic.
*   **State Management**: Immutable state, CRDT-ready for collaboration.
*   **Command API**: Single source of truth for all mutations (undo/redo).
*   **Serialization**: JSON project format.
*   **Plugin System**: Registration for effects and transitions.
*   **Patch Stream**: Emits granular patches on every `execute()` call, enabling state sync across server ↔ client boundaries.

### Deployment Contexts
| Context | Who uses it | Role |
|---------|-------------|------|
| Browser | Editor UI + engine-* | Client-side rendering & user interactions |
| Node.js | `@openvideo/director` | Server-side authoritative state; mutations from AI |

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

## 🤖 `@openvideo/director` (THE AI DIRECTOR)
**Role**: Standalone TypeScript microservice — the authoritative AI brain. Holds a **server-side `@openvideo/core` instance**, mutates it directly via `core.execute()`, and broadcasts state patches to all connected editor clients in real time.

### Responsibilities
*   **Chat Interface**: WebSocket-based conversational interface for the editor's Chat Assistant panel.
*   **Planner**: Gemini-powered ReAct agent that converts user intent into a structured `Plan` (ordered steps).
*   **Executor**: Walks the Plan, calling `core.execute()` for each step and streaming progress to the client.
*   **Queue Workers**: BullMQ workers for async/heavy tasks — audio generation, image generation, long-running skills.
*   **RAG Index**: Per-project vector store (Google `text-embedding-004`) for context-aware project understanding.
*   **Skills System**: Curated, named editing workflows (e.g., "cinematic", "auto-caption") invoked by the Planner.
*   **Asset & Effect Generation**: Generates audio, SFX, voiceovers, and images via Google GenAI APIs, then inserts them via `core.execute()`.
*   **Patch Broadcast**: Forwards `core.onChange(patch)` events to all editor WebSocket clients so the client Core stays in sync.

### MUST NOT DO
*   ❌ Import or depend on any engine package (`engine-pixi`, `engine-remotion`, etc.).
*   ❌ Expose raw project JSON to the client — only patches and chat messages flow outward.
*   ❌ Allow the client to call `core.execute()` on the server Core directly — all mutations are Director-mediated.

> See [`director.md`](./director.md) for the full service specification.

---

## 🧩 Architectural Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        Editor Client (Browser)                      │
│  ┌─────────────────────┐       ┌──────────────────────────────────┐│
│  │  Chat Assistant     │       │ @openvideo/core (client replica) ││
│  │  Panel (React)      │       │ engine-pixi / engine-remotion    ││
│  └──────────┬──────────┘       └──────────────┬───────────────────┘│
│             │ WS (chat msgs)                   │ applyPatch()       │
└─────────────┼──────────────────────────────────┼────────────────────┘
              │                                  │
              │ WebSocket                        │ patch stream
              ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     @openvideo/director                              │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Planner  │─▶│ Executor │─▶│ Queue Workers│  │   RAG Index    │  │
│  │ (Gemini) │  │          │  │ (BullMQ)     │  │ (embeddings)   │  │
│  └──────────┘  └────┬─────┘  └──────────────┘  └────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│          @openvideo/core (Node.js, authoritative)                   │
│          core.execute(cmd) ──▶ onChange(patch) ──▶ WS broadcast     │
└─────────────────────────────────────────────────────────────────────┘
              │
     (headless, no rendering)
```

## Critical Design Decisions
1.  **Dual-Runtime Core**: `@openvideo/core` runs in both Node.js (Director) and the browser (Editor). The server instance is authoritative; the client instance is a synchronized replica.
2.  **Patch-Based Sync**: Director never sends commands to the client — it sends state **patches**. The client Core applies patches and the engine re-renders automatically.
3.  **Deterministic Rendering**: Same core state = same video output across ALL engines.
4.  **Strict Layer Boundaries**: If boundaries are broken, engines will drift and collaboration will fail.
5.  **AI is a Peer of Core**: Director calls `core.execute()` with the same authority as a human user — it never bypasses the command system or patches state directly.
