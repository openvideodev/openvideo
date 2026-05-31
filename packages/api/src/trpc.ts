import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Auth, SessionValidationResult } from "@openvideo/auth";

/**
 * tRPC Context - passed to all resolvers
 */
export interface CreateContextOptions {
  auth: Auth;
  session: SessionValidationResult;
  req?: Request;
}

/**
 * Initialize tRPC with superjson for serialization
 */
const t = initTRPC.context<CreateContextOptions>().create({
  transformer: superjson,
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

/**
 * Reusable middleware that enforces users are logged in before running the procedure
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session.user || !ctx.session.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      // Infers that `session` and `user` are non-nullable
      session: ctx.session.session,
      user: ctx.session.user,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/**
 * Create context function - use this in your tRPC handler
 */
export async function createTRPCContext(opts: {
  auth: Auth;
  req: Request;
}): Promise<CreateContextOptions> {
  const { getSessionFromRequest } = await import("@openvideo/auth");
  const session = await getSessionFromRequest(opts.auth, opts.req);
  return {
    auth: opts.auth,
    session,
    req: opts.req,
  };
}
