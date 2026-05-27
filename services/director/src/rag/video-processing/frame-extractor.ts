import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export interface ExtractedFrame {
  timestamp: number; // seconds
  frameNumber: number;
  filePath: string;
  base64Data: string;
  mimeType: string;
}

export interface FrameExtractionOptions {
  width?: number; // Max width (height auto-scales), default 640
  quality?: number; // JPEG quality 1-31 (lower is better), default 3
  format?: "jpeg" | "png"; // default jpeg
}

/**
 * Extract a single frame at a specific timestamp from a video.
 */
export async function extractFrame(
  videoPath: string,
  timestamp: number,
  outputDir: string,
  options: FrameExtractionOptions = {},
): Promise<ExtractedFrame> {
  const { width = 640, quality = 3, format = "jpeg" } = options;

  const frameNumber = Math.floor(timestamp * 30); // Assume 30fps for frame number
  const filename = `frame_${timestamp.toFixed(2).replace(".", "_")}.${format}`;
  const outputPath = path.join(outputDir, filename);

  // ffmpeg extract single frame
  const args = [
    "-ss",
    timestamp.toFixed(3), // Seek to timestamp (before -i for faster seeking)
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    quality.toString(),
    "-vf",
    `scale=${width}:-1`,
    "-f",
    "image2",
    "-y", // Overwrite output
    outputPath,
  ];

  await execFileAsync("ffmpeg", args, { timeout: 30000 });

  // Read and encode to base64
  const imageBuffer = await fs.promises.readFile(outputPath);
  const base64Data = imageBuffer.toString("base64");
  const mimeType = format === "png" ? "image/png" : "image/jpeg";

  return {
    timestamp,
    frameNumber,
    filePath: outputPath,
    base64Data,
    mimeType,
  };
}

/**
 * Extract multiple keyframes from a time range (scene).
 * By default extracts: start frame, middle frame, end frame
 */
export async function extractKeyframeBatch(
  videoPath: string,
  startTime: number,
  endTime: number,
  outputDir: string,
  options: FrameExtractionOptions & { framesPerScene?: number } = {},
): Promise<ExtractedFrame[]> {
  const { width = 640, quality = 3, format = "jpeg", framesPerScene = 3 } = options;

  const duration = endTime - startTime;
  const frames: ExtractedFrame[] = [];

  // Calculate timestamps for extraction
  const timestamps: number[] = [];

  if (framesPerScene === 1) {
    // Just middle frame
    timestamps.push(startTime + duration / 2);
  } else if (framesPerScene === 2) {
    // Start and end
    timestamps.push(startTime, endTime);
  } else {
    // Start, middle(s), end
    timestamps.push(startTime);

    // Add middle frame(s)
    if (framesPerScene > 3) {
      const step = duration / (framesPerScene - 1);
      for (let i = 1; i < framesPerScene - 1; i++) {
        timestamps.push(startTime + i * step);
      }
    } else {
      timestamps.push(startTime + duration / 2);
    }

    timestamps.push(endTime);
  }

  // Extract frames in parallel batches of 4
  const batchSize = 4;
  for (let i = 0; i < timestamps.length; i += batchSize) {
    const batch = timestamps.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((ts) =>
        extractFrame(videoPath, ts, outputDir, { width, quality, format }).catch((err) => {
          console.warn(`Failed to extract frame at ${ts}s: ${err.message}`);
          return null;
        }),
      ),
    );
    frames.push(...batchResults.filter((f): f is ExtractedFrame => f !== null));
  }

  return frames.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Extract frames at regular intervals (e.g., 1fps sampling).
 * Use this for shorter videos where you want dense coverage.
 */
export async function extractFramesAtInterval(
  videoPath: string,
  outputDir: string,
  intervalSec: number = 1,
  options: FrameExtractionOptions = {},
): Promise<ExtractedFrame[]> {
  const { width = 640, quality = 3, format = "jpeg" } = options;

  const filename = `frame_%04d.${format}`;
  const outputPattern = path.join(outputDir, filename);

  const args = [
    "-i",
    videoPath,
    "-vf",
    `fps=1/${intervalSec},scale=${width}:-1`,
    "-q:v",
    quality.toString(),
    "-f",
    "image2",
    "-y",
    outputPattern,
  ];

  await execFileAsync("ffmpeg", args, { timeout: 120000 });

  // Read generated frames
  const files = await fs.promises.readdir(outputDir);
  const frameFiles = files.filter((f) => f.startsWith("frame_") && f.endsWith(`.${format}`));

  const frames: ExtractedFrame[] = [];
  const mimeType = format === "png" ? "image/png" : "image/jpeg";

  for (const file of frameFiles.sort()) {
    const match = file.match(/frame_(\d+)/);
    if (match) {
      const frameIndex = parseInt(match[1]) - 1; // ffmpeg starts at 1
      const timestamp = frameIndex * intervalSec;
      const filePath = path.join(outputDir, file);
      const imageBuffer = await fs.promises.readFile(filePath);

      frames.push({
        timestamp,
        frameNumber: frameIndex,
        filePath,
        base64Data: imageBuffer.toString("base64"),
        mimeType,
      });
    }
  }

  return frames;
}

/**
 * Clean up extracted frame files.
 */
export async function cleanupFrames(frames: ExtractedFrame[]): Promise<void> {
  await Promise.all(
    frames.map((frame) =>
      fs.promises.unlink(frame.filePath).catch(() => {
        // Ignore cleanup errors
      }),
    ),
  );
}

/**
 * Create a temporary directory for frame extraction.
 */
export async function createTempFrameDir(prefix: string = "video-frames-"): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(require("os").tmpdir(), prefix));
  return tempDir;
}

/**
 * Remove a temporary directory and all its contents.
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    const files = await fs.promises.readdir(dirPath);
    await Promise.all(
      files.map((file) => fs.promises.unlink(path.join(dirPath, file)).catch(() => {})),
    );
    await fs.promises.rmdir(dirPath);
  } catch {
    // Ignore cleanup errors
  }
}
