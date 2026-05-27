// ============================================================================
// Chat Resource (AI Director)
// ============================================================================

import type { HttpClient } from "../client.js";
import type { SendChatRequest, SendChatResponse, ChatStreamChunk } from "../types/index.js";

export class ChatResource {
  constructor(private client: HttpClient) {}

  /**
   * Send a chat message to the AI Director
   */
  async send(request: SendChatRequest): Promise<SendChatResponse> {
    const response = await this.client.post<SendChatResponse>("/chat", request);
    return response;
  }

  /**
   * Send a chat message and stream the response
   */
  async *stream(request: SendChatRequest): AsyncGenerator<ChatStreamChunk> {
    const url = `/chat/stream`;

    const response = await this.client.post<Response>(url, request);

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed: ChatStreamChunk = JSON.parse(data);
            yield parsed;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(params: { spaceId: string }): Promise<{ sessionId: string }> {
    const response = await this.client.post<{ sessionId: string }>("/chat/sessions", {
      spaceId: params.spaceId,
    });
    return response;
  }
}
