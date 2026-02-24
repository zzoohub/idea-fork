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

import { useStaggerReveal } from "./use-stagger-reveal";

describe("useStaggerReveal", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockUseGSAP.mockClear();
    mockUseReducedMotion.mockReturnValue(false);
    mockUseGSAP.mockImplementation((cb: () => void, _opts?: { scope?: unknown; dependencies?: unknown[] }) => cb());
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useStaggerReveal());
    expect(result.current).toHaveProperty("current");
  });

  it("calls useGSAP with scope and dependencies", () => {
    renderHook(() => useStaggerReveal());
    expect(mockUseGSAP).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        scope: expect.any(Object),
        dependencies: expect.any(Array),
      }),
    );
  });

  it("does not call gsap.from when containerRef is null", () => {
    renderHook(() => useStaggerReveal());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not call gsap.from when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderHook(() => useStaggerReveal());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("accepts custom selector and stagger", () => {
    const { result } = renderHook(() =>
      useStaggerReveal({ selector: ".item", stagger: 0.15 }),
    );
    expect(result.current).toHaveProperty("current");
    const call = mockUseGSAP.mock.calls[0];
    const deps = call[1]!.dependencies;
    expect(deps).toContain(".item");
    expect(deps).toContain(0.15);
  });

  it("uses default options in dependencies", () => {
    renderHook(() => useStaggerReveal());
    const call = mockUseGSAP.mock.calls[0];
    const deps = call[1]!.dependencies;
    expect(deps).toContain("> *");
    expect(deps).toContain(0.08);
  });
});
