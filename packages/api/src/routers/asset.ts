import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDB, asset, assetIndexingStatus } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import { ModalClient } from "modal";

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

        // Trigger the actual indexing workflow using Modal
        console.log(`[DEBUG] Triggering Modal indexing for asset ${id} in space ${input.spaceId}`);
        try {
          // Call Modal function using JS SDK
          console.log(`[DEBUG] Calling Modal function for asset ${id}`);

          const modal = new ModalClient();
          const indexAsset = await modal.functions.fromName("openvideo-indexer", "index_asset");

          // Call the function - Modal spawns it and returns handle immediately
          const result = await indexAsset.remote([id]);
          console.log(`[DEBUG] Modal indexing triggered successfully:`, result);
        } catch (triggerErr) {
          console.error(`[DEBUG] Failed to trigger Modal indexing for asset ${id}:`, triggerErr);
          console.error(
            `[DEBUG] Error stack:`,
            triggerErr instanceof Error ? triggerErr.stack : "N/A",
          );
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

      // Actually trigger the Modal indexing
      console.log(`[DEBUG] triggerIndex: Starting Modal indexing for asset ${input.id}`);
      try {
        // Call Modal function using HTTP API
        console.log(`[DEBUG] triggerIndex: Making Modal API call for asset ${input.id}`);
        const requestBody = JSON.stringify({ args: [input.id] });
        console.log(`[DEBUG] triggerIndex: Request body:`, requestBody);

        const response = await fetch(
          "https://api.modal.com/v1/functions/openvideo-indexer/index_asset/calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.MODAL_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: requestBody,
          },
        );

        console.log(
          `[DEBUG] triggerIndex: Modal API response status: ${response.status} ${response.statusText}`,
        );
        console.log(
          `[DEBUG] triggerIndex: Modal API response headers:`,
          Object.fromEntries(response.headers.entries()),
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[DEBUG] triggerIndex: Modal API error response:`, errorText);
          throw new Error(
            `Modal function call failed: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const responseText = await response.text();
        console.log(`[DEBUG] triggerIndex: Modal API raw response:`, responseText);

        if (!responseText.trim()) {
          console.error(`[DEBUG] triggerIndex: Modal API returned empty response`);
          throw new Error("Modal API returned empty response");
        }

        let result;
        try {
          result = JSON.parse(responseText);
          console.log(`[DEBUG] triggerIndex: Modal indexing started successfully:`, result);
        } catch (parseErr) {
          console.error(
            `[DEBUG] triggerIndex: Failed to parse Modal API response as JSON:`,
            parseErr,
          );
          console.error(`[DEBUG] triggerIndex: Response text that failed to parse:`, responseText);
          throw new Error(`Invalid JSON response from Modal: ${responseText}`);
        }
      } catch (err: any) {
        console.error(`[DEBUG] triggerIndex: Failed to start Modal indexing:`, err);
        console.error(`[DEBUG] triggerIndex: Error stack:`, err.stack);
        throw err;
      }

      return { success: true, status: "queued" };
    }),
});
