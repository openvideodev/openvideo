import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbedderService } from './embedder.service';
import { VectorStoreService } from './vector-store.service';
import { RetrieverService } from './retriever.service';
import { ProjectIndexerService } from './project-indexer.service';
import { TranscriberService } from './transcript/transcriber.service';
import { ChunkerService } from './transcript/chunker.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'transcribe-clip' }),
  ],
  providers: [
    EmbedderService,
    VectorStoreService,
    RetrieverService,
    ProjectIndexerService,
    TranscriberService,
    ChunkerService,
  ],
  exports: [
    VectorStoreService,
    RetrieverService,
    ProjectIndexerService,
    TranscriberService,
    ChunkerService,
  ],
})
export class RagModule {}
