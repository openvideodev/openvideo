/**
 * Browser-side thumbnail generator.
 *
 * Generates a low-resolution WebP thumbnail (max 320×320) for an uploaded
 * image or video File before it is sent to R2, so the media panel can show a
 * lightweight preview without loading the full asset.
 *
 * Strategy
 * ─────────
 * • image  → draw onto canvas via createImageBitmap, export webp
 * • video  → try mediabunny (WebCodecs) at 1 s, fall back to <video> seek
 * • audio  → returns null (no visual preview)
 */

import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";

const MAX_SIDE = 320;
const WEBP_QUALITY = 0.82;

/** Convert a canvas to a WebP Blob */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
}

/** Resize an ImageBitmap to fit within MAX_SIDE×MAX_SIDE and draw to a new canvas */
function bitmapToResizedCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const ratio = Math.min(MAX_SIDE / bitmap.width, MAX_SIDE / bitmap.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ─── Image ────────────────────────────────────────────────────────────────────

async function thumbnailFromImage(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = bitmapToResizedCanvas(bitmap);
  bitmap.close();
  return canvasToBlob(canvas);
}

// ─── Video — mediabunny (WebCodecs / CanvasSink) ─────────────────────────────

async function thumbnailFromVideoMediabunny(file: File): Promise<Blob | null> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  try {
    const [durationSec, videoTrack] = await Promise.all([
      input.computeDuration(),
      input.getPrimaryVideoTrack(),
    ]);

    if (!videoTrack) return null;

    const canDecode = await videoTrack.canDecode();
    if (!canDecode) return null;

    const seekTs = Math.min(1.0, durationSec * 0.1); // 1 s or 10% of duration

    const sink = new CanvasSink(videoTrack, { poolSize: 1, fit: "contain" });
    const iterator = sink.canvases(seekTs);

    const { value: wrappedCanvas } = await iterator.next();
    await iterator.return();

    if (!wrappedCanvas) return null;

    // WrappedCanvas exposes an OffscreenCanvas or HTMLCanvasElement via .canvas
    const source = wrappedCanvas.canvas as CanvasImageSource;
    const w =
      (wrappedCanvas.canvas as HTMLCanvasElement).width ?? (wrappedCanvas.canvas as any).width;
    const h =
      (wrappedCanvas.canvas as HTMLCanvasElement).height ?? (wrappedCanvas.canvas as any).height;

    const ratio = Math.min(MAX_SIDE / w, MAX_SIDE / h, 1);
    const out = document.createElement("canvas");
    out.width = Math.round(w * ratio);
    out.height = Math.round(h * ratio);
    out.getContext("2d")!.drawImage(source, 0, 0, out.width, out.height);

    return canvasToBlob(out);
  } finally {
    // Input is not a using-resource here so we dispose manually if possible
    (input as any)[Symbol.dispose]?.();
  }
}

// ─── Video — <video> element fallback ────────────────────────────────────────

function thumbnailFromVideoElement(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, video.duration * 0.1);
    };

    video.onseeked = async () => {
      try {
        const ratio = Math.min(MAX_SIDE / video.videoWidth, MAX_SIDE / video.videoHeight, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * ratio);
        canvas.height = Math.round(video.videoHeight * ratio);
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(await canvasToBlob(canvas));
      } catch {
        resolve(null);
      } finally {
        cleanup();
      }
    };

    video.src = objectUrl;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a low-resolution WebP thumbnail Blob for the given File.
 * Returns `null` for audio files or if extraction fails for any reason.
 */
export async function generateThumbnail(file: File): Promise<Blob | null> {
  const mime = file.type.toLowerCase();

  if (mime.startsWith("image/")) {
    try {
      return await thumbnailFromImage(file);
    } catch {
      return null;
    }
  }

  if (mime.startsWith("video/")) {
    // Try WebCodecs first (accurate, no playback needed)
    try {
      const blob = await thumbnailFromVideoMediabunny(file);
      if (blob) return blob;
    } catch {
      // fall through to video-element fallback
    }

    // Fallback: HTML <video> seek-and-draw
    try {
      return await thumbnailFromVideoElement(file);
    } catch {
      return null;
    }
  }

  return null; // audio / other
}
