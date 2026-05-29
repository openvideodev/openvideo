import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execFileAsync = promisify(execFile);

export interface Scene {
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
}

export interface SceneDetectorOptions {
  threshold?: number; // Scene change threshold (0.0-1.0), default 0.3
  minSceneDuration?: number; // Minimum scene length in seconds, default 2
  maxSceneDuration?: number; // Maximum scene length in seconds, default 300 (5 min)
  maxScenes?: number; // Maximum number of scenes to return, default 50
}

/**
 * Detect scene boundaries in a video using ffmpeg scene detection filter.
 * This is fast, local, and free - no API calls required.
 *
 * Uses the select=scene filter which compares histograms between frames.
 */
export async function detectScenes(
  videoPath: string,
  options: SceneDetectorOptions = {},
): Promise<Scene[]> {
  const { threshold = 0.3, minSceneDuration = 2, maxSceneDuration = 300, maxScenes = 50 } = options;

  // ffmpeg scene detection command
  // -vf "select='gt(scene,0.3)',showinfo" detects frames where scene change > threshold
  const args = [
    "-i",
    videoPath,
    "-vf",
    `select='gt(scene,${threshold})',showinfo`,
    "-f",
    "null",
    "-",
  ];

  let output: string;
  try {
    const { stderr } = await execFileAsync("ffmpeg", args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
      timeout: 120000, // 2 minute timeout
    });
    output = stderr;
  } catch (err) {
    // ffmpeg returns exit code 0 even on success, but sometimes returns non-zero
    // if there are warnings. Check if we got output.
    if ((err as any).stderr) {
      output = (err as any).stderr;
    } else {
      throw new Error(`ffmpeg scene detection failed: ${(err as Error).message}`);
    }
  }

  // Parse scene change timestamps from output
  // Format: pts_time:123.456 pts:...
  const sceneChanges = parseSceneChanges(output);

  // Build scene list from change points
  const scenes = buildScenes(
    sceneChanges,
    await getVideoDuration(videoPath),
    minSceneDuration,
    maxSceneDuration,
  );

  // If we have too many scenes, merge smallest ones
  if (scenes.length > maxScenes) {
    return mergeScenesToTarget(scenes, maxScenes, maxSceneDuration);
  }

  return scenes;
}

/**
 * Parse scene change timestamps from ffmpeg showinfo output
 */
function parseSceneChanges(output: string): number[] {
  const timestamps: number[] = [];
  // Match lines like: n:   0 pts:      0 pts_time:0
  // or: n: 142 pts: 1288800 pts_time:14.32
  const regex = /pts_time:(\d+\.?\d*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    const time = parseFloat(match[1]);
    if (!isNaN(time)) {
      timestamps.push(time);
    }
  }

  return timestamps.sort((a, b) => a - b);
}

/**
 * Build scene list from scene change points
 */
function buildScenes(
  sceneChanges: number[],
  totalDuration: number,
  minDuration: number,
  maxDuration: number,
): Scene[] {
  const scenes: Scene[] = [];
  let currentStart = 0;

  for (const changeTime of sceneChanges) {
    const duration = changeTime - currentStart;

    // Skip scenes that are too short
    if (duration < minDuration) {
      continue;
    }

    // Split scenes that are too long
    if (duration > maxDuration) {
      const numSubScenes = Math.ceil(duration / maxDuration);
      const subSceneDuration = duration / numSubScenes;

      for (let i = 0; i < numSubScenes; i++) {
        const subStart = currentStart + i * subSceneDuration;
        const subEnd = Math.min(subStart + subSceneDuration, changeTime);
        scenes.push({
          startTime: subStart,
          endTime: subEnd,
          duration: subEnd - subStart,
        });
      }
    } else {
      scenes.push({
        startTime: currentStart,
        endTime: changeTime,
        duration,
      });
    }

    currentStart = changeTime;
  }

  // Add final scene
  if (currentStart < totalDuration) {
    const finalDuration = totalDuration - currentStart;
    if (finalDuration >= minDuration) {
      scenes.push({
        startTime: currentStart,
        endTime: totalDuration,
        duration: finalDuration,
      });
    }
  }

  return scenes;
}

/**
 * Merge smallest scenes to reach target count
 */
function mergeScenesToTarget(scenes: Scene[], targetCount: number, maxDuration: number): Scene[] {
  // Sort by duration, smallest first
  const sorted = [...scenes].sort((a, b) => a.duration - b.duration);
  const merged: Scene[] = [];

  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];

    // Try to merge with next scene if both are small
    if (
      i + 1 < sorted.length &&
      merged.length + (sorted.length - i) > targetCount &&
      current.duration + sorted[i + 1].duration <= maxDuration
    ) {
      const next = sorted[i + 1];
      merged.push({
        startTime: current.startTime,
        endTime: next.endTime,
        duration: next.endTime - current.startTime,
      });
      i += 2;
    } else {
      merged.push(current);
      i++;
    }
  }

  // If still too many, recursively merge
  if (merged.length > targetCount && merged.length < scenes.length) {
    return mergeScenesToTarget(merged, targetCount, maxDuration);
  }

  return merged.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ];

  try {
    const { stdout } = await execFileAsync("ffprobe", args, { timeout: 30000 });
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error("Invalid duration output from ffprobe");
    }
    return duration;
  } catch (err) {
    // Fallback: try to get duration from ffmpeg output
    try {
      const { stderr } = await execFileAsync("ffmpeg", ["-i", videoPath], { timeout: 30000 });
      const durationMatch = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }
    } catch {
      // Ignore fallback error
    }
    throw new Error(`Failed to get video duration: ${(err as Error).message}`);
  }
}

/**
 * Alternative: Use silence detection from audio track for scene boundaries
 * This is useful when visual scene detection misses dialogue-heavy content
 */
export async function detectScenesFromSilence(
  videoPath: string,
  silenceThreshold = -50, // dB
  minSilenceDuration = 0.5, // seconds
  maxScenes = 50,
): Promise<Scene[]> {
  const args = [
    "-i",
    videoPath,
    "-af",
    `silencedetect=noise=${silenceThreshold}dB:d=${minSilenceDuration}`,
    "-f",
    "null",
    "-",
  ];

  let output: string;
  try {
    const { stderr } = await execFileAsync("ffmpeg", args, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000,
    });
    output = stderr;
  } catch (err) {
    output = (err as any).stderr || "";
  }

  // Parse silence periods: [silence_start: X.Y] [silence_end: X.Y]
  const silenceStarts: number[] = [];
  const silenceEnds: number[] = [];

  const startRegex = /silence_start: (\d+\.?\d*)/g;
  const endRegex = /silence_end: (\d+\.?\d*)/g;

  let match;
  while ((match = startRegex.exec(output)) !== null) {
    silenceStarts.push(parseFloat(match[1]));
  }
  while ((match = endRegex.exec(output)) !== null) {
    silenceEnds.push(parseFloat(match[1]));
  }

  // Convert silence periods to scene boundaries (speech segments)
  const totalDuration = await getVideoDuration(videoPath);
  const scenes: Scene[] = [];
  let currentStart = 0;

  for (let i = 0; i < silenceStarts.length; i++) {
    const silenceStart = silenceStarts[i];
    const silenceEnd = silenceEnds[i] || totalDuration;

    // Scene is the segment before this silence
    if (silenceStart > currentStart) {
      scenes.push({
        startTime: currentStart,
        endTime: silenceStart,
        duration: silenceStart - currentStart,
      });
    }

    currentStart = silenceEnd;
  }

  // Add final scene
  if (currentStart < totalDuration) {
    scenes.push({
      startTime: currentStart,
      endTime: totalDuration,
      duration: totalDuration - currentStart,
    });
  }

  // Limit scene count
  if (scenes.length > maxScenes) {
    // Merge smallest scenes
    return mergeScenesToTarget(scenes, maxScenes, 300);
  }

  return scenes;
}
