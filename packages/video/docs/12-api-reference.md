# API Reference

Complete API reference for DesignCombo.

## Studio

The interactive workspace for your video editing.

### Constructor

### Constructor

```ts
import { Studio } from "@designcombo/video";

const studio = new Studio({
  width: 1920,
  height: 1080,
  fps: 30,
  bgColor: "#ffffff",
  canvas: document.getElementById("canvas"),
});
```

**Parameters:**

- `container` (string | HTMLElement) - Container element ID or element
- `options` (object) - Studio configuration

**Options:**

```ts
{
  settings: {
    width: number;        // Canvas width
    height: number;       // Canvas height
    fps: number;          // Frame rate
    backgroundColor: string;  // Background color
    duration?: number;    // Total duration in frames (optional)
  }
}
```

### Properties

```ts
// Collections
studio.clips: Clip[]           // All clips in studio
studio.transitions: Transition[]  // All transitions

// Timeline
studio.duration: number        // Total duration in frames
studio.currentFrame: number    // Current playback frame
studio.currentTime: number     // Current time in milliseconds

// Settings
studio.settings: Settings      // Studio settings

// State
studio.isPlaying: boolean      // Playback state
studio.stats: Stats            // Performance statistics
studio.history: Action[]       // Edit history
```

### Methods

#### Adding & Removing

```ts
studio.add(...items): void
studio.remove(...items): void
studio.clear(): void
```

#### Querying

```ts
// Find by ID or predicate
studio.find(id: string): Clip | Transition | undefined
studio.find(predicate: (item) => boolean): Clip | Transition | undefined
studio.find(query: { type: string }): Clip | Transition | undefined

// Filter by criteria
studio.filter(predicate: (item) => boolean): Clip[]
studio.filter(query: { type: string }): Clip[]

// Get items at frame
studio.at(frame: number): {
  clips: Clip[];
  transitions: Transition[];
}
```

#### Playback

```ts
studio.play(): void
studio.pause(): void
studio.stop(): void
studio.seek(frame: number): void
studio.setPlaybackRate(rate: number): void
```

#### Timeline

```ts
studio.setDuration(frames: number): void
studio.framesToTime(frames: number): number
studio.timeToFrames(ms: number): number
```

#### Rendering

```ts
studio.render(): Promise<void>
studio.renderFrame(frame: number): Promise<void>
studio.renderRange(start: number, end: number, options?): Promise<void>
```

#### Export

```ts
studio.export(options: ExportOptions): Promise<Blob>
studio.exportFrame(frame: number, options?): Promise<Blob>
studio.exportFrameSequence(options: FrameSequenceOptions): Promise<void>
```

**ExportOptions:**

```ts
{
  format: "mp4" | "webm" | "gif";
  quality?: "low" | "medium" | "high" | "ultra";
  videoBitrate?: number;
  audioBitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  filename?: string;
  startFrame?: number;
  endFrame?: number;
  onProgress?: (percent: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}
```

#### State Management

```ts
studio.undo(): void
studio.redo(): void
studio.canUndo(): boolean
studio.canRedo(): boolean
studio.clearHistory(): void
```

#### Validation

```ts
studio.validate(): ValidationError[]
studio.validateClip(clip: Clip): ValidationError[]
```

#### Transitions

```ts
studio.addTransition(from: Clip, to: Clip, options: TransitionOptions): Transition
studio.removeTransitionBetween(from: Clip, to: Clip): void
```

#### Configuration

```ts
studio.updateSettings(settings: Partial<Settings>): void
studio.optimize(options?: OptimizeOptions): void
```

#### Serialization

```ts
studio.toJSON(): StudioData
studio.fromJSON(data: StudioData): Promise<void>
```

#### Utility

```ts
studio.clone(): Promise<Studio>
studio.snapshot(): StudioSnapshot
studio.restore(snapshot: StudioSnapshot): void
studio.destroy(): void
```

#### Events

```ts
studio.on(event: string, handler: Function): void
studio.off(event: string, handler: Function): void
studio.once(event: string, handler: Function): void
```

**Events:**

- `play`, `pause`, `stop`, `seek`
- `frameUpdate`
- `clipAdded`, `clipRemoved`
- `transitionAdded`, `transitionRemoved`
- `renderStart`, `renderProgress`, `renderComplete`, `renderError`
- `stateChange`

## Clip

Base class for all clips (Video, Image, Text).

### Common Properties

```ts
clip.id: string
clip.type: "video" | "image" | "text"
clip.x: number
clip.y: number
clip.width: number
clip.height: number
clip.rotation: number
clip.opacity: number
clip.scale: number
clip.visible: boolean
clip.zIndex: number
clip.display: { from: number; to: number }
```

### Common Methods

```ts
clip.set(properties: Partial<ClipProperties>): void
clip.animate(options: AnimationOptions): Animation
clip.animate(preset: string, options: PresetOptions): Animation
clip.addEffect(...effects: Effect[]): void
clip.removeEffect(effect: Effect): void
clip.clearEffects(): void
clip.clone(overrides?): Clip
clip.destroy(): void

// Positioning helpers
clip.center(): void
clip.centerX(): void
clip.centerY(): void
clip.alignLeft(margin?): void
clip.alignRight(margin?): void
clip.alignTop(margin?): void
clip.alignBottom(margin?): void

// Layer helpers
clip.bringToFront(): void
clip.sendToBack(): void
clip.bringForward(): void
clip.sendBackward(): void

// Visibility
clip.show(): void
clip.hide(): void
```

## VideoClip

Video clip class.

### Loading

```ts
import { VideoClip } from "@designcombo/video";

VideoClip.fromUrl(url: string, options?): Promise<VideoClip>
// VideoClip.fromFile(file: File, options?): Promise<VideoClip>
```

### Properties

```ts
videoClip.duration: number        // Video duration in microseconds usually, check implementation
videoClip.volume: number          // 0.0 to 1.0
// ...
```

## ImageClip

Image clip class.

### Loading

```ts
import { ImageClip } from "@designcombo/video";

ImageClip.fromUrl(url: string, options?): Promise<ImageClip>
```

## TextClip

Text clip class.

### Constructor

```ts
import { TextClip } from "@designcombo/video";

new TextClip(text: string, options: TextClipOptions)
```

## Transition

Transition between two clips.

### Constructor

```ts
new Transition(from: Clip, to: Clip, options: TransitionOptions)
```

### Properties

```ts
transition.from: Clip
transition.to: Clip
transition.type: string
transition.duration: number
transition.easing: string | Function
```

### Methods

```ts
transition.set(properties: Partial<TransitionProperties>): void
```

### Types

Available transition types:

- `fade`, `dissolve`, `wipe`, `slide`, `zoom`, `blur`
- `split`, `pixelate`, `glitch`

## Effect

Base class for effects.

### Built-in Effects

```ts
new Combo.Effect.Brightness({ value: number })
new Combo.Effect.Contrast({ value: number })
new Combo.Effect.Saturation({ value: number })
new Combo.Effect.Blur({ radius: number })
new Combo.Effect.HueRotate({ degrees: number })
new Combo.Effect.Invert({ amount: number })
new Combo.Effect.Grayscale({ amount: number })
new Combo.Effect.Sepia({ amount: number })
new Combo.Effect.Temperature({ value: number })
new Combo.Effect.Tint({ color: string; amount: number })
new Combo.Effect.Exposure({ value: number })
new Combo.Effect.Vignette({ amount: number; radius: number; softness: number })
new Combo.Effect.Glow({ color: string; intensity: number; radius: number })
new Combo.Effect.Shadow({ color: string; blur: number; offsetX: number; offsetY: number })
new Combo.Effect.Pixelate({ size: number })
new Combo.Effect.Noise({ amount: number; monochrome: boolean })
new Combo.Effect.Glitch({ amount: number; frequency: number })
```

### Properties

```ts
effect.enabled: boolean
effect.type: string
```

### Methods

```ts
effect.set(properties: object): void
effect.animate(options: AnimationOptions): Animation
```

## Animation

Animation instance.

### Properties

```ts
animation.property: string
animation.fromValue: number
animation.toValue: number
animation.startFrame: number
animation.duration: number
animation.easing: string | Function
animation.loop: boolean | number
animation.yoyo: boolean
```

### Methods

```ts
animation.play(): void
animation.pause(): void
animation.stop(): void
animation.reset(): void
```

## AudioTrack

Audio track class.

### Loading

```ts
Combo.Audio.fromUrl(url: string, options?): Promise<AudioTrack>
Combo.Audio.fromFile(file: File, options?): Promise<AudioTrack>
Combo.Audio.fromBlob(blob: Blob, options?): Promise<AudioTrack>
```

### Properties

```ts
audioTrack.duration: number
audioTrack.volume: number
audioTrack.muted: boolean
audioTrack.playbackRate: number
audioTrack.loop: boolean
audioTrack.currentTime: number
audioTrack.isPlaying: boolean
audioTrack.fadeIn: number
audioTrack.fadeOut: number
audioTrack.trim: { start: number; end: number }
```

### Methods

```ts
audioTrack.play(): void
audioTrack.pause(): void
audioTrack.stop(): void
audioTrack.seek(time: number): void
audioTrack.setVolume(volume: number): void
audioTrack.mute(): void
audioTrack.unmute(): void
```

## Utility Functions

```ts
// Version and support
Combo.version: string
Combo.isSupported(): boolean

// Time conversion
Combo.framesToTime(frames: number, fps: number): number
Combo.timeToFrames(ms: number, fps: number): number
```

```ts
import { 
  Studio, 
  VideoClip, 
  ImageClip, 
  TextClip, 
  AudioClip
} from "@designcombo/video";

// Use imported types directly
let studio: Studio;
let clip: VideoClip;
```
