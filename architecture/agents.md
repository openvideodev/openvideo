# Agentic Video Editing

The `openvideo/agents` package provides an AI-first layer for scriptable and autonomous video editing.

## 🧠 Role in the Ecosystem

Agents live on top of `core` and act as "power users" that interact with the editor via commands.

### Responsibilities
*   **Intent Translation**: Convert natural language or high-level goals into a series of `core` commands.
*   **Scriptable Flows**: Automate repetitive tasks (e.g., "Add captions to all video clips").
*   **Context Awareness**: Analyze the current project state to make editing decisions.

### Key Design Principle
👉 **Agents NEVER touch engines.**
👉 **Agents ONLY use core commands.**

This ensures that agent actions are perfectly deterministic, undoable, and collaborative.

## Example Agent API

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

## AI-First Positioning
By making every editor action a serializable command, OpenVideo is natively built for LLMs. Agents can explore the command registry and "play" with the timeline just like a human would, but with the speed and precision of an API.
