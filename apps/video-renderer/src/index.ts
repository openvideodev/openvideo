import fs from "fs/promises";
import type { ProjectJSON } from "@openvideo/engine-pixi";
import { VideoRenderer } from "./renderer.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RenderOptions {
  /** Override export width (px). Defaults to project settings.width. */
  width?: number;
  /** Override export height (px). Defaults to project settings.height. */
  height?: number;
  /** Override frame rate. Defaults to project settings.fps. */
  fps?: number;
  /** Override background colour hex. Defaults to project settings.backgroundColor or '#000000'. */
  backgroundColor?: string;
  /** Container format. Default: 'mp4'. */
  format?: string;
  /** WebCodecs video codec string. Default: 'avc1.640033' (H.264). */
  videoCodec?: string;
  /** Video bitrate (bps). Default: 12_000_000 (12 Mbps). */
  bitrate?: number;
  /** Include audio track. Default: true. */
  audio?: boolean;
  /** WebCodecs audio codec. Default: 'aac'. */
  audioCodec?: string;
  /** Audio sample rate. Default: 48_000. */
  audioSampleRate?: number;
  /**
   * Called with values 0–1 as the export progresses.
   * Note: this runs inside the Node.js process via Playwright's exposeFunction.
   */
  onProgress?: (progress: number) => void;
  /** Maximum render time in ms before throwing. Default: 600_000 (10 min). */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// renderVideo — single-call convenience API
// ---------------------------------------------------------------------------

/**
 * Render a project to a video Buffer.
 *
 * Spins up a headless browser, renders the project using @openvideo/engine-pixi,
 * and returns the encoded video. If `outputPath` is supplied the Buffer is also
 * written to disk.
 *
 * @example
 * ```ts
 * import { renderVideo } from "@openvideo/video-renderer";
 *
 * const buffer = await renderVideo(project, {
 *   format: "mp4",
 *   bitrate: 8_000_000,
 *   onProgress: (p) => console.log(`${(p * 100).toFixed(1)}%`),
 * });
 * ```
 */
export async function renderVideo(
  project: ProjectJSON,
  options?: RenderOptions & { outputPath?: string },
): Promise<Buffer> {
  const renderer = new VideoRenderer();
  await renderer.init();

  try {
    const buffer = await renderer.render(project, options);
    if (options?.outputPath) {
      await fs.writeFile(options.outputPath, buffer);
    }
    return buffer;
  } finally {
    await renderer.destroy();
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { VideoRenderer } from "./renderer.js";
export type { ProjectJSON } from "@openvideo/engine-pixi";
