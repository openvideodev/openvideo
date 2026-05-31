// Main exports
export { createAuth, type Auth, type AuthConfig } from "./server.js";
export { authClient, type AuthClient } from "./client.js";
export {
  getSessionFromRequest,
  isAuthenticated,
  requireAuth,
  type SessionValidationResult,
} from "./session.js";
