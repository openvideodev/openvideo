import { recodemux } from "wrapbox";
import { createAudioTrackBuf } from "./audio-mixer";

/**
 * Resolve the WebGL/WebGL2 context already held by an OffscreenCanvas.
 * Returns null if no WebGL context is attached (e.g. canvas not yet used).
 */
export function getCanvasGl(
  canvas: OffscreenCanvas,
): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    // getContext() returns the *existing* context if one was already created,
    // so this never creates a new one — it just retrieves Pixi's context.
    return (
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null)
    );
  } catch {
    return null;
  }
}

/**
 * Creates an AV encoder function that queues and encodes both mixed AudioData and VideoFrames.
 */
export function createAVEncoder(opts: {
  muxer: ReturnType<typeof recodemux>;
  canvas: OffscreenCanvas;
  outputAudio?: boolean;
  hasVideoTrack: boolean;
  timeSlice: number;
  fps: number;
}) {
  const { canvas, outputAudio, muxer, hasVideoTrack, timeSlice } = opts;
  let frameCnt = 0;
  // GOP size: 3 seconds
  const gopSize = Math.floor(3 * opts.fps);

  // Resolve the WebGL context once — reused every frame.
  const gl = hasVideoTrack ? getCanvasGl(canvas) : null;

  const audioTrackBuf = createAudioTrackBuf(1024, opts.fps);

  return async (timestamp: number, audios: Float32Array[][], hasVideo: boolean) => {
    if (outputAudio !== false) {
      for (const audioData of audioTrackBuf(timestamp, audios)) {
        await muxer.encodeAudio(audioData);
      }
    }

    // Only encode video if we have video track AND we actually have video frames
    if (hasVideoTrack && hasVideo) {
      // Ensure canvas is in a valid state before creating VideoFrame
      // The canvas must have been rendered to at least once
      try {
        // gl.finish() flushes all pending GPU commands and blocks until the GPU
        // has completed them. Without this, on an *active* browser tab the WebGL
        // driver defers GPU completion to the next vsync cycle (~16.6 ms), making
        // VideoFrame creation implicitly wait for vsync. gl.finish() removes that
        // dependency so every frame is captured at full GPU speed — the same
        // behaviour you get naturally when the tab is backgrounded (vsync stops).
        if (gl != null && !gl.isContextLost()) {
          gl.finish();
        }

        const frame = new VideoFrame(canvas, {
          duration: timeSlice,
          timestamp: timestamp,
        });

        await muxer.encodeVideo(frame, {
          keyFrame: frameCnt % gopSize === 0,
        });

        frameCnt += 1;
      } catch (err) {
        // If canvas is not ready, skip this frame
        // This can happen if the canvas hasn't been rendered to yet
        console.warn("Failed to create VideoFrame from canvas, skipping frame:", err);
      }
    }
  };
}
