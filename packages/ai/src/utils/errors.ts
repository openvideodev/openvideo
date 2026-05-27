// ============================================================================
// Error Handling
// ============================================================================

export class OpenVideoError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "OpenVideoError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AuthenticationError extends OpenVideoError {
  constructor(message: string = "Invalid API key or access token") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends OpenVideoError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends OpenVideoError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400, { fieldErrors });
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class RateLimitError extends OpenVideoError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends OpenVideoError {
  constructor(message: string = "Internal server error") {
    super(message, "SERVER_ERROR", 500);
    this.name = "ServerError";
  }
}

export class NetworkError extends OpenVideoError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR", 0);
    this.name = "NetworkError";
  }
}

export function handleApiError(response: Response, body?: any): never {
  const message = body?.message || body?.error || `HTTP ${response.status} Error`;

  switch (response.status) {
    case 400:
      throw new ValidationError(message, body?.details || {});
    case 401:
      throw new AuthenticationError(message);
    case 404:
      throw new NotFoundError(body?.resource || "Resource", body?.id);
    case 429:
      const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
      throw new RateLimitError(retryAfter);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message);
    default:
      throw new OpenVideoError(message, "UNKNOWN_ERROR", response.status, body);
  }
}
