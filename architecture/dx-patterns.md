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
