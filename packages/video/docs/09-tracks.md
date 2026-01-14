# Tracks

Tracks serve as an organizational layer in DesignCombo. They define the layering (z-index) of clips.

## Understanding Tracks

In DesignCombo, a "Track" is a logical container for clips. Clips in the same track are usually conceptually related (e.g., "B-Roll", "Voiceover", "Text").

- **Layering**: Tracks determine render order. Tracks added later render on top of earlier tracks.
- **Organization**: Helps group clips.

## Creating Tracks

Tracks are managed by the `Studio`. You generally don't instantiate a `Track` class directly. Instead, you assign clips to tracks by ID, or let `Studio` create them automatically.

```ts
// Add a clip to a specific track ID
await studio.addClip(clip, { trackId: "my-custom-track" });
// If "my-custom-track" doesn't exist, it will be created.
```

## Track Management

### Implicit Creation

When you add a clip without a `trackId`, the Studio may create a new track for it or add it to an existing suitable track depending on logic (see `addClip` implementation).

### Explicit Assignment

```ts
const textTrackId = "text-layer";
const bgTrackId = "bg-layer";

const bgClip = await Combo.Video.fromUrl("bg.mp4");
await studio.addClip(bgClip, { trackId: bgTrackId });

const textClip = new Combo.Text("Overlay", {});
await studio.addClip(textClip, { trackId: textTrackId });
```

## Layering Control

To control which clips render on top, manage the order of tracks in the Studio.
(Future API might allow explicit reordering of tracks).
