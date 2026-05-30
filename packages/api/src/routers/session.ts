import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.JWT_SECRET || "dev-secret-change-in-production",
);

export const sessionRouter = router({
  // Get token for Director WebSocket connection
  getToken: protectedProcedure
    .input(z.object({ spaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Generate JWT for WebSocket connection (same secret as Director)
      const token = await new SignJWT({
        sub: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        spaceId: input.spaceId,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      return { token };
    }),
});
