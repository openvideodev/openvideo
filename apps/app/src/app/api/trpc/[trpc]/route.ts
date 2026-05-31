import { createTRPCRouteHandler } from "@openvideo/api/handler";
import { createAuth } from "@openvideo/auth";
import { Resend } from "resend";
import { sendMagicLinkEmail } from "../../../../email/magic-link";

// Initialize auth with email config
const resend = new Resend(process.env.RESEND_API_KEY || "re_123");

const auth = createAuth({
  async sendMagicLinkEmail({ email, magicLink }: { email: string; magicLink: string }) {
    await resend.emails.send({
      from: `"Login" <account@designcombo.dev>`,
      to: email,
      subject: "Your login request to OpenVideo",
      react: sendMagicLinkEmail({ email, magicLink }),
    });
  },
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});

const handler = createTRPCRouteHandler(auth);

export { handler as GET, handler as POST };
