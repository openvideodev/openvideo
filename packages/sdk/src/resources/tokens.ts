// ============================================================================
// API Tokens Resource
// ============================================================================

import type { HttpClient } from "../client.js";
import type {
  ApiToken,
  CreateTokenRequest,
  CreateTokenResponse,
  ExchangeTokenResponse,
} from "../types/index.js";

export class TokensResource {
  constructor(private client: HttpClient) {}

  /**
   * List all API tokens for the current user
   */
  async list(): Promise<ApiToken[]> {
    const response = await this.client.get<ApiToken[]>("/auth/tokens");
    return response;
  }

  /**
   * Create a new API token
   * ⚠️ The full token is only returned once - store it securely!
   */
  async create(request: CreateTokenRequest): Promise<CreateTokenResponse> {
    const response = await this.client.post<CreateTokenResponse>("/auth/tokens", request);
    return response;
  }

  /**
   * Update a token's name
   */
  async update(params: { id: string; name: string }): Promise<void> {
    await this.client.patch(`/auth/tokens/${params.id}`, { name: params.name });
  }

  /**
   * Revoke/delete a token
   */
  async delete(params: { id: string }): Promise<void> {
    await this.client.delete(`/auth/tokens/${params.id}`);
  }

  /**
   * Exchange an API key for a JWT access token
   * Useful for web apps that need to authenticate with an API key
   */
  async exchange(params: { apiKey: string }): Promise<ExchangeTokenResponse> {
    const response = await this.client.postWithApiKey<ExchangeTokenResponse>(
      "/auth/token/exchange",
      params.apiKey,
    );
    return response;
  }
}
