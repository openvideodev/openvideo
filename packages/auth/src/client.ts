import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";

// We declare the type as `any` to avoid TS2742 "inferred type cannot be named"
// errors that arise from pnpm's nested node_modules paths for better-auth/zod.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: any = createAuthClient({
  plugins: [magicLinkClient()],
});

// Types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthClient = any;

// Re-export for convenience
export { createAuthClient, magicLinkClient };
