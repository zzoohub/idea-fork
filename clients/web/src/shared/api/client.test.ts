import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "./errors";

// We need to control window to test server vs client base URL
// Mock the env module so API_URL is predictable
vi.mock("@/src/shared/config/env", () => ({
  API_URL: "http://test-server:8080/v1",
}));

// Import AFTER mocks so module picks up the mock
const { apiFetch } = await import("./client");

// Helper to build a minimal Response-like object
function makeResponse(
  body: unknown,
  status: number,
  statusText = "OK",
  jsonThrows = false,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: jsonThrows
      ? vi.fn(() => Promise.reject(new SyntaxError("invalid json")))
      : vi.fn(() => Promise.resolve(body)),
  } as unknown as Response;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("successful JSON response", () => {
    it("returns parsed JSON body for a 200 response", async () => {
      const payload = { data: [{ id: 1 }] };
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse(payload, 200));

      const result = await apiFetch("/posts");

      expect(result).toEqual(payload);
    });

    it("passes additional RequestInit options to fetch", async () => {
      const payload = { data: {} };
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse(payload, 200));

      await apiFetch("/posts", { method: "POST", body: '{"x":1}' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST", body: '{"x":1}' }),
      );
    });

    it("always includes Content-Type application/json header", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: null }, 200));

      await apiFetch("/posts");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("merges caller-supplied headers with default Content-Type", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: null }, 200));

      await apiFetch("/posts", { headers: { "X-Custom": "yes" } });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Custom": "yes",
          }),
        }),
      );
    });

    it("always sends credentials: include", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: null }, 200));

      await apiFetch("/posts");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  describe("client-side base URL (window defined)", () => {
    it("uses /api/v1 as base URL when window is defined", async () => {
      // jsdom provides window, so this is the client path
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: [] }, 200));

      await apiFetch("/posts");

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toBe("/api/v1/posts");
    });

    it("concatenates path to /api/v1", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: {} }, 200));

      await apiFetch("/briefs/my-slug");

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toBe("/api/v1/briefs/my-slug");
    });
  });

  describe("server-side base URL (window undefined)", () => {
    it("uses API_URL from env when window is undefined", async () => {
      // Temporarily remove window to simulate SSR
      const originalWindow = globalThis.window;
      // @ts-expect-error — intentionally deleting window to simulate server
      delete globalThis.window;

      vi.mocked(fetch).mockResolvedValueOnce(makeResponse({ data: [] }, 200));

      const { apiFetch: serverApiFetch } = await import("./client");
      await serverApiFetch("/posts");

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toBe("http://test-server:8080/v1/posts");

      // Restore window
      globalThis.window = originalWindow;
    });
  });

  describe("error response parsing", () => {
    it("throws ApiError with status from response when not ok", async () => {
      const errorBody = { title: "Not Found", detail: "Brief not found" };
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(errorBody, 404, "Not Found"),
      );

      await expect(apiFetch("/briefs/missing")).rejects.toBeInstanceOf(
        ApiError,
      );
    });

    it("uses title and detail from JSON error body", async () => {
      const errorBody = { title: "Not Found", detail: "Brief not found" };
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(errorBody, 404, "Not Found"),
      );

      let caught: ApiError | undefined;
      try {
        await apiFetch("/briefs/missing");
      } catch (e) {
        caught = e as ApiError;
      }

      expect(caught?.status).toBe(404);
      expect(caught?.title).toBe("Not Found");
      expect(caught?.detail).toBe("Brief not found");
    });

    it("falls back to statusText as detail when JSON body lacks detail", async () => {
      const errorBody = { title: "Forbidden" };
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(errorBody, 403, "Forbidden"),
      );

      let caught: ApiError | undefined;
      try {
        await apiFetch("/protected");
      } catch (e) {
        caught = e as ApiError;
      }

      expect(caught?.title).toBe("Forbidden");
      expect(caught?.detail).toBe("Forbidden");
    });

    it("falls back to 'Error' as title when JSON body lacks title", async () => {
      const errorBody = { detail: "Something broke" };
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(errorBody, 500, "Internal Server Error"),
      );

      let caught: ApiError | undefined;
      try {
        await apiFetch("/boom");
      } catch (e) {
        caught = e as ApiError;
      }

      expect(caught?.title).toBe("Error");
      expect(caught?.detail).toBe("Something broke");
    });

    it("uses default title 'Error' and statusText when response body is not valid JSON", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(null, 503, "Service Unavailable", true /* jsonThrows */),
      );

      let caught: ApiError | undefined;
      try {
        await apiFetch("/down");
      } catch (e) {
        caught = e as ApiError;
      }

      expect(caught?.status).toBe(503);
      expect(caught?.title).toBe("Error");
      expect(caught?.detail).toBe("Service Unavailable");
    });

    it("throws ApiError for 401 response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(
          { title: "Unauthorized", detail: "Token expired" },
          401,
          "Unauthorized",
        ),
      );

      await expect(apiFetch("/secure")).rejects.toBeInstanceOf(ApiError);
    });

    it("throws ApiError for 422 response with validation detail", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeResponse(
          { title: "Validation Error", detail: "Field is required" },
          422,
          "Unprocessable Entity",
        ),
      );

      let caught: ApiError | undefined;
      try {
        await apiFetch("/validate");
      } catch (e) {
        caught = e as ApiError;
      }

      expect(caught?.status).toBe(422);
      expect(caught?.title).toBe("Validation Error");
      expect(caught?.detail).toBe("Field is required");
    });
  });
});
