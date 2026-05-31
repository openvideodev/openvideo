import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "./db";
import { Resend } from "resend";
import { sendMagicLinkEmail } from "../../email/magic-link";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123");

console.log(
  "[AUTH] Auth module initialized, RESEND_API_KEY present:",
  !!process.env.RESEND_API_KEY,
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    magicLink({
      expiresIn: 60 * 60,
      sendMagicLink: async ({ email, token, url }) => {
        const magicLink = `${url}?token=${token}`;
        console.log("[AUTH] sendMagicLink called:", { email, tokenLength: token?.length, url });
        console.log("[AUTH] Generated magicLink URL:", magicLink);

        try {
          console.log("[AUTH] Calling Resend API with:", {
            from: "account@designcombo.dev",
            to: email,
            subject: "Your login request to Scenify",
          });

          const result = await resend.emails.send({
            from: `"Login" <account@designcombo.dev>`,
            to: email,
            subject: "Your login request to Scenify",
            react: sendMagicLinkEmail({ email, magicLink }),
          });

          console.log("[AUTH] Resend API success:", result);
        } catch (error) {
          console.error("[AUTH] Resend API error:", error);
          throw error;
        }
      },
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  experimental: {
    joins: true,
  },
});
