import { Module } from "@nestjs/common";
import { IndexingService } from "./indexing.service";
import { RagModule } from "../rag/rag.module";
import { BullModule } from "@nestjs/bullmq";
import { TriggerModule } from "../trigger/trigger.module";

@Module({
  imports: [RagModule, TriggerModule, BullModule.registerQueue({ name: "index-project" })],
  controllers: [],
  providers: [IndexingService],
  exports: [IndexingService],
})
export class IndexingModule {}
