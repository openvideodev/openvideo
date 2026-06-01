import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDB, asset, assetIndexingStatus } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";

const db = getDB();

async function startWorkflow(workflow: string, payload: any): Promise<any> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = `${appUrl}/api/workflows/start`;

  console.log(`[DEBUG] Starting workflow: ${workflow}`, { payload, url });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workflow, payload }),
  });

  console.log(`[DEBUG] Workflow start response: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[DEBUG] Workflow start failed: ${response.status} - ${errorText}`);
    throw new Error(`Workflow start failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[DEBUG] Workflow started successfully:`, result);
  return result;
}

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

        // Trigger the actual indexing workflow
        console.log(
          `[DEBUG] Triggering index-asset workflow for asset ${id} in space ${input.spaceId}`,
        );
        try {
          const result = await startWorkflow("index-asset", {
            spaceId: input.spaceId,
            assetId: id,
          });
          console.log(`[DEBUG] index-asset workflow triggered successfully:`, result);
        } catch (triggerErr) {
          console.error(`[DEBUG] Failed to trigger indexing workflow for asset ${id}:`, triggerErr);
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

      // Actually trigger the workflow
      console.log(`[DEBUG] triggerIndex: Starting index-asset workflow for asset ${input.id}`);
      try {
        const result = await startWorkflow("index-asset", {
          spaceId: input.spaceId,
          assetId: input.id,
        });
        console.log(`[DEBUG] triggerIndex: Workflow started successfully:`, result);
      } catch (err) {
        console.error(`[DEBUG] triggerIndex: Failed to start workflow:`, err);
        throw err;
      }

      return { success: true, status: "queued" };
    }),
});
