# Agentic Video Editing

OpenVideo has a **two-tier agent architecture** to separate lightweight in-process scripting from full conversational AI capabilities.

---

## Tier 1 — `@openvideo/agents` (Library Package)

A thin, in-process TypeScript library that lives in `packages/agents`. It provides a **programmable, scriptable agent** that runs inside the editor process and dispatches `core` commands directly.

### Role
Agents live on top of `core` and act as "power users" that interact with the editor via commands.

### Responsibilities
*   **Intent Translation**: Convert natural language or high-level goals into a series of `core` commands.
*   **Scriptable Flows**: Automate repetitive tasks (e.g., "Add captions to all video clips").
*   **Context Awareness**: Analyze the current project state to make editing decisions.

### Key Design Principle
👉 **Agents NEVER touch engines.**
👉 **Agents ONLY use core commands.**

This ensures that agent actions are perfectly deterministic, undoable, and collaborative.

### Example API

```ts
const agent = new VideoAgent({ core });

// High-level execution
await agent.run(`
  Create a 10 second TikTok ad.
  Add product image.
  Add zoom effect.
  Add captions: "This changed my life"
`);
```

### Internal Command Dispatch
Behind the scenes, the agent executes atomic commands:

```ts
// 1. Add track
core.execute({ type: "track.add", payload: { type: "video" } });

// 2. Add clip
core.execute({
  type: "clip.add",
  payload: {
    src: "product.png",
    start: 0,
    duration: 10
  }
});

// 3. Add effect
core.execute({
  type: "effect.add",
  payload: { clipId: "c1", type: "zoomIn", params: { intensity: 0.3 } }
});
```

---

## Tier 2 — `@openvideo/director` (Standalone Microservice)

A full-featured, **standalone TypeScript microservice** that powers the **Chat Assistant** panel in the editor UI. It is built on LangChain.js and Google Generative AI (Gemini). Director holds a **server-side `@openvideo/core` instance** and mutates it directly — changes propagate to the browser editor as a **patch stream** over WebSocket.

### Key Differences from Tier 1

| Aspect                | `@openvideo/agents` (Tier 1)     | `@openvideo/director` (Tier 2)            |
|-----------------------|----------------------------------|-------------------------------------------|
| Deployment            | In-process library               | Separate HTTP/WS server                   |
| Core instance         | Borrows the client Core          | Owns an **authoritative server-side Core** |
| State mutation        | Direct `core.execute()`          | `core.execute()` → patch broadcast to clients |
| LLM Integration       | Optional / pluggable             | LangChain + Gemini (built-in)             |
| Pipeline              | Simple run loop                  | Planner → Executor → Queue Workers        |
| RAG                   | ❌                               | ✅ per-project vector index               |
| Chat interface        | ❌                               | ✅ WebSocket streaming                    |
| Asset generation      | ❌                               | ✅ audio, SFX, images via GenAI           |
| Skills system         | ❌                               | ✅ curated editing skill library + plugins |
| Async job queue       | ❌                               | ✅ BullMQ workers                         |

> See [`director.md`](./director.md) for the full service specification.

---

## AI-First Positioning
By making every editor action a serializable command, OpenVideo is natively built for LLMs. Both tiers of agents can explore the command registry and "play" with the timeline just like a human would, but with the speed and precision of an API.
