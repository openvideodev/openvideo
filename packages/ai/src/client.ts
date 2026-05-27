// ============================================================================
// HTTP Client with Authentication
// ============================================================================

import type { OpenVideoConfig, RequestOptions } from "./types/index.js";
import { OpenVideoError, NetworkError, handleApiError } from "./utils/errors.js";

const DEFAULT_BASE_URL = "https://api.openvideo.dev";
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;

export class HttpClient {
  private apiKey?: string;
  private accessToken?: string;
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(config: OpenVideoConfig = {}) {
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseURL = config.baseURL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
    this.defaultTimeout = config.timeout || DEFAULT_TIMEOUT;
    this.defaultRetries = config.retries || DEFAULT_RETRIES;

    if (!this.apiKey && !this.accessToken) {
      throw new OpenVideoError("Either apiKey or accessToken is required", "CONFIG_ERROR", 0);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.accessToken) {
      return { Authorization: `Bearer ${this.accessToken}` };
    }
    if (this.apiKey) {
      // API key can be used as Bearer token for simplicity
      return { Authorization: `Bearer ${this.apiKey}` };
    }
    return {};
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout");
      }
      throw new NetworkError(error instanceof Error ? error.message : "Network error");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.retries ?? this.defaultRetries;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.getAuthHeaders(),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          url,
          {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          },
          timeout,
        );

        // Handle non-2xx responses
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          handleApiError(response, errorBody);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        // Parse JSON response
        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except rate limits
        if (error instanceof OpenVideoError && error.status >= 400 && error.status < 500) {
          if (error.status !== 429) throw error;
        }

        // Don't retry on the last attempt
        if (attempt >= maxRetries) break;

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new NetworkError("Max retries exceeded");
  }

  // HTTP methods
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  // Special method for token exchange (uses X-API-Token header)
  async postWithApiKey<T>(path: string, apiKey: string): Promise<T> {
    const url = `${this.baseURL}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      handleApiError(response, errorBody);
    }

    return response.json() as Promise<T>;
  }
}
