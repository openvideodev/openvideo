import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root.js";
import { createTRPCContext } from "./trpc.js";
import type { Auth } from "@openvideo/auth";

/**
 * Creates a Next.js App Router route handler for the tRPC API.
 *
 * Usage in `app/api/trpc/[trpc]/route.ts`:
 * ```ts
 * import { createTRPCRouteHandler } from "@openvideo/api/handler";
 * import { createAuth } from "@openvideo/auth";
 *
 * const auth = createAuth({ ... });
 * const handler = createTRPCRouteHandler(auth);
 * export { handler as GET, handler as POST };
 * ```
 */
export function createTRPCRouteHandler(auth: Auth) {
  return (req: Request) =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () => createTRPCContext({ auth, req }),
    });
}
