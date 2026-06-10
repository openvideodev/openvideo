import { chromium, type Browser, type Page } from "playwright";
import express from "express";
import { createServer, type Server } from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { RenderOptions } from "./index.js";

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
    const app = express();

    // renderer.html at /
    app.get("/", (_req, res) => res.sendFile(RENDERER_HTML));

    // engine-pixi dist at /engine-pixi/  (import-map target)
    app.use("/engine-pixi", express.static(ENGINE_DIST, { dotfiles: "allow" }));

    const server = createServer(app);
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

  /** Start the static server and launch the headless browser. */
  async init(): Promise<void> {
    const { server, port } = await startStaticServer();
    this.server = server;
    this.port = port;

    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ],
    });
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
      audioCodec = "aac",
      audioSampleRate = 48_000,
      onProgress,
      timeout = 600_000,
    } = options;

    // Derive export dimensions from the project settings (can be overridden via options)
    const settings = (project as any).settings ?? {};
    const compositorOptions = {
      width: options.width ?? settings.width ?? 1920,
      height: options.height ?? settings.height ?? 1080,
      fps: options.fps ?? settings.fps ?? 30,
      backgroundColor: options.backgroundColor ?? settings.backgroundColor ?? "#000000",
      format,
      videoCodec,
      bitrate,
      audio,
      audioCodec,
      audioSampleRate,
    };

    const page: Page = await this.browser.newPage();

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
        if (type === "error" || type === "warning") {
          process.stderr.write(`[browser:${type}] ${msg.text()}\n`);
        }
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

      // Extract the video Blob as base64 (safe to cross the process boundary)
      const base64 = await page.evaluate(async () => {
        const blob: Blob = (window as any).__VIDEO_BLOB__;
        if (!blob) throw new Error("__VIDEO_BLOB__ not set after successful render");

        const ab = await blob.arrayBuffer();
        const u8 = new Uint8Array(ab);
        let bin = "";
        const sz = 8_192;
        for (let i = 0; i < u8.length; i += sz) {
          bin += String.fromCharCode(...(u8.slice(i, i + sz) as unknown as number[]));
        }
        return btoa(bin);
      });

      return Buffer.from(base64, "base64");
    } finally {
      await page.close();
    }
  }

  /** Stop the browser and the static server. */
  async destroy(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;

    await new Promise<void>((resolve) => {
      this.server ? this.server.close(() => resolve()) : resolve();
    });
    this.server = null;
  }
}
