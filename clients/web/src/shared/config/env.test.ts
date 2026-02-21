import { describe, it, expect, afterEach, vi } from "vitest";

describe("env config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("API_URL", () => {
    it("uses the NEXT_PUBLIC_API_URL env variable when set", async () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "http://custom-api:9000/v1");
      const { API_URL } = await import("./env");
      expect(API_URL).toBe("http://custom-api:9000/v1");
    });

    it("uses localhost fallback when NEXT_PUBLIC_API_URL is undefined", async () => {
      const original = process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      vi.resetModules();
      const { API_URL } = await import("./env");
      expect(API_URL).toBe("http://localhost:8080/v1");
      // Restore original value
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_API_URL = original;
      }
    });
  });
});
