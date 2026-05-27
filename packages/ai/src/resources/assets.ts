// ============================================================================
// Assets Resource
// ============================================================================

import type { HttpClient } from "../client.js";
import type {
  Asset,
  AssetType,
  RegisterAssetRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  IndexingStatusResponse,
} from "../types/index.js";

export class AssetsResource {
  constructor(private client: HttpClient) {}

  /**
   * List all assets in a space
   */
  async list(params: { spaceId: string }): Promise<Asset[]> {
    const response = await this.client.get<Asset[]>(`/spaces/${params.spaceId}/assets`);
    return response;
  }

  /**
   * Get a single asset by ID
   */
  async get(params: { spaceId: string; assetId: string }): Promise<Asset> {
    const response = await this.client.get<Asset>(
      `/spaces/${params.spaceId}/assets/${params.assetId}`,
    );
    return response;
  }

  /**
   * Register a new asset (metadata only)
   */
  async register(request: RegisterAssetRequest): Promise<Asset> {
    const { spaceId, ...body } = request;
    const response = await this.client.post<Asset>(`/spaces/${spaceId}/assets`, body);
    return response;
  }

  /**
   * Get a presigned upload URL
   */
  async getUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    const response = await this.client.post<UploadUrlResponse>("/assets/upload-url", request);
    return response;
  }

  /**
   * Upload a file directly
   * This performs the actual upload to the presigned URL
   */
  async upload(params: {
    uploadUrl: string;
    file: File | Blob | ArrayBufferView | ArrayBuffer;
    contentType: string;
    onProgress?: (progress: number) => void;
  }): Promise<void> {
    const { uploadUrl, file, contentType } = params;

    // Convert ArrayBufferView/ArrayBuffer to Blob for fetch compatibility
    let body: BodyInit;
    if (file instanceof ArrayBuffer) {
      body = new Blob([new Uint8Array(file)]);
    } else if (ArrayBuffer.isView(file) && !(file instanceof DataView)) {
      // Convert TypedArray to Uint8Array for Blob compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body = new Blob([new Uint8Array(file.buffer, file.byteOffset, file.byteLength) as any]);
    } else {
      body = file as BodyInit;
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Convenience method: Register and upload in one call
   */
  async create(params: {
    spaceId: string;
    file: File | Blob | ArrayBufferView | ArrayBuffer;
    name: string;
    type: AssetType;
    contentType: string;
    duration?: number;
    size?: number;
    onProgress?: (progress: number) => void;
  }): Promise<Asset> {
    const { spaceId, file, name, type, contentType, duration, size, onProgress } = params;

    // 1. Get upload URL
    const uploadUrlResponse = await this.getUploadUrl({
      spaceId,
      filename: name,
      contentType,
    });

    // 2. Upload file
    await this.upload({
      uploadUrl: uploadUrlResponse.url,
      file,
      contentType,
      onProgress,
    });

    // 3. Register asset
    const asset = await this.register({
      spaceId,
      id: uploadUrlResponse.key,
      name,
      type,
      src: uploadUrlResponse.url.split("?")[0], // Remove query params
      duration,
      size,
    });

    return asset;
  }

  /**
   * Delete an asset
   */
  async delete(params: { spaceId: string; assetId: string }): Promise<void> {
    await this.client.delete(`/spaces/${params.spaceId}/assets/${params.assetId}`);
  }

  /**
   * Get indexing status for an asset
   */
  async getIndexStatus(params: {
    spaceId: string;
    assetId: string;
  }): Promise<IndexingStatusResponse> {
    const response = await this.client.get<IndexingStatusResponse>(
      `/spaces/${params.spaceId}/assets/${params.assetId}/index/status`,
    );
    return response;
  }

  /**
   * Trigger/retrigger indexing for an asset
   */
  async reindex(params: { spaceId: string; assetId: string }): Promise<IndexingStatusResponse> {
    const response = await this.client.post<IndexingStatusResponse>(
      `/spaces/${params.spaceId}/assets/${params.assetId}/index`,
      {},
    );
    return response;
  }

  /**
   * List all indexing jobs in a space
   */
  async listIndexingJobs(params: { spaceId: string }): Promise<IndexingStatusResponse[]> {
    const response = await this.client.get<IndexingStatusResponse[]>(
      `/spaces/${params.spaceId}/index/assets`,
    );
    return response;
  }
}
