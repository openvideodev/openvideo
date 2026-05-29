import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Controller("project")
export class ProjectController {
  constructor(@InjectQueue("index-project") private indexQueue: Queue) {}

  /**
   * Called by the Editor UI when the user requests an AI edit but the project has structural changes.
   * This enqueues a background indexing job to sync the vector store.
   */
  @Post("sync")
  async syncProject(@Body() body: { projectId: string }) {
    const { projectId } = body;

    // Enqueue an indexing job
    await this.indexQueue.add("index", { projectId });

    return { status: "queued", projectId };
  }
}
