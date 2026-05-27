# @openvideo/engine-pixi

## 1.1.1

### Patch Changes

- Add `@openvideo/ai` package for OpenVideo Director; update docs structure into numbered sections.
- Updated dependencies
  - @openvideo/core@1.1.1

## 1.0.6

### Patch Changes

- fix: export aspect ratio, timeline scroll, and drag improvements

  - Preserve aspect ratio when exporting with presets (portrait/landscape detection)
  - Add container-level scale transform in compositor for dimension mapping
  - Store original JSON dimensions for proper clip scaling during render
  - Scale transition clip positions to export dimensions
  - Timeline scroll direction locking for trackpad gestures (single-axis scrolling)
  - Fix drag data parsing for uploads and media panels
  - Remove debug console.log statements from core and audio-clip

- Updated dependencies
  - @openvideo/core@1.0.6

## 1.0.4

### Patch Changes

- Fix package.json entry points to correctly reference dist/ files instead of src/index.ts.
- Updated dependencies
  - @openvideo/core@1.0.4

## 1.0.3

### Patch Changes

- Fix first frame rendering issue. PlaybackController now acts as pure command dispatcher with Studio Transport.renderLoop as sole playback driver. Added Pixi v8 VideoSource GPU upload force and improved seek synchronization to prevent stale frames during backward seeks.
- Updated dependencies
  - @openvideo/core@1.0.3

## 1.0.2

### Patch Changes

- Fixed playback and seeking
- Updated dependencies
  - @openvideo/core@1.0.2

## 1.0.1

### Patch Changes

- Release 1.0.1
- Updated dependencies
  - @openvideo/core@1.0.1
