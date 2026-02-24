import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// We test the hook directly — it only depends on window.matchMedia
// The global mock in vitest.setup mocks the barrel "@/src/shared/lib/gsap"
// but this file imports directly from "./use-reduced-motion" so it's not affected.

describe("useReducedMotion", () => {
  let listeners: Array<() => void>;
  let matchesValue: boolean;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: matchesValue,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_: string, cb: () => void) => {
          listeners.push(cb);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it("returns false when prefers-reduced-motion does not match", async () => {
    matchesValue = false;
    const { useReducedMotion } = await import("./use-reduced-motion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion matches", async () => {
    matchesValue = true;
    const { useReducedMotion } = await import("./use-reduced-motion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when matchMedia changes", async () => {
    matchesValue = false;
    const { useReducedMotion } = await import("./use-reduced-motion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate media query change
    matchesValue = true;
    act(() => {
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
