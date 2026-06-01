import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { getDB, apiToken } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import crypto from "crypto";

const db = getDB();
const TOKEN_PREFIX = "ov_live_";
const TOKEN_LENGTH = 24;

function generateRandomString(size: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  const randomValues = crypto.randomBytes(size);
  for (let i = 0; i < size; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export const tokenRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        scopes: z.array(z.string()).default(["all"]),
        expiresInDays: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const randomPart = generateRandomString(TOKEN_LENGTH);
      const fullToken = `${TOKEN_PREFIX}${randomPart}`;

      // Hash for security
      const tokenHash = crypto.createHash("sha256").update(fullToken).digest("hex");
      const tokenHint = `...${randomPart.slice(-4)}`;

      let expiresAt: Date | null = null;
      if (input.expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
      }

      const rows = await db
        .insert(apiToken)
        .values({
          id,
          tokenHash,
          tokenHint,
          userId: ctx.user.id,
          name: input.name || null,
          scopes: input.scopes.join(","),
          expiresAt,
        })
        .returning();

      return {
        id: rows[0].id,
        name: rows[0].name,
        tokenHint: rows[0].tokenHint,
        scopes: rows[0].scopes ? rows[0].scopes.split(",") : [],
        expiresAt: rows[0].expiresAt,
        createdAt: rows[0].createdAt,
        token: fullToken, // returned once
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: apiToken.id,
        name: apiToken.name,
        tokenHint: apiToken.tokenHint,
        scopes: apiToken.scopes,
        lastUsed: apiToken.lastUsed,
        expiresAt: apiToken.expiresAt,
        createdAt: apiToken.createdAt,
      })
      .from(apiToken)
      .where(
        and(
          eq(apiToken.userId, ctx.user.id),
          isNull(apiToken.expiresAt), // Only list non-expired
        ),
      )
      .orderBy(apiToken.createdAt);

    return rows.map((r) => ({
      ...r,
      scopes: r.scopes ? r.scopes.split(",") : [],
    }));
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .update(apiToken)
        .set({ name: input.name })
        .where(and(eq(apiToken.id, input.id), eq(apiToken.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Token not found or unauthorized");
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .delete(apiToken)
        .where(and(eq(apiToken.id, input.id), eq(apiToken.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Token not found or unauthorized");
      }
      return { success: true, id: input.id };
    }),
});
