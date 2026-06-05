/**
 * Yield to the browser's task scheduler without vsync delay.
 *
 * Why MessageChannel instead of setTimeout or Promise.resolve?
 * - `setTimeout(0)` is clamped to ~4 ms and tied to vsync on active tabs.
 * - `await Promise.resolve()` is a microtask (no real yield).
 * - MessageChannel fires a true macrotask at full scheduler speed,
 *   so the encoder runs at max CPU throughput on both active & background tabs.
 */
const schedulerChannel = new MessageChannel();

export function yieldToScheduler(): Promise<void> {
  return new Promise((resolve) => {
    schedulerChannel.port1.onmessage = () => resolve();
    schedulerChannel.port2.postMessage(null);
  });
}

/** Max frames allowed in the VideoEncoder queue before back-pressure kicks in. */
export const ENCODER_QUEUE_LIMIT = 20;

/**
 * Wait until the encoder queue drains below the limit.
 * Prevents OOM from too many queued VideoFrames.
 */
export async function waitEncoderQueue(getQueueSize: () => number): Promise<void> {
  while (getQueueSize() > ENCODER_QUEUE_LIMIT) {
    await yieldToScheduler();
  }
}
