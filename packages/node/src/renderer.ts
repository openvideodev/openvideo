import { chromium, type Browser, type Page } from 'playwright';
import { writeFile, readFile } from 'fs/promises';
import { EventEmitter } from 'events';
import express, { type Express } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import type { RenderConfig, RenderEventMap, RenderProgress } from './types.js';

export class Renderer extends EventEmitter {
  private config: RenderConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private server: Server | null = null;

  constructor(config: RenderConfig) {
    super();
    this.config = {
      serverPort: 5173,
      browserOptions: {
        headless: true,
        timeout: 300000, // 5 minutes
      },
      ...config,
    };
  }

  /**
   * Get the HTML template from file
   */
  private async getHtmlTemplate(): Promise<string> {
    const currentFileDir = dirname(fileURLToPath(import.meta.url));
    const templatePath = join(currentFileDir, 'template.html');
    return await readFile(templatePath, 'utf-8');
  }

  /**
   * Start a local static server to serve the HTML and core files
   */
  private async startLocalServer(): Promise<{
    url: string;
    close: () => Promise<void>;
  }> {
    const app: Express = express();

    // Serve openvideo dist files at /core (legacy route)
    const currentFileDir = dirname(fileURLToPath(import.meta.url));
    const coreDistPath = join(currentFileDir, '../node_modules/openvideo/dist');
    app.use('/core', express.static(coreDistPath));

    // Serve node_modules for package imports
    const nodeModulesPath = join(currentFileDir, '../node_modules');
    app.use('/node_modules', express.static(nodeModulesPath));

    // Serve the HTML template
    app.get('/', async (_req, res) => {
      const html = await this.getHtmlTemplate();
      res.send(html);
    });

    // Start server on random available port
    return new Promise((resolve, reject) => {
      const server = app.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('Failed to start server'));
          return;
        }
        const port = address.port;
        this.server = server;

        resolve({
          url: `http://localhost:${port}`,
          close: () =>
            new Promise<void>((resolveClose) => {
              server.close(() => resolveClose());
            }),
        });
      });

      server.on('error', reject);
    });
  }

  /**
   * Emit a progress event
   */
  private emitProgress(progress: RenderProgress): void {
    this.emit('progress', progress);
  }

  /**
   * Render the video
   */
  async render(): Promise<string> {
    let serverCleanup: (() => Promise<void>) | null = null;

    try {
      this.emitProgress({
        progress: 0,
        phase: 'initializing',
        message: 'Starting render process',
      });

      // Start local server if no serverUrl provided
      let url = this.config.serverUrl;
      if (!url) {
        this.emitProgress({
          progress: 0.05,
          phase: 'initializing',
          message: 'Starting local server',
        });

        const serverInfo = await this.startLocalServer();
        url = serverInfo.url;
        serverCleanup = serverInfo.close;
      }

      // Launch browser
      this.browser = await chromium.launch({
        headless: this.config.browserOptions?.headless ?? true,
      });

      this.page = await this.browser.newPage();

      this.emitProgress({
        progress: 0.1,
        phase: 'loading',
        message: 'Loading page',
      });

      // Inject the JSON configuration into the page context
      await this.page.addInitScript((jsonData: any) => {
        // @ts-expect-error - Running in browser context
        window.RENDER_CONFIG = jsonData;
      }, this.config.json);

      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.browserOptions?.timeout,
      });

      this.page.on('console', (msg) =>
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`)
      );
      this.page.on('pageerror', (err) => console.log(`[BROWSER ERROR] ${err}`));
      this.page.on('requestfailed', (req) =>
        console.log(
          `[BROWSER NETWORK FAIL] ${req.url()} - ${req.failure()?.errorText}`
        )
      );

      this.emitProgress({
        progress: 0.2,
        phase: 'rendering',
        message: 'Starting video render',
      });

      // Monitor progress from the page
      await this.page.exposeFunction('__reportProgress', (progress: number) => {
        this.emitProgress({
          progress: 0.2 + progress * 0.7, // Map 0-1 to 0.2-0.9
          phase: 'rendering',
          message: `Rendering: ${Math.round(progress * 100)}%`,
        });
      });

      // Wait for render to complete
      await this.page.waitForFunction(
        () => {
          // @ts-expect-error - Running in browser context
          return window.renderComplete === true;
        },
        {
          timeout: this.config.browserOptions?.timeout,
        }
      );

      // Check for errors
      const error = await this.page.evaluate(() => {
        // @ts-expect-error - Running in browser context
        return window.renderError;
      });
      if (error) {
        throw new Error(`Render error: ${error}`);
      }

      this.emitProgress({
        progress: 0.9,
        phase: 'saving',
        message: 'Saving video file',
      });

      // Get the base64 blob
      const blobBase64 = await this.page.evaluate(() => {
        // @ts-expect-error - Running in browser context
        return window.renderBlobBase64;
      });

      if (!blobBase64) {
        throw new Error('No video data received from renderer');
      }

      // Convert base64 to buffer and save
      const buffer = Buffer.from(blobBase64, 'base64');
      await writeFile(this.config.outputPath, buffer);

      this.emitProgress({
        progress: 1,
        phase: 'complete',
        message: 'Render complete',
      });

      this.emit('complete', this.config.outputPath);

      return this.config.outputPath;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    } finally {
      await this.cleanup();
      if (serverCleanup) {
        await serverCleanup();
      }
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  /**
   * Type-safe event listener
   */
  on<K extends keyof RenderEventMap>(
    event: K,
    listener: (...args: RenderEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Type-safe event emitter
   */
  emit<K extends keyof RenderEventMap>(
    event: K,
    ...args: RenderEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }
}
