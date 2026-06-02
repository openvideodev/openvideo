import { router } from "./trpc.js";
import { spaceRouter } from "./routers/space.js";
import { assetRouter } from "./routers/asset.js";
import { chatRouter } from "./routers/chat.js";
import { indexingRouter } from "./routers/indexing.js";
import { tokenRouter } from "./routers/token.js";
import { sessionRouter } from "./routers/session.js";
import { mediaRouter } from "./routers/media.js";

/**
 * Main application router
 * Add routers here as you build them
 */
export const appRouter = router({
  space: spaceRouter,
  asset: assetRouter,
  chat: chatRouter,
  indexing: indexingRouter,
  token: tokenRouter,
  session: sessionRouter,
  media: mediaRouter,
});

// Export type definition for the API
export type AppRouter = typeof appRouter;
