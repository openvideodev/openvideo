// ============================================================================
// OpenVideo SDK
// ============================================================================
// Developer-friendly API client for OpenVideo Director
//
// Usage:
//   import { OpenVideo } from '@openvideo/ai';
//
//   const ov = new OpenVideo({ apiKey: 'ov_live_xxx' });
//   const space = await ov.spaces.create({ name: 'My Project' });
//

export { HttpClient } from "./client.js";
export { SpaceConnection } from "./realtime/space-connection.js";
export type {
  SpaceEventMap,
  SpaceConnectionOptions,
  SpaceInitEvent,
  ChatResponseEvent,
  PlanCreatedEvent,
  PlanStepEvent,
  PatchEvent,
  JsonPatch,
} from "./realtime/space-connection.js";
export { SpacesResource } from "./resources/spaces.js";
export { AssetsResource } from "./resources/assets.js";
export { ChatResource } from "./resources/chat.js";
export { TokensResource } from "./resources/tokens.js";

// Error classes
export {
  OpenVideoError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from "./utils/errors.js";

// Types - explicitly export each type for better IDE support
export type {
  Space,
  SpaceData,
  Track,
  Clip,
  CreateSpaceRequest,
  UpdateSpaceRequest,
  Asset,
  AssetType,
  RegisterAssetRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  IndexingStatus,
  IndexingStatusResponse,
  CreateIndexRequest,
  GetAssetIndexStatusRequest,
  ReindexAssetRequest,
  ListIndexingJobsRequest,
  ChatMessage,
  SendChatRequest,
  SendChatResponse,
  ChatStreamChunk,
  Plan,
  PlanStep,
  ApiToken,
  CreateTokenRequest,
  CreateTokenResponse,
  ExchangeTokenResponse,
  OpenVideoConfig,
  OpenVideoMode,
  RequestOptions,
  ApiResponse,
  ApiError,
} from "./types/index.js";

// ============================================================================
// Browser Proxy Client
// Routes all calls to POST /openvideo
// ============================================================================

class ProxyClient {
  private proxyUrl: string;

  constructor(proxyUrl: string = "/api/openvideo") {
    this.proxyUrl = proxyUrl;
  }

  async exec(action: string, params: any): Promise<any> {
    const response = await fetch(this.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined;
    return response.json();
  }
}

// Proxy resources using action format
class ProxySpacesResource {
  constructor(private client: ProxyClient) {}
  list = () => this.client.exec("spaces:list", {});
  get = (params: { id: string }) => this.client.exec("spaces:get", params);
  create = (data: any) => this.client.exec("spaces:create", data);
  update = (params: { id: string; name?: string; data?: any }) =>
    this.client.exec("spaces:update", params);
  delete = (params: { id: string }) => this.client.exec("spaces:delete", params);
  sync = (params: { id: string }) => this.client.exec("spaces:sync", params);
}

class ProxyAssetsResource {
  constructor(private client: ProxyClient) {}
  list = (params: { spaceId: string }) => this.client.exec("assets:list", params);
  get = (params: { spaceId: string; assetId: string }) => this.client.exec("assets:get", params);
  register = (data: any) => this.client.exec("assets:register", data);
  getUploadUrl = (data: any) => this.client.exec("assets:getUploadUrl", data);
  delete = (params: { spaceId: string; assetId: string }) =>
    this.client.exec("assets:delete", params);

  // Indexing sub-actions
  getIndexStatus = (params: { spaceId: string; assetId: string }) =>
    this.client.exec("assets:getIndexStatus", params);
  reindex = (params: { spaceId: string; assetId: string }) =>
    this.client.exec("assets:reindex", params);
  listIndexingJobs = (params: { spaceId: string }) =>
    this.client.exec("assets:listIndexingJobs", params);

  // Upload is direct to S3, not through proxy
  upload = async (params: {
    uploadUrl: string;
    file: any;
    contentType: string;
    onProgress?: (progress: number) => void;
  }) => {
    const response = await fetch(params.uploadUrl, {
      method: "PUT",
      body: params.file,
      headers: { "Content-Type": params.contentType },
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  };

  create = async (params: {
    spaceId: string;
    file: any;
    name: string;
    type: any;
    contentType: string;
    duration?: number;
    size?: number;
    onProgress?: (progress: number) => void;
  }) => {
    // 1. Get upload URL
    const uploadUrlResponse = await this.getUploadUrl({
      spaceId: params.spaceId,
      filename: params.name,
      contentType: params.contentType,
    });

    // 2. Upload file
    await this.upload({
      uploadUrl: uploadUrlResponse.url,
      file: params.file,
      contentType: params.contentType,
      onProgress: params.onProgress,
    });

    // 3. Register asset
    const asset = await this.register({
      spaceId: params.spaceId,
      id: uploadUrlResponse.key,
      name: params.name,
      type: params.type,
      src: uploadUrlResponse.url.split("?")[0], // Remove query params
      duration: params.duration,
      size: params.size,
    });

    return asset;
  };
}

class ProxyChatResource {
  constructor(private client: ProxyClient) {}
  send = (data: any) => this.client.exec("chat:send", data);
  createSession = (params: { spaceId: string }) => this.client.exec("chat:createSession", params);
  stream = async function* (_data: any) {
    throw new Error("Streaming not supported in proxy mode");
  };
}

class ProxyTokensResource {
  constructor(private client: ProxyClient) {}
  list = () => this.client.exec("tokens:list", {});
  create = (data: any) => this.client.exec("tokens:create", data);
  update = (params: { id: string; name: string }) => this.client.exec("tokens:update", params);
  delete = (params: { id: string }) => this.client.exec("tokens:delete", params);
  exchange = (params: { apiKey: string }) => this.client.exec("tokens:exchange", params);
}

// ============================================================================
// Main OpenVideo Class - Universal SDK
// ============================================================================

import { HttpClient } from "./client.js";
import { SpacesResource } from "./resources/spaces.js";
import { AssetsResource } from "./resources/assets.js";
import { ChatResource } from "./resources/chat.js";
import { TokensResource } from "./resources/tokens.js";
import { SpaceConnection } from "./realtime/space-connection.js";
import type { OpenVideoConfig } from "./types/index.js";

function detectMode(config: OpenVideoConfig): "direct" | "proxy" {
  // Default to direct mode; "auto" resolves to "direct"
  if (config.mode === "proxy") return "proxy";
  return "direct";
}

// Server-side action request type
interface ActionRequest {
  action: string;
  params: any;
}

export class OpenVideo {
  private mode: "direct" | "proxy";
  private wsURL: string;
  private spacesResource: any;
  private assetsResource: any;
  private chatResource: any;
  private tokensResource: any;

  // Resource accessors (typed as any to allow both implementations)
  public spaces: any;
  public assets: any;
  public chat: any;
  public tokens: any;

  constructor(config: OpenVideoConfig = {}) {
    this.mode = detectMode(config);
    this.wsURL = config.wsURL ?? config.baseURL?.replace(/^http/, "ws") ?? "ws://localhost:4000";

    if (this.mode === "proxy") {
      // Browser mode: route through /openvideo proxy
      const proxyClient = new ProxyClient(config.proxyUrl);
      this.spaces = new ProxySpacesResource(proxyClient);
      this.assets = new ProxyAssetsResource(proxyClient);
      this.chat = new ProxyChatResource(proxyClient);
      this.tokens = new ProxyTokensResource(proxyClient);
    } else {
      // Server mode: direct API calls
      const httpClient = new HttpClient(config);
      this.spacesResource = new SpacesResource(httpClient);
      this.assetsResource = new AssetsResource(httpClient);
      this.chatResource = new ChatResource(httpClient);
      this.tokensResource = new TokensResource(httpClient);

      // Expose resources
      this.spaces = this.spacesResource;
      this.assets = this.assetsResource;
      this.chat = this.chatResource;
      this.tokens = this.tokensResource;
    }
  }

  /**
   * Execute an action request (server-side only)
   * Takes the JSON body from the client and executes the corresponding SDK method
   */
  async exec(request: ActionRequest): Promise<any> {
    if (this.mode === "proxy") {
      throw new Error("exec() is only available in server mode (direct)");
    }

    const { action, params = {} } = request;
    const [resource, method] = action.split(":");

    if (!resource || !method) {
      throw new Error(`Invalid action format: ${action}. Expected "resource:method"`);
    }

    const resourceClient = (this as any)[resource];
    if (!resourceClient || typeof resourceClient[method] !== "function") {
      throw new Error(`Unknown action: ${action}`);
    }

    // Dynamic clean invocation with 0 positional actions logic!
    const result = await resourceClient[method](params);
    return result;
  }

  /**
   * Open a real-time WebSocket connection to a space.
   * Returns a SpaceConnection you can attach event listeners to.
   */
  connect(spaceId: string, token?: string): SpaceConnection {
    return new SpaceConnection(spaceId, { wsUrl: this.wsURL, token });
  }

  getMode(): "direct" | "proxy" {
    return this.mode;
  }
}

export default OpenVideo;
