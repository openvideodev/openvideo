import { Module } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { RagModule } from "../rag/rag.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [RagModule, StorageModule],
  controllers: [],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
