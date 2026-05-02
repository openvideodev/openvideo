# Developer Experience (DX) Patterns

OpenVideo is designed to be "The Stripe for video editing infrastructure"—powerful, composable, and stupid simple to use.

## Example 1: Minimal Editor
Setting up a real-time interactive editor with PIXI.js.

```ts
import { createCore } from "@openvideo/core";
import { PixiEngine } from "@openvideo/engine-pixi";

const core = createCore();

const engine = new PixiEngine({
  canvas: document.getElementById("canvas"),
  core
});

// Using the high-level DX layer
core.clip.add({
  src: "video.mp4",
  start: 0,
  duration: 5
});

core.play();
```

---

## Example 2: Swap Engine (Zero Change)
The same `core` instance can be passed to a different engine for server-side rendering.

```ts
import { RemotionEngine } from "@openvideo/engine-remotion";

// Same core, different engine
const engine = new RemotionEngine({ core });

await engine.render("output.mp4");
```

---

## Example 3: Headless Backend Rendering
Loading a project JSON and rendering it without any UI.

```ts
const core = createCore();

// Load deterministic state
core.loadProject(json);

const engine = new RemotionEngine({ core });

await engine.render("video.mp4");
```

---

## Example 4: Agent Editing
Leveraging AI to perform complex editing tasks.

```ts
const agent = new VideoAgent({ core });

await agent.run("Make this more engaging with transitions and captions");
```

---

## Example 5: Collaborative Editor
Enabling real-time collaboration with zero effort.

```ts
const core = createCore({
  collaboration: {
    provider: "yjs",
    room: "project-1"
  }
});

// All changes (local or remote) propagate via patches
core.onChange((patch) => {
  console.log("State updated:", patch);
});
```

---

## Example 6: With Timeline UI
Connecting the reference UI package.

```tsx
import { Timeline } from "@openvideo/timeline";

// UI reacts to core state and dispatches commands
<Timeline core={core} />
```

---

## Example 7: AI Chat Assistant Integration (`@openvideo/director`)
Connecting the editor to Director. Director holds the authoritative Core and pushes patches — the client never re-executes commands.

```ts
import { createCore } from "@openvideo/core";

// Client-side core (replica)
const core = createCore();

// 1. Open a WebSocket to Director
const ws = new WebSocket("ws://localhost:4000/ws");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "patch") {
    // Director mutated the server Core — apply the patch locally.
    // The rendering engine reacts automatically.
    core.applyPatch(msg.patch);
  }

  if (msg.type === "chat.chunk") {
    // Stream chat response text to the UI
    chatUI.append(msg.text);
  }

  if (msg.type === "plan.created" && msg.plan.requiresConfirmation) {
    // Show confirmation dialog for destructive/large plans
    const ok = await showConfirmDialog(msg.plan);
    ws.send(JSON.stringify({ type: ok ? "plan.confirm" : "plan.reject", planId: msg.plan.id }));
  }
};

// 2. Send a chat message — Director's Planner + Executor do the rest
ws.send(JSON.stringify({
  type: "chat",
  sessionId: "sess_abc",
  message: "Add a cinematic look to the first clip"
}));
// → Director: Planner creates Plan, Executor runs core.execute() steps,
//             onChange(patch) fires, patch is broadcast to all WS clients,
//             client core.applyPatch() triggers engine-pixi re-render.
```

---

## Example 8: Asset Upload via Director
Uploading a file through Director. It registers the asset in the server Core — the `asset.add` patch arrives automatically over WebSocket.

```ts
const formData = new FormData();
formData.append("file", audioFile);
formData.append("projectId", "proj_123");
formData.append("sessionId", "sess_abc");

await fetch("http://localhost:4000/assets/upload", {
  method: "POST",
  body: formData
});

// No need to call core.execute() — Director handles asset.add on the server Core.
// The WS patch stream delivers the state update to the client automatically.
```
