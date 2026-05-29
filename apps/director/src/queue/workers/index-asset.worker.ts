import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { AssetIndexerService } from "../../rag/asset-indexer.service";

@Processor("index-asset")
export class IndexAssetWorker extends WorkerHost {
  private readonly logger = new Logger(IndexAssetWorker.name);

  constructor(private indexer: AssetIndexerService) {
    super();
  }

  async process(job: Job<{ spaceId: string; assetId: string }>) {
    const { spaceId, assetId } = job.data;
    this.logger.log(`Processing index-asset job for asset ${assetId} in space ${spaceId}`);

    await this.indexer.indexAsset(spaceId, assetId);

    this.logger.log(`Completed index-asset job for asset ${assetId} in space ${spaceId}`);
  }
}
