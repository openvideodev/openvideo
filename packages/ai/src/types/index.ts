// ============================================================================
// OpenVideo SDK Types
// ============================================================================

// ----------------------------------------------------------------------------
// API Response Types
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Space Types
// ----------------------------------------------------------------------------

export interface Space {
  id: string;
  name: string;
  userId: string;
  description?: string | null;
  thumbnail?: string | null;
  width: number;
  height: number;
  fps: number;
  scene: {
    tracks: any[];
    clips: Record<string, any>;
    settings?: any;
  };
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceData {
  canvasSize?: {
    width: number;
    height: number;
  };
  fps?: number;
  duration?: number;
  tracks?: Track[];
  clips?: Clip[];
}

export interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "caption";
  clips: string[];
}

export interface Clip {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  src: string;
  start: number;
  end: number;
  trackId: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  fps?: number;
  scene?: any;
  data?: any;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string | null;
  thumbnail?: string | null;
  width?: number;
  height?: number;
  fps?: number;
  scene?: any;
  data?: any;
}

// ----------------------------------------------------------------------------
// Asset Types
// ----------------------------------------------------------------------------

export type AssetType = "image" | "video" | "audio";

export interface Asset {
  id: string;
  spaceId: string;
  name: string;
  type: AssetType;
  src: string;
  duration?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAssetRequest {
  spaceId: string;
  id: string;
  name: string;
  type: AssetType;
  src: string;
  duration?: number;
  size?: number;
}

export interface UploadUrlRequest {
  spaceId: string;
  filename: string;
  contentType: string;
}

export interface UploadUrlResponse {
  url: string;
  key: string;
  expiresIn: number;
}

// ----------------------------------------------------------------------------
// Indexing Types (RAG)
// ----------------------------------------------------------------------------

export type IndexingStatus = "pending" | "processing" | "completed" | "failed";

export interface IndexingStatusResponse {
  id: string;
  assetId: string;
  spaceId: string;
  status: IndexingStatus;
  progress: number;
  stage?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIndexRequest {
  spaceId: string;
  assetId: string;
}

export interface GetAssetIndexStatusRequest {
  spaceId: string;
  assetId: string;
}

export interface ReindexAssetRequest {
  spaceId: string;
  assetId: string;
}

export interface ListIndexingJobsRequest {
  spaceId: string;
}

// ----------------------------------------------------------------------------
// Chat Types
// ----------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "plan" | "patch";
  payload?: unknown;
  createdAt: string;
}

export interface SendChatRequest {
  spaceId: string;
  message: string;
  sessionId?: string;
}

export interface SendChatResponse {
  message: ChatMessage;
  plan?: Plan;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: "pending" | "running" | "completed" | "failed";
}

export interface PlanStep {
  id: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  tool?: string;
  payload?: unknown;
}

export interface ChatStreamChunk {
  type: "chunk" | "done" | "error";
  content?: string;
  message?: ChatMessage;
  error?: string;
}

// ----------------------------------------------------------------------------
// Token Types
// ----------------------------------------------------------------------------

export interface ApiToken {
  id: string;
  name: string | null;
  tokenHint: string;
  scopes: string[];
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateTokenRequest {
  name?: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface CreateTokenResponse extends ApiToken {
  token: string; // Full token - only shown once!
}

export interface ExchangeTokenRequest {
  apiKey: string;
}

export interface ExchangeTokenResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  scopes: string[];
}

// ----------------------------------------------------------------------------
// SDK Config Types
// ----------------------------------------------------------------------------

export type OpenVideoMode = "auto" | "direct" | "proxy";

export interface OpenVideoConfig {
  apiKey?: string;
  accessToken?: string;
  baseURL?: string;
  wsURL?: string;
  timeout?: number;
  retries?: number;
  mode?: OpenVideoMode;
  proxyUrl?: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}
