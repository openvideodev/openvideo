/**
 * Director API configuration
 */

export const directorConfig = {
  baseUrl: process.env.NEXT_PUBLIC_DIRECTOR_URL || "http://localhost:4000",
  wsUrl: process.env.NEXT_PUBLIC_DIRECTOR_WS_URL || "ws://localhost:4000",
  token: process.env.NEXT_PUBLIC_OPENVIDEO_TOKEN || "",

  getAuthQuery(): Record<string, string> {
    return {};
  },
};
