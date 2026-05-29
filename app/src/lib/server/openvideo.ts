/**
 * Server-side OpenVideo SDK Client
 *
 * ⚠️ CRITICAL: This file should ONLY be used in server contexts:
 * - API Routes (app/api/*)
 * - Server Components
 * - Server Actions
 *
 * NEVER import this in client components or 'use client' files.
 */

import { OpenVideo } from "@openvideo/ai";

const apiKey = process.env.OPENVIDEO_KEY;
const baseURL = process.env.DIRECTOR_URL || "http://localhost:4000";

if (!apiKey) {
  throw new Error("OPENVIDEO_KEY environment variable is required");
}

/**
 * Singleton server-side OpenVideo client
 * The API key is securely stored server-side
 */
export const serverOpenVideo = new OpenVideo({
  apiKey,
  baseURL,
  timeout: 30000,
  retries: 3,
});

// Re-export types for convenience
export type * from "@openvideo/ai";
