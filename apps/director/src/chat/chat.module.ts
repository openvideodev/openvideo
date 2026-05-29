import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { DbModule } from "../db/db.module";
import { RagModule } from "../rag/rag.module";

@Module({
  imports: [DbModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
