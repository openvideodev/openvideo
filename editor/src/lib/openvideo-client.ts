/**
 * OpenVideo SDK Client for Editor
 *
 * Wraps @openvideo/sdk with editor-specific configuration
 * Keeps WebSocket (real-time) separate from HTTP API calls
 */

import type { OpenVideo as OpenVideoClass } from "@openvideo/sdk";
import { OpenVideo } from "@openvideo/sdk";

// Singleton client instance — proxy mode, routes through /api/openvideo
let client: OpenVideoClass | null = null;

export function getOpenVideoClient(): OpenVideoClass {
  if (!client) {
    client = new OpenVideo({
      // Explicitly use proxy mode for browser - routes through /api/openvideo
      mode: "proxy",
      proxyUrl: "/api/openvideo",
    });
  }
  return client;
}

// Reset client (useful for auth changes)
export function resetOpenVideoClient(): void {
  client = null;
}
