import { chromium, type Browser, type Page } from "playwright";
import sirv from "sirv";
import { createServer, type Server } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { RenderOptions } from "./index.js";

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Video pre-transcoding to Opus audio (for WebCodecs compatibility)
// ---------------------------------------------------------------------------

interface ProjectClip {
  type?: string;
  src?: string;
  audio?: boolean;
  [key: string]: unknown;
}

interface ProjectJSON {
  clips?: Record<string, ProjectClip>;
  [key: string]: unknown;
}

/** Pre-transcode video clips to have Opus audio for WebCodecs compatibility */
async function pretranscodeVideos(project: ProjectJSON): Promise<ProjectJSON> {
  if (!project.clips) return project;

  const tempDir = path.join(PKG_ROOT, "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const transcodedClips: Record<string, ProjectClip> = {};

  for (const [id, clip] of Object.entries(project.clips)) {
    // Only transcode video clips with external URLs and audio
    if (clip.type === "Video" && clip.src?.startsWith("http") && clip.audio !== false) {
      try {
        const tempInput = path.join(tempDir, `input-${id}.mp4`);
        const tempOutput = path.join(tempDir, `output-${id}.mp4`);

        console.log(`Downloading and transcoding clip ${id}...`);

        // Download the video
        const response = await fetch(clip.src);
        if (!response.ok) throw new Error(`Failed to fetch ${clip.src}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(tempInput, buffer);

        // Transcode to MP4 with Opus audio (WebCodecs compatible, keeps H.264 video)
        await execAsync(
          `ffmpeg -i "${tempInput}" -c:v copy -c:a libopus -b:a 128k "${tempOutput}" -y`,
          { timeout: 300_000 },
        );

        // Read the transcoded file as base64 data URL
        const transcodedBuffer = await fs.readFile(tempOutput);
        const base64 = transcodedBuffer.toString("base64");
        const dataUrl = `data:video/mp4;base64,${base64}`;

        transcodedClips[id] = { ...clip, src: dataUrl };
        console.log(
          `Transcoded clip ${id} to MP4/Opus (${(transcodedBuffer.length / 1e6).toFixed(1)} MB)`,
        );

        // Cleanup temp files
        await fs.unlink(tempInput).catch(() => undefined);
        await fs.unlink(tempOutput).catch(() => undefined);
      } catch (err) {
        console.warn(`Failed to transcode clip ${id}:`, (err as Error).message);
        transcodedClips[id] = clip; // Keep original on failure
      }
    } else {
      transcodedClips[id] = clip;
    }
  }

  return { ...project, clips: transcodedClips };
}

// ---------------------------------------------------------------------------
// Path helpers (works both from src/ with tsx and from dist/ after build)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Root of the video-renderer package (one level above src/ or dist/) */
const PKG_ROOT = path.resolve(__dirname, "..");

/** Absolute path to renderer.html */
const RENDERER_HTML = path.join(PKG_ROOT, "renderer.html");

/** Absolute path to the local @openvideo/engine-pixi dist */
const ENGINE_DIST = path.join(PKG_ROOT, "node_modules", "@openvideo", "engine-pixi", "dist");

// ---------------------------------------------------------------------------
// Static HTTP server
// ---------------------------------------------------------------------------

function startStaticServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    // Use sirv for faster static file serving (~2x faster than express.static)
    const serveEngine = sirv(ENGINE_DIST, { dev: false, dotfiles: true });
    const serveRenderer = sirv(PKG_ROOT, { dev: false, single: "renderer.html" });

    const server = createServer((req, res) => {
      // Fast path: engine-pixi assets
      if (req.url?.startsWith("/engine-pixi")) {
        req.url = req.url.slice("/engine-pixi".length);
        serveEngine(req, res, () => {
          res.statusCode = 404;
          res.end("Not found");
        });
        return;
      }
      // Serve renderer.html for root path
      serveRenderer(req, res, () => {
        res.statusCode = 404;
        res.end("Not found");
      });
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") return reject(new Error("Unexpected server address"));
      resolve({ server, port: addr.port });
    });
  });
}

// ---------------------------------------------------------------------------
// VideoRenderer
// ---------------------------------------------------------------------------

export class VideoRenderer {
  private browser: Browser | null = null;
  private server: Server | null = null;
  private port = 0;
  private pagePool: Page[] = [];
  private maxPoolSize = 3;

  /** Start the static server and launch the headless browser. */
  async init(): Promise<void> {
    const { server, port } = await startStaticServer();
    this.server = server;
    this.port = port;

    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--enable-features=WebCodecs,MediaRecorder,AudioEncoder,VideoEncoder",
        "--enable-blink-features=WebCodecs",
        "--enable-accelerated-video-encode",
        "--enable-accelerated-video-decode",
        "--enable-accelerated-video",
        "--enable-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });

    const version = await this.browser.version();
    console.log("Browser:", version);
  }

  /**
   * Render a project and return the encoded video as a Buffer.
   * Can be called multiple times on the same instance to amortise
   * browser startup cost across multiple renders.
   */
  async render(project: object, options: RenderOptions = {}): Promise<Buffer> {
    if (!this.browser) throw new Error("VideoRenderer not initialised — call init() first.");

    const {
      format = "mp4",
      videoCodec = "avc1.640033",
      bitrate = 12_000_000,
      audio = true,
      audioCodec = "opus",
      audioSampleRate = 48_000,
      onProgress,
      timeout = 600_000,
      prioritizeSpeed = false,
    } = options;

    // Pre-transcode videos to Opus audio if audio is enabled
    if (audio) {
      console.log("Pre-transcoding videos to Opus audio...");
      project = await pretranscodeVideos(project as any);
    }

    // Derive export dimensions from the project settings (can be overridden via options)
    const settings = (project as any).settings ?? {};
    const compositorOptions = {
      width: options.width ?? settings.width ?? 1920,
      height: options.height ?? settings.height ?? 1080,
      fps: options.fps ?? settings.fps ?? 30,
      backgroundColor: options.backgroundColor ?? settings.backgroundColor ?? "#000000",
      format,
      videoCodec,
      bitrate: prioritizeSpeed ? Math.floor(bitrate * 0.7) : bitrate, // Lower bitrate for speed
      audio,
      audioCodec,
      audioSampleRate,
      prioritizeSpeed,
    };

    // Acquire page from pool or create new one
    const page = this.pagePool.pop() || (await this.browser.newPage());

    // Disable Playwright's 30 s default timeout — renders can take minutes.
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(60_000);

    try {
      // Inject project data + compositor options before the page's own scripts run
      await page.addInitScript(
        ({ project, opts }: { project: object; opts: object }) => {
          (window as any).__PROJECT_DATA__ = project;
          (window as any).__COMPOSITOR_OPTIONS__ = opts;
        },
        { project, opts: compositorOptions },
      );

      // Expose a Node.js function that renderer.html can call for progress updates
      if (onProgress) {
        await page.exposeFunction("__onProgress__", (v: number) => onProgress(v));
      }

      // Forward browser console → Node stdout (useful for debugging)
      page.on("console", (msg) => {
        const type = msg.type();
        process.stdout.write(`[browser:${type}] ${msg.text()}\n`);
      });
      page.on("pageerror", (err) => process.stderr.write(`[browser:pageerror] ${err.message}\n`));

      // Navigate to the local renderer page
      await page.goto(`http://127.0.0.1:${this.port}`, {
        waitUntil: "load",
        timeout: 60_000,
      });

      // Wait for the render to finish (renderer.html sets __RENDER_COMPLETE__ or __RENDER_ERROR__)
      await page.waitForFunction(
        () => (window as any).__RENDER_COMPLETE__ || (window as any).__RENDER_ERROR__,
        { timeout },
      );

      // Surface any render-time errors from the browser
      const renderError = await page.evaluate(
        () => (window as any).__RENDER_ERROR__ as string | undefined,
      );
      if (renderError) throw new Error(`Renderer error: ${renderError}`);

      // Extract the video Blob as Uint8Array (faster than base64, ~30% less memory)
      const uint8Array = await page.evaluate(async () => {
        const blob: Blob = (window as any).__VIDEO_BLOB__;
        if (!blob) throw new Error("__VIDEO_BLOB__ not set after successful render");
        return new Uint8Array(await blob.arrayBuffer());
      });

      return Buffer.from(uint8Array);
    } finally {
      // Return page to pool instead of closing (amortize newPage cost)
      if (this.pagePool.length < this.maxPoolSize) {
        // Reset page state for reuse
        await page.goto("about:blank").catch(() => undefined);
        this.pagePool.push(page);
      } else {
        await page.close();
      }
    }
  }

  /** Stop the browser and the static server. */
  async destroy(): Promise<void> {
    // Close pooled pages first
    await Promise.all(this.pagePool.map((p) => p.close().catch(() => undefined)));
    this.pagePool = [];

    await this.browser?.close().catch(() => undefined);
    this.browser = null;

    await new Promise<void>((resolve) => {
      this.server ? this.server.close(() => resolve()) : resolve();
    });
    this.server = null;
  }
}
