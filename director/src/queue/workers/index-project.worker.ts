import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { ProjectIndexerService } from "../../rag/project-indexer.service";
import { CoreRegistryService } from "../../core/core-registry.service";

@Processor("index-project")
export class IndexProjectWorker extends WorkerHost {
  private readonly logger = new Logger(IndexProjectWorker.name);

  constructor(
    private indexer: ProjectIndexerService,
    private coreRegistry: CoreRegistryService,
  ) {
    super();
  }

  async process(job: Job<{ projectId: string }>) {
    const { projectId } = job.data;
    this.logger.log(`Processing index-project job for ${projectId}`);

    const core = await this.coreRegistry.get(projectId);
    const snapshot = core.getSnapshot();

    await this.indexer.indexProject(projectId, snapshot);

    this.logger.log(`Completed index-project job for ${projectId}`);
  }
}
