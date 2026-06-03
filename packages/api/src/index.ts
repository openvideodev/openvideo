// Main exports
export { appRouter, type AppRouter } from "./root.js";
export {
  router,
  publicProcedure,
  protectedProcedure,
  createTRPCContext,
  type CreateContextOptions,
} from "./trpc.js";

// Re-export types from root for convenience
export type { RouterInputs, RouterOutputs } from "./root.js";
