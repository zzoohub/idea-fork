import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockTo, mockUseGSAP, mockUseReducedMotion } = vi.hoisted(() => ({
  mockTo: vi.fn(),
  mockUseGSAP: vi.fn((cb: () => void, _opts?: { scope?: unknown; dependencies?: unknown[] }) => cb()),
  mockUseReducedMotion: vi.fn(() => false),
}));

vi.mock("./register", () => ({
  gsap: { to: mockTo },
  useGSAP: mockUseGSAP,
}));

vi.mock("./use-reduced-motion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import { useCardHover } from "./use-card-hover";

describe("useCardHover", () => {
  beforeEach(() => {
    mockTo.mockClear();
    mockUseGSAP.mockClear();
    mockUseReducedMotion.mockReturnValue(false);
    mockUseGSAP.mockImplementation((cb: () => void, _opts?: { scope?: unknown; dependencies?: unknown[] }) => cb());

    // Default: fine pointer (non-touch)
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(pointer: coarse)" ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useCardHover());
    expect(result.current).toHaveProperty("current");
  });

  it("calls useGSAP with scope and dependencies", () => {
    renderHook(() => useCardHover());
    expect(mockUseGSAP).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        scope: expect.any(Object),
        dependencies: expect.any(Array),
      }),
    );
  });

  it("does not set up listeners when cardRef is null", () => {
    renderHook(() => useCardHover());
    expect(mockTo).not.toHaveBeenCalled();
  });

  it("does not set up listeners when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderHook(() => useCardHover());
    expect(mockTo).not.toHaveBeenCalled();
  });

  it("skips on touch devices (pointer: coarse)", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(pointer: coarse)" ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderHook(() => useCardHover());
    expect(mockTo).not.toHaveBeenCalled();
  });

  it("includes selectors in dependencies", () => {
    renderHook(() =>
      useCardHover({ arrowSelector: "[data-arrow]", iconSelector: "[data-icon]" }),
    );
    const call = mockUseGSAP.mock.calls[0];
    const deps = call[1]!.dependencies;
    expect(deps).toContain("[data-arrow]");
    expect(deps).toContain("[data-icon]");
  });
});
