import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { getDB, schema } from "@openvideo/db";

// Get database instance
const db = getDB();

// Auth configuration factory - accepts email sending function
export interface AuthConfig {
  sendMagicLinkEmail: (props: { email: string; magicLink: string }) => Promise<void>;
  githubClientId?: string;
  githubClientSecret?: string;
}

// Type for the auth instance
// We use `any` here to avoid TS2742 "inferred type cannot be named" errors
// that arise from pnpm's internal node_modules structure for better-auth/zod.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Auth = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuth(config: AuthConfig): any {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    plugins: [
      magicLink({
        expiresIn: 60 * 60, // 1 hour
        sendMagicLink: async ({
          email,
          token,
          url,
        }: {
          email: string;
          token: string;
          url: string;
        }) => {
          const magicLinkUrl = `${url}?token=${token}`;
          console.log({ magicLinkUrl });
          await config.sendMagicLinkEmail({ email, magicLink: magicLinkUrl });
        },
      }),
    ],
    socialProviders:
      config.githubClientId && config.githubClientSecret
        ? {
            github: {
              clientId: config.githubClientId,
              clientSecret: config.githubClientSecret,
            },
          }
        : undefined,
    experimental: {
      joins: true,
    },
  });
}
