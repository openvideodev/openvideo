# Antigravity Instructions - Combo Project

Welcome to the **Combo** monorepo. This file provides context and guidelines for working on this codebase.

## 1. Project Overview
**Combo** is a high-performance video editing SDK and suite of tools.
- **Main App**: `combo.sh` (Editor application)
- **Docs App**: `docs.combo.sh` (Documentation application)
- **Core SDK**: `@designcombo/video`

## 2. Project Structure
The repository is a monorepo managed with `pnpm` and `turbo`.

- `editor/`: The main video editor application (Next.js 15+, Tailwind CSS, Shadcn UI).
- `docs/`: The documentation application (Next.js, Fumadocs). Served at `docs.combo.sh`.
- `packages/`:
    - `video/`: Core Video SDK. Built on **PixiJS** for rendering and **WebCodecs** for high-performance video processing.
    - `node/`: Node.js specific utilities and server-side rendering logic.

## 3. Technology Stack
- **Languages**: TypeScript (Strict mode).
- **Frontend**: React 19, Next.js 15+ (App Router).
- **Rendering**: PixiJS v8.
- **Processing**: WebCodecs API.
- **Styling**: Vanilla CSS, Tailwind CSS.
- **Linting/Formatting**: Biome.

## 4. Coding Conventions & Patterns

### 4.1 Time Management
- **CRITICAL**: Use **microseconds** (`μs`) for all time-related properties (`display.from`, `display.to`, `trim.from`, `trim.to`, `currentTime`, `duration`).
- 1 second = 1,000,000 microseconds (`1e6`).

### 4.2 Clip Naming
- All clips follow a standard naming convention: `Video`, `Image`, `Text`, `Audio`, `Caption`.
- Avoid suffixing with `Clip` (e.g., use `Video` instead of `VideoClip`).

### 4.3 Documentation
- Documentation is located in `docs/content/docs`.
- Use `.mdx` format for all documentation files.
- Sidebar organization is controlled by `docs/content/docs/meta.json`.
- The documentation is served from the root path (`/`) in the `docs` app.

### 4.4 State & Serialization
- The `Studio` class manages the interactive state.
- Use `exportToJSON()` and `loadFromJSON()` for state persistence.
- State is compatible between the `Studio` (Client) and `Compositor` (Server/Worker).

## 5. Development Guidelines
- Always prioritize **performance**. Video editing in the browser is resource-intensive.
- Ensure all media loading is handled asynchronously and awaited (`clip.ready`).
- Use the `EventEmitter` for local state synchronization within the video package.
- When creating new components in the `editor`, follow existing Shadcn UI patterns.
