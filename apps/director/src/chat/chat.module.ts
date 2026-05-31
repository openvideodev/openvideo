import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { RagModule } from "../rag/rag.module";

@Module({
  imports: [RagModule],
  controllers: [],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
