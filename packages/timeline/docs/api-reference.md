# API Reference

## `Timeline` Class

The main entry point for the package.

### Constructor

```typescript
new Timeline(options: TimelineOptions)
```

#### `TimelineOptions`
- `canvas: Canvas`: The Fabric.js canvas instance.
- `itemTypes: string[]`: Array of supported clip types.
- `acceptsMap: Record<string, string[]>`: Track acceptance rules.
- `sizesMap: Record<string, number>`: Track height configuration.
- `tScale: number` (default: 0.0001): Temporal scale factor.

### Methods

#### `syncTracksAndClips(data: SyncData)`
Performs a full synchronization of tracks and clips. Use this for initial loading or major state changes.

#### `syncClipProperties(data: PartialSyncData)`
Updates specific clip properties (timing, source, custom data) without re-creating all objects. Highly performant for real-time updates.

#### `setScale(scale: ITimelineScaleState)`
Updates the zoom level and scroll position of the timeline.

#### `getItemAccepts(type: string): string[]`
Returns the list of accepted types for a given track type.

#### `getItemSize(type: string): number`
Returns the height for a given track type.

### Events

The `Timeline` class is an `EventEmitter`. You can listen to events using `.on(eventName, callback)`.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `STATE_CHANGED` | `{ payload: ProjectState, options: UpdateOptions }` | Emitted whenever the timeline state is modified by user interaction. |
| `TIMELINE_SEEK` | `{ payload: { time: number } }` | Emitted when the user clicks on the timeline to seek. |
| `add:[type]` | `{ payload: ClipData, options: AddOptions }` | Emitted when a new item is dropped onto the timeline. |
| `track:create` | `{ payload: TrackData }` | Emitted when a new track is automatically created during a drop. |

---

## Utility Functions

### `timeUsToUnits(timeUs: number, tScale: number): number`
Converts microseconds to pixel units.

### `unitsToTimeUs(units: number, tScale: number): number`
Converts pixel units to microseconds.
