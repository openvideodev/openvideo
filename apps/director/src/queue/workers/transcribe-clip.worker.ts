import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { TranscriberService } from "../../rag/transcript/transcriber.service";
import { ChunkerService } from "../../rag/transcript/chunker.service";
import { VectorStoreService } from "../../rag/vector-store.service";
// import { PrismaService } from '../../db/prisma.service';

@Processor("transcribe-clip")
export class TranscribeClipWorker extends WorkerHost {
  private readonly logger = new Logger(TranscribeClipWorker.name);

  constructor(
    private transcriber: TranscriberService,
    private chunker: ChunkerService,
    private vectorStore: VectorStoreService,
    // private prisma: PrismaService, // To cache transcript in DB
  ) {
    super();
  }

  async process(job: Job<{ projectId: string; clipId: string; src: string }>) {
    const { projectId, clipId, src } = job.data;
    this.logger.log(`Transcribing clip ${clipId} for project ${projectId}`);

    try {
      // 1. Transcribe
      const segments = await this.transcriber.transcribe(clipId, src);

      // Optionally cache to DB here
      // await this.prisma.clipTranscript.upsert({ ... });

      // 2. Chunk
      const chunkDocs = await this.chunker.chunk(projectId, segments);

      // 3. Store in Vector DB
      // Note: Ideally delete old vectors for this clipId first
      await this.vectorStore.upsert(chunkDocs);

      this.logger.log(`Successfully transcribed and chunked clip ${clipId}`);
    } catch (error) {
      this.logger.error(`Failed to transcribe clip ${clipId}`, error.stack);
      throw error;
    }
  }
}
