# @designcombo/node

Node.js video renderer for Combo using Playwright and WebCodecs.

Render videos server-side with the same powerful `openvideo` compositor used in the browser. Perfect for automated video generation, batch processing, and server-side rendering.

## Features

✨ **Self-Contained** - No external server required, works out of the box  
🚀 **Automatic Setup** - Starts its own local server automatically  
📦 **Zero Config** - Just provide JSON and output path  
🎯 **Type-Safe** - Full TypeScript support  
⚡ **Fast** - Uses hardware-accelerated WebCodecs API  

## Installation

```bash
pnpm add @openvideo/node openvideo
```

## Quick Start

```typescript
import { Renderer } from '@designcombo/node';

const renderer = new Renderer({
  json: {
    settings: {
      width: 1280,
      height: 720,
      fps: 30,
    },
    clips: [
      {
        type: 'Text',
        text: 'Hello World!',
        display: { from: 0, to: 3000000 }, // 3 seconds in microseconds
      },
    ],
  },
  outputPath: './output.mp4',
});

// Listen to progress
renderer.on('progress', (progress) => {
  console.log(`[${progress.phase}] ${Math.round(progress.progress * 100)}%`);
});

// Render the video
await renderer.render();
console.log('Video rendered successfully!');
```

## How It Works

The renderer is **completely self-contained**:

1. 🚀 Automatically starts a local Express server
2. 📄 Serves the embedded HTML template and `openvideo` files
3. 🌐 Launches a headless Chromium browser via Playwright
4. 🎬 Renders the video using WebCodecs in the browser
5. 💾 Saves the rendered video to your specified path
6. 🧹 Cleans up all resources automatically

**No external server needed!** The renderer handles everything internally.

## API Reference

### `Renderer`

#### Constructor

```typescript
new Renderer(config: RenderConfig)
```

#### `RenderConfig`

```typescript
interface RenderConfig {
  /**
   * JSON configuration for the video composition
   */
  json: any;

  /**
   * Output file path for the rendered video
   */
  outputPath: string;

  /**
   * Optional server URL (advanced use only)
   * If not provided, a local server starts automatically
   */
  serverUrl?: string;

  /**
   * Playwright browser options
   */
  browserOptions?: {
    headless?: boolean;  // Default: true
    timeout?: number;    // Default: 300000 (5 minutes)
  };
}
```

#### Methods

- `render(): Promise<string>` - Renders the video and returns the output path

#### Events

The `Renderer` extends `EventEmitter` and emits:

- **`progress`** - `(progress: RenderProgress) => void`
  ```typescript
  {
    progress: number;  // 0 to 1
    phase: 'initializing' | 'loading' | 'rendering' | 'saving' | 'complete';
    message?: string;
  }
  ```

- **`error`** - `(error: Error) => void`

- **`complete`** - `(outputPath: string) => void`

## Examples

### With Progress Tracking

```typescript
import { Renderer } from '@combo/node';

const renderer = new Renderer({
  json: videoConfig,
  outputPath: './output.mp4',
});

renderer.on('progress', ({ phase, progress, message }) => {
  console.log(`[${phase}] ${Math.round(progress * 100)}% - ${message}`);
});

renderer.on('error', (error) => {
  console.error('Render failed:', error);
});

renderer.on('complete', (path) => {
  console.log(`✅ Video saved to: ${path}`);
});

await renderer.render();
```

### With Custom Browser Options

```typescript
const renderer = new Renderer({
  json: videoConfig,
  outputPath: './output.mp4',
  browserOptions: {
    headless: false,  // Show browser for debugging
    timeout: 600000,  // 10 minutes timeout
  },
});

await renderer.render();
```

### Loading JSON from File

```typescript
import { readFile } from 'fs/promises';

const jsonContent = await readFile('./video-config.json', 'utf-8');
const videoConfig = JSON.parse(jsonContent);

const renderer = new Renderer({
  json: videoConfig,
  outputPath: './output.mp4',
});

await renderer.render();
```

## Local Development

### Prerequisites

- Node.js >= 18
- pnpm (or npm/yarn)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd combo
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Build the packages:**
   ```bash
   # Build openvideo first
   pnpm --filter openvideo build
   
   # Build @combo/node
   pnpm --filter @combo/node build
   ```

### Running the Example

The package includes a sample script to test the renderer:

```bash
cd packages/node

# Run the sample (builds, copies files, and renders)
pnpm render
```

Or manually:
```bash
# Build the package
pnpm build

# Copy sample JSON to dist
cp src/sample.json dist/sample.json

# Run the sample
node dist/sample.js
```

You should see output like:
```
[initializing] 0% - Starting render process
[initializing] 5% - Starting local server
[loading] 10% - Loading page
[rendering] 20% - Starting video render
[rendering] 50% - Rendering: 50%
[rendering] 90% - Rendering: 100%
[saving] 90% - Saving video file
[complete] 100% - Render complete
✅ Video rendered successfully: /path/to/output.mp4
```

### Development Workflow

1. **Make changes to the source code** in `src/`

2. **Rebuild the package:**
   ```bash
   pnpm --filter @combo/node build
   ```

3. **Test your changes:**
   ```bash
   node dist/sample.js
   ```

### Project Structure

```
packages/node/
├── src/
│   ├── index.ts           # Package exports
│   ├── renderer.ts        # Main Renderer class
│   ├── types.ts           # TypeScript type definitions
│   ├── template.html      # HTML template for rendering
│   ├── sample.ts          # Example usage script
│   └── sample.json        # Example video configuration
├── dist/                  # Compiled output (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Modifying the HTML Template

The HTML template is located at `src/template.html`. It uses:
- **Import maps** to resolve `openvideo` package
- **WebCodecs API** for video encoding
- **Compositor** from `openvideo` for rendering

After modifying the template, rebuild the package to copy it to `dist/`.

## Requirements

- **Node.js** >= 18
- **Playwright** (installs Chromium automatically)
- **openvideo** package

## Troubleshooting

### Playwright Installation Issues

If Playwright fails to install Chromium:
```bash
npx playwright install chromium
```

### Module Resolution Errors

Ensure `openvideo` is built:
```bash
pnpm --filter openvideo build
```

### Timeout Errors

Increase the timeout in browser options:
```typescript
browserOptions: {
  timeout: 600000  // 10 minutes
}
```

## License

MIT
