import { getDB, schema, eq } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { ServerCore } from "./server-core";
import { IProject } from "@openvideo/core";

@Injectable()
export class CoreRegistryService {
  private cores = new Map<string, ServerCore>();
  private readonly logger = new Logger(CoreRegistryService.name);

  async get(projectId: string): Promise<ServerCore> {
    if (this.cores.has(projectId)) {
      return this.cores.get(projectId)!;
    }

    this.logger.log(`Loading space ${projectId} from database into memory`);

    const [spaceRow] = await db
      .select()
      .from(schema.space)
      .where(eq(schema.space.id, projectId))
      .limit(1);

    let initialState: any = null;

    if (spaceRow) {
      // Prefer the scene field (unified schema), fall back to data field for legacy records
      if (spaceRow.scene && (spaceRow.scene as any).tracks) {
        initialState = spaceRow.scene;
      } else if (spaceRow.data && (spaceRow.data as any).tracks) {
        initialState = spaceRow.data;
      } else {
        initialState = {
          settings: {
            width: spaceRow.width,
            height: spaceRow.height,
            fps: spaceRow.fps,
            duration: 30_000_000,
          },
          tracks: [],
          clips: {},
        };
      }
    }

    const core = new ServerCore(initialState || undefined);
    this.cores.set(projectId, core);

    return core;
  }

  async persist(projectId: string): Promise<void> {
    const core = this.cores.get(projectId);
    if (!core) {
      this.logger.warn(`Cannot persist space ${projectId}: not found in memory`);
      return;
    }

    const snapshot = core.getSnapshot();

    await db
      .update(schema.space)
      .set({ scene: snapshot, updatedAt: new Date() })
      .where(eq(schema.space.id, projectId));

    this.logger.log(`Persisted space ${projectId} snapshot to database`);
  }

  unload(projectId: string) {
    const core = this.cores.get(projectId);
    if (core) {
      core.destroy();
      this.cores.delete(projectId);
      this.logger.log(`Unloaded space ${projectId} from memory`);
    }
  }
}
