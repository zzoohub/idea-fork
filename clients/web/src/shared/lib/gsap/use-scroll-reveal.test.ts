import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockFrom, mockUseGSAP, mockUseReducedMotion } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUseGSAP: vi.fn((cb: () => void, _opts?: { scope?: unknown; dependencies?: unknown[] }) => cb()),
  mockUseReducedMotion: vi.fn(() => false),
}));

vi.mock("./register", () => ({
  gsap: { from: mockFrom },
  useGSAP: mockUseGSAP,
}));

vi.mock("./use-reduced-motion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import { useScrollReveal } from "./use-scroll-reveal";

describe("useScrollReveal", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockUseGSAP.mockClear();
    mockUseReducedMotion.mockReturnValue(false);
    mockUseGSAP.mockImplementation((cb: () => void, _opts?: { scope?: unknown; dependencies?: unknown[] }) => cb());
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current).toHaveProperty("current");
  });

  it("calls useGSAP with scope and dependencies", () => {
    renderHook(() => useScrollReveal());
    expect(mockUseGSAP).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        scope: expect.any(Object),
        dependencies: expect.any(Array),
      }),
    );
  });

  it("does not call gsap.from when containerRef is null", () => {
    renderHook(() => useScrollReveal());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not call gsap.from when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderHook(() => useScrollReveal());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("accepts custom options", () => {
    const { result } = renderHook(() =>
      useScrollReveal({ selector: ".card", stagger: 0.1, start: "top 50%" }),
    );
    expect(result.current).toHaveProperty("current");
    expect(mockUseGSAP).toHaveBeenCalled();
  });

  it("uses default options in dependencies", () => {
    renderHook(() => useScrollReveal());
    const call = mockUseGSAP.mock.calls[0];
    const deps = call[1]!.dependencies;
    expect(deps).toContain("> *");
    expect(deps).toContain("top 85%");
    expect(deps).toContain(0.08);
  });
});
