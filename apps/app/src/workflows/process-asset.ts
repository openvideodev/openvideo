"use workflow";

import { sleep } from "workflow";
import { getDB, asset, assetIndexingStatus, eq } from "@openvideo/db";
import { ModalClient } from "modal";

const db = getDB();
const CONFORM_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const INDEX_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 1000; // 1 second for faster detection

interface ProcessAssetInput {
  assetId: string;
  spaceId: string;
  userId: string;
}

/**
 * Step: Update processing status in DB
 */
async function updateProcessingStatusStep(
  assetId: string,
  status: "pending" | "conforming" | "indexing" | "completed" | "failed",
) {
  "use step";
  await db
    .update(assetIndexingStatus)
    .set({
      processingStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(assetIndexingStatus.assetId, assetId));
  console.log(`[Workflow] Asset ${assetId} status: ${status}`);
}

/**
 * Step: Get asset metadata from DB
 */
async function getAssetMetadataStep(assetId: string) {
  "use step";
  const assetData = await db.query.asset.findFirst({
    where: eq(asset.id, assetId),
    with: {
      indexingStatus: true,
    },
  });
  return assetData;
}

/**
 * Step: Trigger conform via Modal
 */
async function triggerConformStep(assetId: string, spaceId: string) {
  "use step";
  console.log(`[Workflow] Triggering conform for asset ${assetId} at ${new Date().toISOString()}`);
  const modal = new ModalClient();
  const conformAsset = await modal.functions.fromName("openvideo-processor", "conform_asset");
  await conformAsset.remote([assetId, 60]);
  console.log(
    `[Workflow] Conform Modal call returned for asset ${assetId} at ${new Date().toISOString()}`,
  );
}

/**
 * Step: Trigger indexing via Modal
 */
async function triggerIndexStep(assetId: string, spaceId: string) {
  "use step";
  console.log(`[Workflow] Triggering index for asset ${assetId}`);
  const modal = new ModalClient();
  const indexAsset = await modal.functions.fromName("openvideo-processor", "index_asset");
  await indexAsset.remote([assetId]);
  console.log(`[Workflow] Index triggered for asset ${assetId}`);
}

/**
 * Wait for conform completion by polling
 * Note: originalSrc must be captured BEFORE calling triggerConformStep since Modal call is synchronous
 */
async function waitForConformCompletion(assetId: string, originalSrc: string, timeoutMs: number) {
  const startTime = Date.now();
  console.log(`[Workflow] Waiting for conform, original src: ${originalSrc.slice(0, 50)}...`);

  let pollCount = 0;
  while (Date.now() - startTime < timeoutMs) {
    pollCount++;
    // Poll until src changes or timeout
    await sleep(`${POLL_INTERVAL_MS}ms`);

    const updatedAsset = await getAssetMetadataStep(assetId);
    console.log(
      `[Workflow] Poll #${pollCount}: src=${updatedAsset?.src?.slice(0, 50)}, status=${updatedAsset?.indexingStatus?.status}`,
    );

    if (updatedAsset && updatedAsset.src !== originalSrc) {
      console.log(
        `[Workflow] Conform completed for asset ${assetId}, src changed from ${originalSrc.slice(0, 50)} to ${updatedAsset.src.slice(0, 50)}`,
      );
      return true;
    }

    // Check if failed
    if (updatedAsset?.indexingStatus?.status === "failed") {
      throw new Error(`Conform failed for asset ${assetId}`);
    }
  }

  throw new Error(`Conform timeout for asset ${assetId}`);
}

/**
 * Wait for indexing completion by polling
 */
async function waitForIndexCompletion(assetId: string, timeoutMs: number) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const assetData = await getAssetMetadataStep(assetId);

    if (!assetData) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const status = assetData.indexingStatus?.status;

    if (status === "completed") {
      console.log(`[Workflow] Index completed for asset ${assetId}`);
      return true;
    }

    if (status === "failed") {
      throw new Error(`Index failed for asset ${assetId}: ${assetData.indexingStatus?.error}`);
    }

    await sleep(`${POLL_INTERVAL_MS}ms`);
  }

  throw new Error(`Index timeout for asset ${assetId}`);
}

/**
 * Main workflow: Process asset (conform if needed, then index)
 */
export async function processAssetWorkflow(input: ProcessAssetInput) {
  "use workflow";

  const { assetId, spaceId } = input;

  try {
    // Get asset metadata
    const assetData = await getAssetMetadataStep(assetId);

    if (!assetData) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Only videos need processing
    if (assetData.type !== "video") {
      console.log(`[Workflow] Asset ${assetId} is not video, skipping`);
      await updateProcessingStatusStep(assetId, "completed");
      return { success: true, assetId, wasProcessed: false };
    }

    // Check if conform is needed (fps > 60)
    const needsConform = assetData.fps && assetData.fps > 60;

    if (needsConform) {
      // Step 1: Conform
      // Capture original src BEFORE triggering conform (Modal call is synchronous)
      const originalSrc = assetData.src;
      console.log(`[Workflow] Captured original src before conform: ${originalSrc.slice(0, 50)}`);

      await updateProcessingStatusStep(assetId, "conforming");
      await triggerConformStep(assetId, spaceId);
      await waitForConformCompletion(assetId, originalSrc, CONFORM_TIMEOUT_MS);
    }

    // Step 2: Index (Modal indexer has fallback to originalSrc if conformed URL fails)
    await updateProcessingStatusStep(assetId, "indexing");
    let indexAttempts = 0;
    const maxIndexAttempts = 3;
    while (indexAttempts < maxIndexAttempts) {
      try {
        indexAttempts++;
        console.log(
          `[Workflow] Index attempt ${indexAttempts}/${maxIndexAttempts} for asset ${assetId}`,
        );
        await triggerIndexStep(assetId, spaceId);
        break; // Success, exit retry loop
      } catch (err: any) {
        console.error(`[Workflow] Index attempt ${indexAttempts} failed:`, err.message);
        if (indexAttempts >= maxIndexAttempts) {
          throw new Error(`Index failed after ${maxIndexAttempts} attempts: ${err.message}`);
        }
        // Wait before retry (exponential backoff)
        const backoffMs = Math.pow(2, indexAttempts) * 5000; // 10s, 20s
        console.log(`[Workflow] Retrying index in ${backoffMs}ms...`);
        await sleep(`${backoffMs}ms`);
      }
    }
    await waitForIndexCompletion(assetId, INDEX_TIMEOUT_MS);

    // Mark as completed
    await updateProcessingStatusStep(assetId, "completed");

    return {
      success: true,
      assetId,
      wasProcessed: true,
      wasConformed: needsConform,
    };
  } catch (error: any) {
    console.error(`[Workflow] Failed to process asset ${assetId}:`, error);
    await updateProcessingStatusStep(assetId, "failed");
    throw error;
  }
}
