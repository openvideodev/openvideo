# Serialization Guide

This guide provides an overview of the serialization system implemented in the playground, covering both individual effects and complete studio state.

## Overview

The serialization system supports JSON serialization and deserialization at two levels:

### 1. Effect Serialization

Individual effects can be serialized and deserialized, similar to how Fabric.js handles object persistence.

### 2. Studio Serialization

The entire Studio state (including all effects, settings, and playback state) can be saved and restored.

This allows you to:

- Save complete projects to localStorage or a database
- Send projects over the network
- Create save/load functionality in your application
- Implement auto-save features
- Clone effects or entire projects by serializing and deserializing

## Quick Start

### Studio Serialization

```typescript
import { Studio } from "./lib/studio";
import { TextEffect } from "./lib/effects";

// Create studio and add effects
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const studio = new Studio(canvas);
await studio.init();

studio.add(
  new TextEffect({
    content: "Hello World",
    size: 32,
    x: 100,
    y: 200,
  })
);

// Save entire studio
const json = studio.toJSON();
localStorage.setItem("my-project", JSON.stringify(json));

// Load entire studio
const loaded = JSON.parse(localStorage.getItem("my-project"));
await studio.loadFromJSON(loaded);
```

### Effect Serialization

```typescript
import { TextEffect, effectFromJSON } from "./lib/effects";

// Create an effect
const effect = new TextEffect({
  content: "Hello World",
  size: 32,
  x: 100,
  y: 200,
});

// Serialize to JSON
const json = effect.toJSON();
console.log(json);
/* Output:
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  type: "text",
  name: undefined,
  display: { from: 0, to: 150 },
  visible: true,
  x: 100,
  y: 200,
  content: "Hello World",
  size: 32,
  color: "#ffffff",
  font: "Arial",
  align: "left",
  anchor: { x: 0, y: 0 }
}
*/

// Deserialize from JSON
const loaded = TextEffect.fromJSON(json);

// Or use the factory function
const loaded2 = effectFromJSON(json); // Automatically detects type
```

## Supported Effects

All effect types support serialization:

- ✅ **Effect** (base class)
- ✅ **TextEffect** - Synchronous
- ✅ **RectEffect** - Synchronous
- ✅ **CircleEffect** - Synchronous
- ⏳ **ImageEffect** - Asynchronous (requires `fromJSONAsync`)
- ⏳ **VideoEffect** - Asynchronous (requires `fromJSONAsync`)

## API Reference

### Studio Methods

#### `toJSON(): Record<string, unknown>`

Serializes the entire studio state including all effects, settings, and playback position.

```typescript
const json = studio.toJSON();
```

#### `toObject(): Record<string, unknown>`

Alias for `toJSON()`. Provided for Fabric.js-style API compatibility.

```typescript
const obj = studio.toObject();
```

#### `loadFromJSON(data: Record<string, unknown>): Promise<void>`

Loads studio state from JSON. Clears existing effects and restores saved state. Asynchronous because effects may need to load resources.

```typescript
await studio.loadFromJSON(json);
```

#### `fromJSON(data: Record<string, unknown>): Promise<void>`

Alias for `loadFromJSON()`.

```typescript
await studio.fromJSON(json);
```

#### `loadFromObject(data: Record<string, unknown>): Promise<void>`

Alias for `loadFromJSON()`. Provided for Fabric.js-style API compatibility.

```typescript
await studio.loadFromObject(json);
```

#### `get effects(): Effect[]`

Returns all effects in the studio as an array.

```typescript
const allEffects = studio.effects;
```

### Effect Instance Methods

#### `toJSON(): Record<string, unknown>`

Serializes the effect to a plain JavaScript object.

```typescript
const json = effect.toJSON();
```

#### `toObject(): Record<string, unknown>`

Alias for `toJSON()`. Provided for Fabric.js-style API compatibility.

```typescript
const obj = effect.toObject();
```

### Static Methods

#### `fromJSON(data: Record<string, unknown>): Effect`

Deserializes an effect from a JSON object. Synchronous for most effects.

```typescript
const effect = TextEffect.fromJSON(json);
```

#### `fromObject(data: Record<string, unknown>): Effect`

Alias for `fromJSON()`. Provided for Fabric.js-style API compatibility.

```typescript
const effect = TextEffect.fromObject(json);
```

#### `fromJSONAsync(data: Record<string, unknown>): Promise<Effect>`

Asynchronous deserialization for effects that need to load resources (Image, Video).

```typescript
const imageEffect = await ImageEffect.fromJSONAsync(json);
const videoEffect = await VideoEffect.fromJSONAsync(json);
```

### Factory Functions

Located in `lib/effects/effect-factory.ts` and exported from `lib/effects/index.ts`.

#### `effectFromJSON(data): Effect`

Automatically detects effect type and deserializes. Throws error for Image/Video effects.

```typescript
import { effectFromJSON } from "./lib/effects";

const effect = effectFromJSON(jsonData);
```

#### `effectFromJSONAsync(data): Promise<Effect>`

Async version that handles all effect types including Image and Video.

```typescript
import { effectFromJSONAsync } from "./lib/effects";

const effect = await effectFromJSONAsync(jsonData);
```

#### `effectsFromJSON(data[]): Effect[]`

Deserializes multiple effects (synchronous only).

```typescript
import { effectsFromJSON } from "./lib/effects";

const effects = effectsFromJSON(jsonArray);
```

#### `effectsFromJSONAsync(data[]): Promise<Effect[]>`

Deserializes multiple effects (supports all types).

```typescript
import { effectsFromJSONAsync } from "./lib/effects";

const effects = await effectsFromJSONAsync(jsonArray);
```

#### `effectsToJSON(effects[]): Record<string, unknown>[]`

Serializes multiple effects.

```typescript
import { effectsToJSON } from "./lib/effects";

const jsonArray = effectsToJSON(effects);
```

## Examples

See the [examples directory](./examples/) for detailed examples and demos:

- **[studio-serialization.md](./examples/studio-serialization.md)** - Complete studio save/load guide
- **[effect-serialization.md](./examples/effect-serialization.md)** - Individual effect serialization
- **[serialization-demo.ts](./examples/serialization-demo.ts)** - Runnable demo code
- **[README.md](./examples/README.md)** - Examples overview

## Implementation Details

### Studio Properties Serialized

When serializing the Studio, these properties are included:

- `version` - Format version (currently "1.0.0")
- `frame` - Current frame position
- `fps` - Frames per second setting
- `duration` - Fixed duration (if set), otherwise undefined
- `settings` - Studio settings object:
  - `width` - Artboard width
  - `height` - Artboard height
  - `backgroundColor` - Canvas background color
  - `antialias` - Antialiasing setting
  - `artboard` - Artboard configuration
- `effects` - Array of all effects (each serialized with their own properties)

### Effect Properties Serialized

Each effect serializes these base properties:

- `id` - Unique identifier (UUID)
- `type` - Effect type string
- `name` - Optional effect name
- `display` - Display range `{ from, to }`
- `visible` - Visibility flag
- `x`, `y` - Position from container

Subclasses add their own properties:

**TextEffect** adds:

- `content`, `size`, `color`, `font`, `align`, `anchor`

**RectEffect** adds:

- `width`, `height`, `fillColor`, `fillAlpha`, `strokeColor`, `strokeWidth`, `strokeAlpha`, `borderRadius`

**CircleEffect** adds:

- `radius`, `fillColor`, `fillAlpha`, `strokeColor`, `strokeWidth`, `strokeAlpha`

**ImageEffect** adds:

- `width`, `height`, `anchor`, `src` (image URL)

**VideoEffect** adds:

- `width`, `height`, `src` (video URL)

### Creating Custom Serializable Effects

When creating custom effects, override both `toJSON()` and `fromJSON()`:

```typescript
export class CustomEffect extends Effect {
  public type = "custom";
  private _customProperty = "default";

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      customProperty: this._customProperty,
    };
  }

  static override fromJSON(data: Record<string, unknown>): CustomEffect {
    const effect = new CustomEffect({
      name: data.name as string | undefined,
      display: data.display as { from: number; to: number } | undefined,
      visible: data.visible as boolean | undefined,
      x: data.x as number | undefined,
      y: data.y as number | undefined,
    });

    if (data.customProperty !== undefined) {
      effect._customProperty = data.customProperty as string;
    }

    return effect;
  }
}
```

## Best Practices

1. **Always include the type property** - The factory functions rely on it
2. **Use the spread operator** - `...super.toJSON()` ensures parent properties are included
3. **Handle media resources** - Image/Video effects need accessible URLs
4. **Use async methods** - When working with Image/Video effects
5. **Preserve IDs** - The ID is auto-generated but preserved during serialization
6. **Validate on deserialize** - Add runtime checks for critical properties
7. **Test serialization** - Ensure round-trip (serialize → deserialize) preserves state

## Migration from Manual Serialization

If you were manually serializing effects before, you can now use the built-in methods:

### Before

```typescript
const data = {
  type: effect.type,
  content: effect.content,
  x: effect.container.x,
  // ... manual property extraction
};
```

### After

```typescript
const data = effect.toJSON(); // Automatic
```

## Troubleshooting

### "ImageEffect requires async deserialization"

Use `effectFromJSONAsync()` or `ImageEffect.fromJSONAsync()` instead of the synchronous methods.

### "VideoEffect requires a 'src' property"

Ensure the video URL is stored when creating the effect using `VideoEffect.fromUrl()`.

### Type detection not working

Make sure the `type` property is present in your JSON data.

### Properties not preserved

Override `toJSON()` and `fromJSON()` in your custom effect class.

## Performance Considerations

- Serialization is synchronous and fast
- Deserialization may be async for media effects (Image, Video)
- Large JSON payloads can be compressed before storage/transmission
- Consider lazy loading for effects with large media resources

## Related Files

- `apps/playground/src/lib/studio.ts` - Studio class with serialization
- `apps/playground/src/lib/effects/effect/effect.ts` - Base Effect class
- `apps/playground/src/lib/effects/effect-factory.ts` - Factory functions
- All effect subclasses in `apps/playground/src/lib/effects/*/`

## Common Use Cases

### Project Save/Load System

```typescript
// Save button
saveButton.onclick = () => {
  const json = studio.toJSON();
  const blob = new Blob([JSON.stringify(json, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-project.json";
  a.click();
};

// Load button
loadButton.onclick = () => {
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      const json = JSON.parse(text);
      await studio.loadFromJSON(json);
    }
  };
  input.click();
};
```

### Auto-Save

```typescript
setInterval(() => {
  const json = studio.toJSON();
  localStorage.setItem("autosave", JSON.stringify(json));
}, 30000); // Every 30 seconds
```

### Undo/Redo

```typescript
const history: Record<string, unknown>[] = [];
let historyIndex = -1;

// Save state
const saveState = () => {
  history.splice(historyIndex + 1);
  history.push(studio.toJSON());
  historyIndex++;
};

// Undo
const undo = async () => {
  if (historyIndex > 0) {
    historyIndex--;
    await studio.loadFromJSON(history[historyIndex]);
  }
};

// Redo
const redo = async () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    await studio.loadFromJSON(history[historyIndex]);
  }
};
```
