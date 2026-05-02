# `@openvideo/director`

## Overview

`@openvideo/director` is a **standalone TypeScript microservice** that acts as the intelligent, autonomous video editing brain. It connects a conversational chat interface to the OpenVideo project state by running a **server-side instance of `@openvideo/core`**, mutating it directly, and syncing the resulting state changes back to every connected editor client in real time.

Director is built on **LangChain.js**, **Google Generative AI (Gemini)**, and a rich internal pipeline of **Planner → Executor → Queue Workers**, backed by a **RAG index** of the project and a **Skills registry** of curated editing workflows.

---

## 🧠 Architectural Role

```
┌──────────────────────────────────────────────────────────────┐
│                     Editor Client (Browser)                   │
│  ┌─────────────────┐        ┌──────────────────────────────┐ │
│  │  Chat Assistant  │        │   @openvideo/core (client)   │ │
│  │  Panel (React)  │        │   engine-pixi / engine-*     │ │
│  └────────┬────────┘        └──────────────┬───────────────┘ │
│           │ WebSocket (chat)               │ State Sync       │
└───────────┼────────────────────────────────┼─────────────────┘
            │                                │ (patch stream)
            ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   @openvideo/director                        │
│                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐  │
│   │ Planner  │──▶│ Executor │──▶│  Queue   │   │  RAG   │  │
│   │ (Gemini) │   │          │   │ Workers  │   │ Index  │  │
│   └──────────┘   └──────────┘   └──────────┘   └────────┘  │
│                        │                                     │
│                        ▼                                     │
│             @openvideo/core (server-side)                    │
│             core.execute(command) ──────── state mutations   │
│             core.onChange(patch)  ──────── patch stream ───▶ │
└─────────────────────────────────────────────────────────────┘
```

### Key insight: `@openvideo/core` runs on both sides

`@openvideo/core` is a **headless, environment-agnostic** library that runs in both the browser and Node.js.

- **Server side** (`@openvideo/director`): Director holds the **authoritative** server-side Core instance. It calls `core.execute()` directly to apply mutations.
- **Client side** (editor browser): The client Core instance subscribes to a **patch stream** from Director and applies patches to stay in sync. The rendering engines (Pixi, etc.) react to the client Core state as usual.

This means Director **never needs to return `CommandBatch` over HTTP** for the client to re-execute. Instead, it mutates state once, and the patch stream handles all clients.

---

## 📦 Package Identity

| Property  | Value                              |
|-----------|------------------------------------|
| Name      | `@openvideo/director`              |
| Type      | Standalone Node.js HTTP + WS Service |
| Language  | TypeScript                         |
| Runtime   | Node.js ≥ 20                       |
| Transport | REST (chat/assets), WebSocket (patch stream + chat streaming) |
| Location  | `services/director/`               |

> Lives under a new top-level `services/` directory — a deployable process, not a library.

---

## 🏗️ Internal Architecture

### Directory Structure

```
services/director/src/
├── server.ts                   # Fastify HTTP + WebSocket entry point
│
├── routes/
│   ├── chat.ts                 # POST /chat, WS /chat/stream
│   ├── assets.ts               # POST /assets/upload, GET /assets
│   ├── project.ts              # POST /project/sync (RAG re-index trigger)
│   └── health.ts               # GET /health
│
├── planner/
│   ├── planner.ts              # Gemini-powered plan generator
│   ├── plan-validator.ts       # Validates plan steps against command registry
│   └── system-prompt.ts        # System prompt with core command registry context
│
├── executor/
│   ├── executor.ts             # Executes a validated Plan via core.execute()
│   ├── command-builder.ts      # Maps agent tool calls → typed core Commands
│   └── confirmation-gate.ts   # Holds destructive plans for user approval
│
├── queue/
│   ├── job-queue.ts            # BullMQ-backed job queue for async/heavy tasks
│   ├── workers/
│   │   ├── generate-audio.worker.ts   # Worker: GenAI audio generation
│   │   ├── generate-image.worker.ts   # Worker: Imagen 3 asset generation
│   │   ├── index-project.worker.ts    # Worker: RAG re-indexing
│   │   └── apply-skill.worker.ts      # Worker: long-running skill execution
│   └── job-types.ts            # Typed job payload definitions
│
├── rag/
│   ├── project-indexer.ts      # Project JSON → chunked documents
│   ├── embedder.ts             # Google text-embedding-004 adapter
│   ├── vector-store.ts         # MemoryVectorStore (dev) / PGVector (prod)
│   └── retriever.ts            # Similarity search + metadata filtering
│
├── skills/
│   ├── skill-registry.ts       # Central registry; discovers + loads skills
│   ├── base-skill.ts           # Abstract EditingSkill interface
│   └── library/
│       ├── cinematic.skill.ts           # "Make it cinematic"
│       ├── social-clip.skill.ts         # "Create a 30-second social cut"
│       ├── auto-caption.skill.ts        # "Add captions to all speech"
│       ├── highlight-reel.skill.ts      # "Create a highlight reel"
│       └── podcast-edit.skill.ts        # "Remove filler words"
│
├── session/
│   ├── session-manager.ts      # Creates/resolves ChatSession objects
│   └── session-store.ts        # In-memory (dev) / Redis (prod) session store
│
├── core/
│   └── server-core.ts          # Bootstraps the server-side @openvideo/core
│                               # instance and manages the patch broadcast
│
└── types/
    ├── chat.ts                  # ChatMessage, ChatSession, StreamChunk
    ├── plan.ts                  # Plan, PlanStep, PlanStatus
    └── job.ts                   # JobType, JobPayload, JobResult
```

---

## 🗺️ Internal Pipeline: Planner → Executor → Workers

### 1. Planner

The Planner is a **Gemini-powered ReAct agent** (via LangChain.js). It receives:
- The user's chat message
- RAG-retrieved project context (clips, tracks, assets, effects)
- Conversation history
- The full core command registry (injected into the system prompt)

It outputs a structured **Plan** — an ordered list of `PlanStep` objects — rather than executing anything itself.

```ts
interface Plan {
  id: string;
  sessionId: string;
  goal: string;
  steps: PlanStep[];
  requiresConfirmation: boolean;  // true for destructive/large-scope plans
  estimatedDuration?: number;     // ms, for progress reporting
}

interface PlanStep {
  id: string;
  type: "command" | "skill" | "generate";
  description: string;            // human-readable, shown in chat
  command?: Command;              // for type = "command"
  skillName?: string;             // for type = "skill"
  jobPayload?: JobPayload;        // for type = "generate" (queued async)
}
```

### 2. Executor

The Executor receives a validated `Plan` and runs it step by step:

- **`command` steps** → `core.execute(step.command)` immediately on the server-side Core.
- **`skill` steps** → resolves the skill from the registry, generates its commands, executes each.
- **`generate` steps** → enqueues a job on the BullMQ queue; execution is async.

The Executor streams progress back to the client chat session as each step completes.

```ts
// Executor loop (simplified)
for (const step of plan.steps) {
  if (step.type === "command") {
    serverCore.execute(step.command!);            // mutates state directly
  } else if (step.type === "skill") {
    const skill = skillRegistry.resolve(step.skillName!);
    const commands = skill.resolve(projectContext);
    for (const cmd of commands) serverCore.execute(cmd);
  } else if (step.type === "generate") {
    await queue.add(step.jobPayload!.type, step.jobPayload);
  }
  stream.emit({ stepId: step.id, status: "done", description: step.description });
}
```

### 3. State Sync (Core Patch Stream)

Every `serverCore.execute()` call triggers a `core.onChange(patch)` event. Director broadcasts these patches to all connected editor clients via WebSocket:

```
Director                          Editor Client
   │  core.execute(cmd)              │
   │  → state mutated                │
   │  → onChange(patch) fired        │
   │──── WS: { type: "patch",  ─────▶│
   │          patch: [...] }          │
   │                                 │  clientCore.applyPatch(patch)
   │                                 │  → engine-pixi re-renders
```

The client-side Core receives the patch and applies it to its local state. The rendering engine reacts as if the user had made the edit locally — **no double-execution, no round-trip command re-apply**.

### 4. Queue Workers

Long-running or resource-heavy tasks run in BullMQ workers, isolated from the HTTP request lifecycle:

| Worker                    | Triggered by            | On Completion                          |
|---------------------------|-------------------------|----------------------------------------|
| `generate-audio.worker`   | Gemini TTS / MusicFX    | `asset.add` + `clip.add` via executor  |
| `generate-image.worker`   | Imagen 3                | `asset.add` via executor               |
| `index-project.worker`    | POST /project/sync      | Updates vector store                   |
| `apply-skill.worker`      | Complex / long skills   | Streams command batches as they complete |

Workers communicate completion back via BullMQ events, which trigger the Executor to apply the resulting commands to the server Core.

---

## 🔍 RAG: Project Understanding

Director maintains a **per-project vector index** to give the Planner rich, relevant context without consuming the full context window.

### What Gets Indexed

| Entity      | Indexed Fields                                                     |
|-------------|---------------------------------------------------------------------|
| Tracks      | `id`, `name`, `type`, `clipCount`, `zIndex`, `muted`, `locked`     |
| Clips       | `id`, `type`, `src`, `start`, `duration`, `trackId`, `effects[]`   |
| Assets      | `id`, `name`, `type`, `src`, `duration`, `dimensions`              |
| Effects     | `id`, `type`, `params`, `clipId`                                    |
| Captions    | `id`, `text`, `start`, `duration`                                   |
| Transitions | `id`, `type`, `fromClipId`, `toClipId`                              |

### Indexing Flow

```
POST /project/sync
       │
       ▼
index-project.worker (async)
       │
  project-indexer.ts
  → chunks project into documents
       │
  embedder.ts (text-embedding-004)
       │
  vector-store.upsert(docs)
```

The editor pushes `/project/sync` whenever the project changes significantly (debounced, ~2s). Because Director holds the authoritative server Core, it can also self-index after every `core.execute()` without needing the client to push.

### Query at Plan Time

```ts
// Inside Planner, before Gemini reasoning
const context = await retriever.search(userMessage, { topK: 10 });
// → most relevant clips, tracks, assets for the current request
```

---

## 🧩 Skills System

Skills are **reusable, named editing workflows** that encode expert editing decisions as a sequence of `core` commands. They are the primary mechanism for complex, multi-step tasks.

### Skill Interface

```ts
interface EditingSkill {
  name: string;               // e.g. "cinematic"
  description: string;        // used by Planner to decide when to apply it
  tags: string[];             // e.g. ["visual", "color", "style"]
  isAsync: boolean;           // if true, runs via apply-skill.worker
  resolve(context: ProjectContext, params?: SkillParams): Command[];
}
```

### Built-in Skills

| Skill              | Description                                                      | Commands Generated                          |
|--------------------|------------------------------------------------------------------|----------------------------------------------|
| `cinematic`        | Teal-orange color grade + slow zoom + crossfades                 | `effect.add` × N, `transition.add` × N       |
| `social-clip`      | Auto-cut to 30 seconds, add captions, center-crop for vertical  | `clip.trim`, `clip.add`, `effect.add`        |
| `auto-caption`     | Transcribe speech → add caption clips at correct timestamps     | `clip.add` × N (caption type)                |
| `highlight-reel`   | Select best moments by energy/motion, re-cut to target duration | `clip.trim`, `clip.remove`, `clip.move`      |
| `podcast-edit`     | Detect and remove silence/filler words                          | `clip.split`, `clip.remove` × N             |

### Skill Discovery by Planner

Skills are registered with descriptions that Gemini uses to decide when to invoke them:

```ts
// In system prompt (injected at plan time)
Available skills:
- cinematic: Apply a cinematic film look (color grading, zoom, crossfades). Use when user says "make it cinematic", "film look", "movie style".
- social-clip: Create a short social media version. Use when user says "make a TikTok", "30 second cut", "vertical video".
- auto-caption: Transcribe and add captions. Use when user says "add captions", "add subtitles".
```

### Third-Party Skills

Skills can be loaded from external packages at startup:

```ts
// director.config.ts
export default {
  skills: [
    "@openvideo/skill-cinematic",   // built-in
    "./custom-skills/my-brand.skill" // project-specific
  ]
};
```

---

## 🎵 Asset & Effect Generation

| Generation Type  | Model / API              | Output       | Delivery                              |
|------------------|--------------------------|--------------|---------------------------------------|
| Background music | Gemini + MusicFX         | `.mp3`       | `asset.add` + `clip.add` on audio track |
| SFX              | Gemini audio generation  | `.wav`       | `asset.add` + `clip.add`             |
| Voiceover        | Gemini TTS               | `.mp3`       | `asset.add` + `clip.add`             |
| Image asset      | Imagen 3                 | `.png`       | `asset.add`                          |

Generated files are stored in GCS (prod) or local disk (dev) and registered as assets in the server Core. The patch stream delivers the `asset.add` + `clip.add` commands to the client automatically.

---

## 💬 Chat Session Model

```ts
interface ChatSession {
  sessionId: string;
  projectId: string;
  userId: string;
  history: BaseMessage[];                 // LangChain ConversationSummaryMemory
  pendingPlan: Plan | null;               // Plan awaiting user confirmation
  activePlanId: string | null;            // Currently executing plan
}
```

Sessions are scoped per user+project. The RAG vector store is scoped per `projectId`.

---

## 🌐 API Reference

### WebSocket `/ws`

Bidirectional connection for:
- **Outbound (server → client)**: patch stream, plan progress, chat stream chunks
- **Inbound (client → server)**: chat messages, plan confirmations/rejections

```ts
// Server → Client message types
type WsMessage =
  | { type: "patch"; patch: Patch[] }                   // core state changes
  | { type: "chat.chunk"; sessionId: string; text: string }  // streaming response
  | { type: "plan.created"; plan: Plan }                // plan ready for confirmation
  | { type: "plan.step"; stepId: string; status: "running" | "done" | "error" }
  | { type: "plan.complete"; planId: string }

// Client → Server message types
type WsClientMessage =
  | { type: "chat"; sessionId: string; message: string }
  | { type: "plan.confirm"; planId: string }
  | { type: "plan.reject"; planId: string }
```

---

### `POST /project/sync`

Trigger a RAG re-index from the current server Core state (or supply a snapshot).

```json
{ "projectId": "proj_123", "sessionId": "sess_abc" }
```

---

### `POST /assets/upload`

Upload a media file. Director registers it as an asset in the server Core (triggering a patch to all clients).

**Response**
```json
{ "assetId": "asset_xyz", "src": "https://storage/.../file.mp4" }
```

---

### `GET /assets?projectId=proj_123`

List assets in the server Core for a given project.

---

### `GET /health`

Returns `{ "status": "ok", "queueDepth": 3 }`.

---

## 🔒 Design Constraints

1. **Core is the Source of Truth**: Director holds one server-side `@openvideo/core` instance per project. All mutations flow through `core.execute()`. The client Core is a synchronized read-replica.
2. **No Direct Engine Access**: Director has zero knowledge of `engine-pixi`, `engine-remotion`, or any rendering engine. Rendering is purely a client concern.
3. **Session Isolation**: Each `sessionId` has its own conversation history and pending plan. RAG is scoped per `projectId`.
4. **Confirmation Gate**: Plans marked `requiresConfirmation: true` (destructive or large-scope) are held in `pendingPlan` until the user approves them via `plan.confirm` WS message.
5. **Stateless Commands**: All commands stored in a Plan are serializable — plans can be persisted, replayed, and used as an audit log.
6. **Worker Isolation**: Async generation tasks run in separate BullMQ workers and never block the chat WebSocket.

---

## 🔧 Technology Stack

| Layer               | Technology                                        |
|---------------------|---------------------------------------------------|
| Runtime             | Node.js 20+, TypeScript                           |
| HTTP / WS Framework | Fastify + `@fastify/websocket`                    |
| AI Orchestration    | LangChain.js (`langchain`, `@langchain/core`)     |
| LLM                 | Google Gemini Pro / Flash (`@langchain/google-genai`) |
| Embeddings          | Google `text-embedding-004`                       |
| Vector Store        | `MemoryVectorStore` (dev) / PGVector (prod)       |
| Job Queue           | BullMQ + Redis                                    |
| Session Store       | In-memory (dev) / Redis (prod)                    |
| Core Integration    | `@openvideo/core` (Node.js headless instance)     |
| Asset Storage       | Local disk (dev) / Google Cloud Storage (prod)    |
| Skills              | `@openvideo/director` skill registry + plugins    |
