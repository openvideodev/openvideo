import { Controller, Post, Body, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { ChatService } from "./chat.service";
import { Ctx, RequestContext } from "../common/request-context";

export interface ChatMessageDto {
  message: string;
  context?: {
    clipId?: string;
    assetId?: string;
    limit?: number;
  };
}

@Controller("spaces/:spaceId/chat")
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * Chat with the indexed content of a space
   * Performs RAG retrieval + LLM generation
   */
  @Post()
  async chat(
    @Param("spaceId") spaceId: string,
    @Body() dto: ChatMessageDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.chatService.chat(spaceId, dto, ctx);
  }
}
