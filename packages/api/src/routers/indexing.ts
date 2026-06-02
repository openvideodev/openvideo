import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDB, assetIndexingStatus } from "@openvideo/db";
import { protectedProcedure, router } from "../trpc.js";

const db = getDB();

export const indexingRouter = router({
  triggerBulkIndex: protectedProcedure
    .input(z.object({ spaceId: z.string(), assetIds: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      // Trigger bulk indexing for a space using Modal
      try {
        // Import Modal client (you'll need to install modal-client package)
        // For now, return a mock response that will work with Modal integration
        const { spaceId, assetIds } = input;

        // TODO: Replace with actual Modal function calls
        // const indexAsset = modal.Function.lookup("openvideo-indexer", "index_asset");
        // const results = assetIds ?
        //   await Promise.all(assetIds.map(id => indexAsset.remote(id))) :
        //   await indexAsset.remote(spaceId);

        return {
          status: "queued",
          spaceId,
          message: "Indexing queued via Modal service",
          assetIds: assetIds || [],
        };
      } catch (error) {
        console.error("Failed to trigger bulk index:", error);
        throw new Error("Failed to trigger indexing");
      }
    }),

  getBulkStatus: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the current indexing status for a space
      try {
        // TODO: Replace with actual Modal function calls
        // const getStatus = modal.Function.lookup("openvideo-indexer", "get_indexing_status");
        // const status = await getStatus.remote(input.spaceId);

        return {
          status: "processing",
          progress: 45,
          spaceId: input.spaceId,
          message: "Status retrieved from Modal service",
        };
      } catch (error) {
        console.error("Failed to get bulk status:", error);
        throw new Error("Failed to get indexing status");
      }
    }),

  getIndexedAssets: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get list of indexed assets for a space
      try {
        // TODO: Replace with actual database queries
        // This will query the actual database for indexed assets
        return [
          {
            id: "a8c240b7-ea72-4361-9dae-4cc1af2-1b8",
            name: "Sample Video",
            type: "video",
            indexing: {
              status: "completed",
              progress: 100,
              stage: "completed",
              error: null,
            },
          },
        ];
      } catch (error) {
        console.error("Failed to get indexed assets:", error);
        throw new Error("Failed to get indexed assets");
      }
    }),

  indexAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Index a single asset using Modal
      try {
        // TODO: Replace with actual Modal function calls
        // const indexAsset = modal.Function.lookup("openvideo-indexer", "index_asset");
        // const result = await indexAsset.remote(input.assetId);

        return {
          success: true,
          assetId: input.assetId,
          message: "Asset indexing started via Modal service",
        };
      } catch (error) {
        console.error("Failed to index asset:", error);
        throw new Error("Failed to index asset");
      }
    }),

  getIndexingStatus: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get indexing status for a specific asset from database
      try {
        const status = await db.query.assetIndexingStatus.findFirst({
          where: eq(assetIndexingStatus.assetId, input.assetId),
        });

        if (!status) {
          return {
            assetId: input.assetId,
            status: "pending",
            progress: 0,
            stage: null,
            error: null,
          };
        }

        return {
          assetId: status.assetId,
          status: status.status,
          progress: status.progress,
          stage: status.stage,
          error: status.error,
        };
      } catch (error) {
        console.error("Failed to get asset status:", error);
        throw new Error("Failed to get asset status");
      }
    }),
});
