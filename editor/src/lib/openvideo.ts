/**
 * Universal OpenVideo SDK Client
 *
 * Works seamlessly in both browser and server:
 * - Browser: Auto-routes to POST /openvideo (no API key needed)
 * - Server: Direct API calls with API key (from env)
 *
 * Usage:
 *   import { getOpenVideo } from '@/lib/openvideo';
 *   const ov = getOpenVideo(); // That's it!
 *   const spaces = await ov.spaces.list();
 */

import { OpenVideo } from "@openvideo/sdk";
import type { Space, Asset } from "@openvideo/sdk";

// Singleton instance for client-side
let client: OpenVideo | null = null;

/**
 * Get OpenVideo SDK client
 *
 * In browser: Automatically uses proxy mode (POST /openvideo)
 * In server: Uses direct mode with API key from env
 */
export function getOpenVideo(): OpenVideo {
  if (!client) {
    // SDK auto-detects browser vs server
    // Browser: routes to /openvideo proxy
    // Server: needs apiKey (should be set in env)
    client = new OpenVideo({
      // In browser: no config needed, uses /openvideo
      // In server: set OPENVIDEO_KEY in env
    });

    console.log(`[OpenVideo] Mode: ${client.getMode()}`);
  }

  return client;
}

/**
 * Reset client (useful for testing or auth changes)
 */
export function resetOpenVideo(): void {
  client = null;
}

// Re-export types
export type { Space, Asset } from "@openvideo/sdk";
