import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDB, asset, assetIndexingStatus } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import { ModalClient } from "modal";
import { GoogleGenAI } from "@google/genai";

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
        thumbnailSrc: z.string().optional(),
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
          thumbnailSrc: input.thumbnailSrc,
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

        // Trigger the actual indexing workflow using Modal SDK (non-blocking)
        console.log(`[DEBUG] Triggering Modal indexing for asset ${id} in space ${input.spaceId}`);
        try {
          const modal = new ModalClient();
          const indexAsset = await modal.functions.fromName("openvideo-indexer", "index_asset");
          // Fire-and-forget — do not await so the create response returns immediately
          indexAsset
            .remote([id])
            .then((result: any) => {
              console.log(`[DEBUG] Modal indexing triggered successfully via SDK:`, result);
            })
            .catch((triggerErr: any) => {
              console.error(
                `[DEBUG] Failed to trigger Modal indexing for asset ${id}:`,
                triggerErr,
              );
            });
        } catch (triggerErr) {
          console.error(`[DEBUG] Failed to set up Modal client for asset ${id}:`, triggerErr);
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

      // Trigger indexing via Modal SDK
      console.log(`[DEBUG] triggerIndex: Calling Modal SDK for asset ${input.id}`);
      try {
        const modal = new ModalClient();
        const indexAsset = await modal.functions.fromName("openvideo-indexer", "index_asset");
        const result = await indexAsset.remote([input.id]);
        console.log(`[DEBUG] triggerIndex: Modal indexing triggered successfully:`, result);
      } catch (err: any) {
        console.error(`[DEBUG] triggerIndex: Failed to start Modal indexing:`, err);
        throw err;
      }

      return { success: true, status: "queued" };
    }),

  /**
   * Semantic search over indexed asset vectors for a space.
   * Uses Gemini embeddings + pgvector cosine similarity.
   * Returns deduplicated assets ranked by best match score.
   */
  semanticSearch: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        query: z.string().min(1),
        limit: z.number().min(1).max(30).optional().default(15),
      }),
    )
    .query(async ({ ctx, input }) => {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");

      const ai = new GoogleGenAI({ apiKey });

      // Generate embedding for the search query
      const formattedQuery = `task: search result | query: ${input.query}`;
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: formattedQuery,
      });

      const embedding = embedResponse.embeddings?.[0]?.values;
      if (!embedding) throw new Error("Failed to generate embedding");

      const vectorStr = `[${embedding.join(",")}]`;

      // Similarity search via pgvector (cosine distance)
      const result = await db.execute(sql`
        SELECT
          cmetadata->>'assetId'    AS "assetId",
          cmetadata->>'assetName'  AS "assetName",
          cmetadata->>'assetType'  AS "assetType",
          cmetadata->>'src'        AS "src",
          cmetadata->>'layer'      AS "layer",
          (cmetadata->>'startMs')::bigint AS "startMs",
          (cmetadata->>'endMs')::bigint   AS "endMs",
          document                        AS "matchedText",
          (embedding <=> ${vectorStr}::vector) AS "distance"
        FROM langchain_pg_embedding
        WHERE cmetadata->>'spaceId' = ${input.spaceId}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${input.limit * 3}
      `);

      const rows = result.rows as unknown as Array<{
        assetId: string;
        assetName: string;
        assetType: string;
        src: string;
        layer: string;
        startMs: number | null;
        endMs: number | null;
        matchedText: string;
        distance: number;
      }>;

      // Deduplicate — keep the best (lowest distance) hit per assetId
      const seen = new Map<string, (typeof rows)[0]>();
      for (const row of rows) {
        if (!row.assetId) continue;
        const existing = seen.get(row.assetId);
        if (!existing || row.distance < existing.distance) {
          seen.set(row.assetId, row);
        }
      }

      const deduplicated = Array.from(seen.values())
        .sort((a, b) => a.distance - b.distance)
        .slice(0, input.limit);

      return deduplicated.map((r) => ({
        assetId: r.assetId,
        assetName: r.assetName,
        assetType: r.assetType as "video" | "audio" | "image",
        src: r.src,
        layer: r.layer,
        startMs: r.startMs ?? undefined,
        endMs: r.endMs ?? undefined,
        matchedText: r.matchedText,
        score: 1 - r.distance, // convert distance → similarity (0–1)
      }));
    }),
});
