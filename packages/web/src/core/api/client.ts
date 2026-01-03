/**
 * API Client for Claude Archive Server
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static isNotFound(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 404;
  }

  static isUnauthorized(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 401;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: Partial<ApiClientConfig>) {
    this.baseUrl = config?.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
    // Use API key from config or environment variable
    // For session-based auth (BetterAuth), don't set NEXT_PUBLIC_API_KEY
    this.apiKey = config?.apiKey ?? process.env.NEXT_PUBLIC_API_KEY;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Only add API key if explicitly set (for collectors)
    // Web UI uses session cookies via credentials: "include"
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Send session cookies
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorBody.message ?? response.statusText,
        errorBody.details
      );
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    return this.request<T>(fullPath, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
