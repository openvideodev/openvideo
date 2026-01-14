# Audio

DesignCombo provides comprehensive audio support for video clips, audio tracks, and audio effects.

## Audio from Video Clips

Video clips with audio automatically include their audio track:

```ts
const videoClip = await Combo.Video.fromUrl("video-with-audio.mp4");

// Control video audio
videoClip.set({
  volume: 0.8, // 0.0 to 1.0
  muted: false,
});
```

## Audio Tracks

Add standalone audio tracks to your composition:

```ts
// Load audio track
const audioTrack = await Combo.Audio.fromUrl("music.mp3", {
  volume: 0.5,
  loop: false,
});

// Set timeline position
audioTrack.set({
  display: {
    from: 0,
    to: 600,
  },
});

// Add to studio
studio.add(audioTrack);
```

### Audio Track Properties

```ts
audioTrack.set({
  // Volume
  volume: 0.7, // 0.0 to 1.0

  // Mute
  muted: false,

  // Playback
  playbackRate: 1.0, // Speed (0.5 = half speed, 2.0 = double speed)
  loop: false, // Loop audio

  // Timeline
  display: {
    from: 0,
    to: 600,
  },

  // Trim audio
  trim: {
    start: 0, // Trim from start (ms)
    end: 10000, // Trim from end (ms)
  },

  // Fade in/out
  fadeIn: 30, // Fade in duration (frames)
  fadeOut: 30, // Fade out duration (frames)
});
```

## Loading Audio

### From URL

```ts
const audio = await Combo.Audio.fromUrl("audio.mp3");
```

### From File

```ts
const audio = await Combo.Audio.fromFile(file);
```

### From Blob

```ts
const audio = await Combo.Audio.fromBlob(blob);
```

## Audio Methods

### Playback Control

```ts
// Play
audioTrack.play();

// Pause
audioTrack.pause();

// Stop
audioTrack.stop();

// Seek to position (ms)
audioTrack.seek(5000);
```

### Volume Control

```ts
// Set volume
audioTrack.setVolume(0.5);

// Mute/unmute
audioTrack.mute();
audioTrack.unmute();

// Get current volume
console.log(audioTrack.volume);
```

### Audio Info

```ts
// Get duration
console.log(audioTrack.duration); // in milliseconds

// Get current time
console.log(audioTrack.currentTime);

// Check if playing
console.log(audioTrack.isPlaying);
```

## Audio Effects

### Volume

Animate volume changes:

```ts
audioTrack.animate({
  property: "volume",
  fromValue: 0.0,
  toValue: 1.0,
  startFrame: 0,
  duration: 60,
});
```

### Fade In

```ts
// Set fade in duration
audioTrack.set({ fadeIn: 30 });

// Or animate manually
audioTrack.animate({
  property: "volume",
  fromValue: 0,
  toValue: 1,
  startFrame: 0,
  duration: 30,
});
```

### Fade Out

```ts
// Set fade out duration
audioTrack.set({ fadeOut: 30 });

// Or animate manually
const endFrame = audioTrack.display.to;
audioTrack.animate({
  property: "volume",
  fromValue: 1,
  toValue: 0,
  startFrame: endFrame - 30,
  duration: 30,
});
```

### Ducking

Lower audio volume when another track plays:

```ts
// Duck background music when voiceover plays
const music = await Combo.Audio.fromUrl("music.mp3");
const voiceover = await Combo.Audio.fromUrl("voiceover.mp3");

music.set({ volume: 0.6 });
voiceover.set({
  display: { from: 100, to: 200 },
});

// Duck music during voiceover
music.animate({
  property: "volume",
  fromValue: 0.6,
  toValue: 0.2,
  startFrame: 100,
  duration: 15,
});

// Restore music volume after voiceover
music.animate({
  property: "volume",
  fromValue: 0.2,
  toValue: 0.6,
  startFrame: 185,
  duration: 15,
});
```

## Multiple Audio Tracks

Layer multiple audio tracks:

```ts
const backgroundMusic = await Combo.Audio.fromUrl("music.mp3", {
  volume: 0.3,
  loop: true,
});

const soundEffect = await Combo.Audio.fromUrl("sfx.mp3", {
  volume: 0.8,
});

const voiceover = await Combo.Audio.fromUrl("voice.mp3", {
  volume: 1.0,
});

// Position on timeline
backgroundMusic.set({ display: { from: 0, to: 900 } });
soundEffect.set({ display: { from: 150, to: 180 } });
voiceover.set({ display: { from: 100, to: 400 } });

// Add to studio
studio.add(backgroundMusic, soundEffect, voiceover);
```

## Audio Mixing

### Master Volume

Control master volume for all audio:

```ts
studio.setMasterVolume(0.8);

// Mute all audio
studio.muteAll();
studio.unmuteAll();
```

### Audio Channels

Organize audio into channels:

```ts
// Create audio channels
const musicChannel = studio.createAudioChannel("music");
const sfxChannel = studio.createAudioChannel("sfx");
const voiceChannel = studio.createAudioChannel("voice");

// Assign tracks to channels
musicTrack.setChannel("music");
sfxTrack.setChannel("sfx");
voiceTrack.setChannel("voice");

// Control channel volume
musicChannel.setVolume(0.5);
sfxChannel.setVolume(0.8);
voiceChannel.setVolume(1.0);
```

## Audio Visualization

### Waveform

Display audio waveform:

```ts
const waveform = audioTrack.getWaveform({
  width: 800,
  height: 100,
  color: "#00ff00",
  samples: 1000,
});

// Draw waveform on canvas
ctx.drawImage(waveform, 0, 0);
```

### Audio Levels

Get real-time audio levels:

```ts
audioTrack.on("audioprocess", (event) => {
  const level = event.level; // 0.0 to 1.0
  console.log(`Audio level: ${level}`);

  // Update visualizer
  updateMeter(level);
});
```

## Audio Export

### Export Audio Track

```ts
const audioBlob = await audioTrack.export({
  format: "mp3",
  bitrate: 192, // kbps
});
```

### Export Mixed Audio

```ts
// Export all audio tracks mixed together
const mixedAudio = await studio.exportAudio({
  format: "mp3",
  bitrate: 320,
  sampleRate: 48000,
});
```

## Audio Events

Listen to audio events:

```ts
// Playback events
audioTrack.on("play", () => console.log("Playing"));
audioTrack.on("pause", () => console.log("Paused"));
audioTrack.on("ended", () => console.log("Ended"));

// Loading events
audioTrack.on("load", () => console.log("Loaded"));
audioTrack.on("error", (error) => console.error(error));

// Volume changes
audioTrack.on("volumechange", (volume) => {
  console.log(`Volume: ${volume}`);
});

// Timeline events
audioTrack.on("enter", (frame) => {
  console.log(`Audio entered at frame ${frame}`);
});

audioTrack.on("exit", (frame) => {
  console.log(`Audio exited at frame ${frame}`);
});
```

## Advanced: Audio Analysis

### Get Frequency Data

```ts
const frequencies = audioTrack.getFrequencyData();

// Use for audio-reactive animations
clip.animate({
  property: "scale",
  fromValue: 1.0,
  toValue: 1.0 + frequencies.bass / 255,
  startFrame: currentFrame,
  duration: 1,
});
```

### Beat Detection

```ts
audioTrack.on("beat", (frame) => {
  console.log(`Beat detected at frame ${frame}`);

  // Trigger animation on beat
  logo.animate("pulse", {
    startFrame: frame,
    duration: 15,
  });
});
```

## Audio Formats

Supported audio formats:

- **MP3** - Most compatible
- **WAV** - Uncompressed, high quality
- **AAC** - Good quality, smaller files
- **OGG** - Open format
- **M4A** - Apple format

## Best Practices

1. **Use MP3 or AAC** - Best compatibility and size
2. **Normalize audio levels** - Keep consistent volume across tracks
3. **Use fade in/out** - Avoid abrupt starts/stops
4. **Compress for web** - Use 128-192 kbps for streaming
5. **Sync with video** - Align audio with visual events
6. **Test on devices** - Check audio on different devices
7. **Provide mute option** - Let users control audio
8. **Use audio channels** - Organize tracks into logical groups
9. **Optimize file sizes** - Use appropriate bitrates
10. **Handle loading errors** - Always provide error handling

## Performance Tips

1. **Preload audio** - Load audio before playback starts
2. **Limit concurrent tracks** - Too many tracks can cause issues
3. **Use lower bitrates** - For background music
4. **Avoid real-time processing** - Process audio beforehand when possible
5. **Cache processed audio** - Don't reprocess the same audio repeatedly
