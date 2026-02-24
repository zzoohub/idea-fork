import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRegisterPlugin = vi.fn();
vi.mock("gsap", () => ({
  default: {
    registerPlugin: mockRegisterPlugin,
  },
}));

const MockScrollTrigger = { name: "ScrollTrigger" };
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: MockScrollTrigger,
}));

const MockUseGSAP = { name: "useGSAP" };
vi.mock("@gsap/react", () => ({
  useGSAP: MockUseGSAP,
}));

describe("register", () => {
  beforeEach(() => {
    mockRegisterPlugin.mockClear();
  });

  it("calls gsap.registerPlugin with ScrollTrigger and useGSAP", async () => {
    await import("./register");
    expect(mockRegisterPlugin).toHaveBeenCalledWith(MockScrollTrigger, MockUseGSAP);
  });

  it("exports gsap, ScrollTrigger, and useGSAP", async () => {
    const mod = await import("./register");
    expect(mod.gsap).toBeDefined();
    expect(mod.ScrollTrigger).toBeDefined();
    expect(mod.useGSAP).toBeDefined();
  });
});
