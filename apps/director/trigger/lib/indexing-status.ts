import { getDb, schema, eq } from "./db";

export type IndexingStage = "downloading" | "transcribing" | "analyzing" | "embedding" | "storing";

export async function markStarted(assetId: string, jobId: string): Promise<void> {
  await getDb()
    .update(schema.assetIndexingStatus)
    .set({ status: "processing", jobId, startedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}

export async function updateProgress(
  assetId: string,
  progress: number,
  stage?: IndexingStage,
): Promise<void> {
  const updates: any = { progress, updatedAt: new Date() };
  if (stage) updates.stage = stage;
  await getDb()
    .update(schema.assetIndexingStatus)
    .set(updates)
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}

export async function markCompleted(assetId: string): Promise<void> {
  await getDb()
    .update(schema.assetIndexingStatus)
    .set({ status: "completed", progress: 100, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}

export async function markFailed(assetId: string, error: string): Promise<void> {
  await getDb()
    .update(schema.assetIndexingStatus)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}
