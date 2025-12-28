/**
 * API client with authentication support
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Custom API error class with structured error information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  skipAuth?: boolean;
  body?: unknown;
}

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  code?: string;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private clearAuthAndRedirect(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  }

  private buildHeaders(options: FetchOptions): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!options.skipAuth) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    // Merge with any custom headers
    if (options.headers) {
      const customHeaders =
        options.headers instanceof Headers
          ? Object.fromEntries(options.headers.entries())
          : (options.headers as Record<string, string>);
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const errorData: ApiErrorResponse = await response.json();
      return new ApiError(
        errorData.detail || errorData.message || response.statusText,
        response.status,
        errorData.code
      );
    } catch {
      return new ApiError(
        `Request failed: ${response.statusText}`,
        response.status
      );
    }
  }

  async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { skipAuth = false, body, ...restOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...restOptions,
      headers: this.buildHeaders({ skipAuth, headers: options.headers }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuthAndRedirect();
      }
      throw await this.parseErrorResponse(response);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: Omit<FetchOptions, "body">): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data,
    });
  }

  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
