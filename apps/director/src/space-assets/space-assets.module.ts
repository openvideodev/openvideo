import { Module } from "@nestjs/common";
import { SpaceAssetsService } from "./space-assets.service";
import { RagModule } from "../rag/rag.module";
import { TriggerModule } from "../trigger/trigger.module";

@Module({
  imports: [RagModule, TriggerModule],
  controllers: [],
  providers: [SpaceAssetsService],
  exports: [SpaceAssetsService],
})
export class SpaceAssetsModule {}
