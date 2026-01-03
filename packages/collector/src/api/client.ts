/**
 * API client for collector-to-server communication.
 * Uses native fetch for HTTP requests.
 */

import type { Config } from "../config.js";
import type {
  RegisterRequest,
  RegisterResponse,
  HeartbeatRequest,
  SyncStateResponse,
  SyncRequest,
  SyncResponse,
  LogEntry,
  SubmitLogsResponse,
  ErrorResponse,
} from "./types.js";

/**
 * Error thrown when API requests fail.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(`API Error ${status}: ${message}`);
    this.name = "ApiError";
  }
}

/**
 * API client for communicating with the archive server.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: Config) {
    // Ensure base URL doesn't have trailing slash
    this.baseUrl = config.serverUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  /**
   * Make an HTTP request to the API.
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    // Add query parameters
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      // Network error (connection refused, DNS failure, etc.)
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Network error",
        undefined
      );
    }

    // Handle non-2xx responses
    if (!response.ok) {
      let errorBody: unknown;
      let errorMessage: string;

      try {
        errorBody = await response.json();
        // Try to extract error message from response body
        if (isErrorResponse(errorBody)) {
          errorMessage = errorBody.message || errorBody.error;
        } else {
          errorMessage = response.statusText;
        }
      } catch {
        // Response isn't JSON
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }

      throw new ApiError(response.status, errorMessage, errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    try {
      return (await response.json()) as T;
    } catch {
      // Response isn't JSON but status was OK
      return undefined as T;
    }
  }

  /**
   * Register this collector with the server.
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("POST", "/api/collectors/register", {
      body: data,
    });
  }

  /**
   * Send a heartbeat to the server.
   */
  async heartbeat(collectorId: string, data?: HeartbeatRequest): Promise<void> {
    await this.request<void>("POST", `/api/collectors/${collectorId}/heartbeat`, {
      body: data ?? {},
    });
  }

  /**
   * Get the complete sync state for a host in a single API call.
   * Returns all known git repo commits and workspace session states.
   */
  async getSyncState(
    collectorId: string,
    host: string
  ): Promise<SyncStateResponse> {
    return this.request<SyncStateResponse>(
      "GET",
      `/api/collectors/${collectorId}/sync-state`,
      {
        query: { host },
      }
    );
  }

  /**
   * Sync data to the server.
   */
  async sync(collectorId: string, data: SyncRequest): Promise<SyncResponse> {
    return this.request<SyncResponse>("POST", `/api/collectors/${collectorId}/sync`, {
      body: data,
    });
  }

  /**
   * Submit run logs to the server.
   */
  async submitLogs(
    collectorId: string,
    logs: LogEntry[]
  ): Promise<SubmitLogsResponse> {
    return this.request<SubmitLogsResponse>(
      "POST",
      `/api/collectors/${collectorId}/logs`,
      {
        body: { logs },
      }
    );
  }
}

/**
 * Type guard for error responses.
 */
function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorResponse).error === "string"
  );
}
