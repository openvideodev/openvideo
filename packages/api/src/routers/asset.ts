import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDB, asset, assetIndexingStatus } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import { tasks } from "@trigger.dev/sdk/v3";

const db = getDB();

export const assetRouter = router({
  // Create an asset (and optionally set to pending for indexing)
  create: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        name: z.string(),
        type: z.enum(["image", "video", "audio", "other"]).catch("other"),
        src: z.string(),
        duration: z.number().optional(),
        size: z.number().optional(),
        autoIndex: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();

      const newAsset = await db
        .insert(asset)
        .values({
          id,
          spaceId: input.spaceId,
          name: input.name,
          type: input.type,
          src: input.src,
          duration: input.duration,
          size: input.size,
          userId: ctx.user.id,
        })
        .returning();

      if (input.autoIndex) {
        await db
          .insert(assetIndexingStatus)
          .values({
            id: crypto.randomUUID(),
            assetId: id,
            spaceId: input.spaceId,
            status: "pending",
          })
          .onConflictDoNothing();

        // Trigger the actual indexing task
        try {
          await tasks.trigger("index-asset", { spaceId: input.spaceId, assetId: id });
        } catch (triggerErr) {
          console.error("Failed to trigger indexing task:", triggerErr);
        }
      }

      return newAsset[0];
    }),

  // List all assets in a space
  list: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await db.query.asset.findMany({
        where: and(eq(asset.spaceId, input.spaceId), eq(asset.userId, ctx.user.id)),
        orderBy: desc(asset.createdAt),
        with: {
          indexingStatus: true,
        },
      });
      return rows;
    }),

  // Get single asset
  getById: protectedProcedure
    .input(z.object({ id: z.string(), spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await db.query.asset.findFirst({
        where: and(
          eq(asset.id, input.id),
          eq(asset.spaceId, input.spaceId),
          eq(asset.userId, ctx.user.id),
        ),
        with: {
          indexingStatus: true,
          transcript: true,
          visualTimeline: true,
        },
      });
      if (!row) throw new Error("Asset not found");
      return row;
    }),

  // Delete an asset
  delete: protectedProcedure
    .input(z.object({ id: z.string(), spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await db
        .delete(asset)
        .where(
          and(
            eq(asset.id, input.id),
            eq(asset.spaceId, input.spaceId),
            eq(asset.userId, ctx.user.id),
          ),
        )
        .returning();
      if (row.length === 0) throw new Error("Asset not found or unauthorized");
      return { success: true };
    }),

  // Trigger re-indexing (sets status back to pending for worker to pick up)
  triggerIndex: protectedProcedure
    .input(z.object({ id: z.string(), spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure asset exists and belongs to user
      const exists = await db.query.asset.findFirst({
        where: and(
          eq(asset.id, input.id),
          eq(asset.spaceId, input.spaceId),
          eq(asset.userId, ctx.user.id),
        ),
      });

      if (!exists) throw new Error("Asset not found");

      await db
        .insert(assetIndexingStatus)
        .values({
          id: crypto.randomUUID(),
          assetId: input.id,
          spaceId: input.spaceId,
          status: "pending",
        })
        .onConflictDoUpdate({
          target: [assetIndexingStatus.assetId],
          set: {
            status: "pending",
            updatedAt: new Date(),
          },
        });

      return { success: true, status: "queued" };
    }),
});
