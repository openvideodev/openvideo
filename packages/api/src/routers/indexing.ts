import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";

export const indexingRouter = router({
  triggerBulkIndex: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Trigger bulk indexing for a space
      return { status: "queued", spaceId: input.spaceId };
    }),

  getBulkStatus: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the current indexing status for a space
      return { status: "idle", progress: 0 };
    }),

  getIndexedAssets: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get list of indexed assets for a space
      return [];
    }),
});
