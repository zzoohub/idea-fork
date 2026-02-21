import { API_URL } from "@/src/shared/config/env";
import { ApiError } from "./errors";
import type { ApiResponse } from "./types";

function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return API_URL;
  }
  return "/api/v1";
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${getBaseUrl()}${path}`;

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let title = "Error";
    let detail = response.statusText;

    try {
      const body = await response.json();
      if (body.title) title = body.title;
      if (body.detail) detail = body.detail;
    } catch {
      // use defaults
    }

    throw new ApiError(response.status, title, detail);
  }

  return response.json() as Promise<ApiResponse<T>>;
}
