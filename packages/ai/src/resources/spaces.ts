// ============================================================================
// Spaces Resource
// ============================================================================

import type { HttpClient } from "../client.js";
import type { Space, CreateSpaceRequest } from "../types/index.js";

export class SpacesResource {
  constructor(private client: HttpClient) {}

  /**
   * List all spaces for the authenticated user
   */
  async list(): Promise<Space[]> {
    const response = await this.client.get<Space[]>("/spaces");
    return response;
  }

  /**
   * Create a new space
   */
  async create(request: CreateSpaceRequest): Promise<Space> {
    const response = await this.client.post<Space>("/spaces", request);
    return response;
  }

  /**
   * Get a space by ID
   */
  async get(params: { id: string }): Promise<Space> {
    const response = await this.client.get<Space>(`/spaces/${params.id}`);
    return response;
  }

  /**
   * Update a space
   */
  async update(params: { id: string; name?: string; data?: any }): Promise<Space> {
    const { id, ...body } = params;
    const response = await this.client.patch<Space>(`/spaces/${id}`, body);
    return response;
  }

  /**
   * Delete a space
   */
  async delete(params: { id: string }): Promise<void> {
    await this.client.delete(`/spaces/${params.id}`);
  }

  /**
   * Sync a space (triggers backend synchronization)
   */
  async sync(params: { id: string }): Promise<Space> {
    const response = await this.client.post<Space>(`/spaces/${params.id}/sync`, {});
    return response;
  }
}
