import { Module } from "@nestjs/common";
import { SpaceAssetsController } from "./space-assets.controller";
import { SpaceAssetsService } from "./space-assets.service";
import { DbModule } from "../db/db.module";
import { RagModule } from "../rag/rag.module";
import { TriggerModule } from "../trigger/trigger.module";

@Module({
  imports: [DbModule, RagModule, TriggerModule],
  controllers: [SpaceAssetsController],
  providers: [SpaceAssetsService],
  exports: [SpaceAssetsService],
})
export class SpaceAssetsModule {}
