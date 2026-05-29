import { Module } from "@nestjs/common";
import { IndexingController } from "./indexing.controller";
import { IndexingService } from "./indexing.service";
import { DbModule } from "../db/db.module";
import { RagModule } from "../rag/rag.module";
import { BullModule } from "@nestjs/bullmq";
import { TriggerModule } from "../trigger/trigger.module";

@Module({
  imports: [
    DbModule,
    RagModule,
    TriggerModule,
    BullModule.registerQueue({ name: "index-project" }),
  ],
  controllers: [IndexingController],
  providers: [IndexingService],
  exports: [IndexingService],
})
export class IndexingModule {}
