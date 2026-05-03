import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import { ServerCore } from './server-core';
import { IProject } from '@openvideo/core';

@Injectable()
export class CoreRegistryService {
  private cores = new Map<string, ServerCore>();
  private readonly logger = new Logger(CoreRegistryService.name);

  constructor(private db: DrizzleService) {}

  async get(projectId: string): Promise<ServerCore> {
    if (this.cores.has(projectId)) {
      return this.cores.get(projectId)!;
    }

    this.logger.log(`Loading project ${projectId} from database into memory`);
    const snapshot = await this.db.loadProjectSnapshot(projectId);

    const core = new ServerCore(snapshot || undefined);
    this.cores.set(projectId, core);

    return core;
  }

  async persist(projectId: string): Promise<void> {
    const core = this.cores.get(projectId);
    if (!core) {
      this.logger.warn(`Cannot persist project ${projectId}: not found in memory`);
      return;
    }

    const snapshot = core.getSnapshot();
    await this.db.saveProjectSnapshot(projectId, snapshot);
    this.logger.log(`Persisted project ${projectId} snapshot to database`);
  }

  unload(projectId: string) {
    const core = this.cores.get(projectId);
    if (core) {
      core.destroy();
      this.cores.delete(projectId);
      this.logger.log(`Unloaded project ${projectId} from memory`);
    }
  }
}
