import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "./db";
import { Resend } from "resend";
import { sendMagicLinkEmail } from "../../email/magic-link";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Map Better Auth's default snake_case fields to our camelCase columns
  user: {
    fields: {
      emailVerified: "emailVerified",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  session: {
    fields: {
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      userId: "userId",
    },
  },
  account: {
    fields: {
      accountId: "accountId",
      providerId: "providerId",
      userId: "userId",
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      idToken: "idToken",
      accessTokenExpiresAt: "accessTokenExpiresAt",
      refreshTokenExpiresAt: "refreshTokenExpiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  verification: {
    fields: {
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 60,
      sendMagicLink: async ({ email, token, url }) => {
        const magicLink = `${url}?token=${token}`;
        console.log(magicLink);
        await resend.emails.send({
          from: `"Login" <account@openvideo.dev>`,
          to: email,
          subject: "Your login request to OpenVideo",
          react: sendMagicLinkEmail({ email, magicLink }),
        });
      },
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  // Note: joins disabled to avoid snake_case column name issues
  // experimental: {
  //   joins: true,
  // },
});
