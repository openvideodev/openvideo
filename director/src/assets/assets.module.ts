import { Module } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { AssetsController } from "./assets.controller";
import { DbModule } from "../db/db.module";
import { RagModule } from "../rag/rag.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [DbModule, RagModule, StorageModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
