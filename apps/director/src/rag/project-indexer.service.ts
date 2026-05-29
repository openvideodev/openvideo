import { Injectable, Logger } from "@nestjs/common";
import { IProject, AnyClip, ITrack } from "@openvideo/core";
import { Document } from "@langchain/core/documents";
import { VectorStoreService } from "./vector-store.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class ProjectIndexerService {
  private readonly logger = new Logger(ProjectIndexerService.name);

  constructor(
    private vectorStore: VectorStoreService,
    @InjectQueue("transcribe-clip") private transcribeQueue: Queue,
  ) {}

  /**
   * Indexes a project snapshot in two passes:
   * 1. Structural metadata (synchronous, fast)
   * 2. Transcript chunks (asynchronous via queue)
   */
  async indexProject(projectId: string, snapshot: IProject): Promise<void> {
    this.logger.log(`Starting indexing for project ${projectId}`);

    // Pass 1: Structural metadata
    await this.vectorStore.deleteByProjectId(projectId, "metadata");
    const structuralDocs = this.buildStructuralDocs(projectId, snapshot);
    await this.vectorStore.upsert(structuralDocs);

    // Pass 2: Enqueue transcript jobs for all media clips
    for (const clip of Object.values(snapshot.clips)) {
      if (clip.type === "Video" || clip.type === "Audio") {
        const mediaClip = clip as any; // as IVideoClip or IAudioClip
        if (mediaClip.src) {
          await this.transcribeQueue.add("transcribe-clip", {
            projectId,
            clipId: clip.id,
            src: mediaClip.src,
          });
        }
      }
    }
  }

  private buildStructuralDocs(projectId: string, snapshot: IProject): Document[] {
    const docs: Document[] = [];

    // Tracks
    snapshot.tracks.forEach((track) => {
      docs.push(
        new Document({
          pageContent: `Track '${track.name}': contains clips [${track.clipIds.join(", ")}]`,
          metadata: { projectId, entityType: "Track", entityId: track.id, layer: "metadata" },
        }),
      );
    });

    // Clips
    Object.values(snapshot.clips).forEach((clip) => {
      const from = clip.timing?.display?.from ?? 0;
      const to = clip.timing?.display?.to ?? 0;
      let content = `${clip.type} clip '${clip.name || clip.id}': starts at ${from}ms, ends at ${to}ms.`;

      if (clip.type === "Text") {
        content += ` Text content: "${(clip as any).text}".`;
      } else if (clip.type === "Caption") {
        content += ` Caption content: "${(clip as any).text}".`;
      } else if (clip.type === "Effect") {
        content += ` Effect type: ${(clip as any).effect?.name}.`;
      }

      docs.push(
        new Document({
          pageContent: content,
          metadata: { projectId, entityType: clip.type, entityId: clip.id, layer: "metadata" },
        }),
      );
    });

    return docs;
  }
}
