// Common utility functions that can run in both worker and main threads

import { Log } from './log';
import { workerTimer } from './worker-timer';

if (import.meta.env?.DEV) {
  Log.setLogLevel(Log.debug);
}

if (import.meta.env?.MODE === 'test') {
  Log.setLogLevel(Log.warn);
}

/**
 * Pause the current execution environment for a period of time.
 * @param time - Pause duration in milliseconds.
 * @example
 * await sleep(1000);  // Pause for 1 second
 */
export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => {
    const stop = workerTimer(() => {
      stop();
      resolve();
    }, time);
  });
}
