import "@testing-library/jest-dom";
import { vi } from "vitest";
import { useRef } from "react";

// Mock matchMedia for GSAP ScrollTrigger in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock GSAP library — all hooks return refs, animations are no-ops
vi.mock("@/src/shared/lib/gsap", () => {
  const noopGsap = {
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
    })),
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
    quickTo: vi.fn(() => vi.fn()),
  };

  return {
    gsap: noopGsap,
    ScrollTrigger: {},
    useGSAP: vi.fn(),
    DURATION: { instant: 0.1, fast: 0.15, normal: 0.2, slow: 0.3, reveal: 0.6 },
    EASE: { out: "power3.out", inOut: "power2.inOut", backOut: "back.out(2)", elastic: "elastic.out(1, 0.3)" },
    PRESET: {
      fadeUp: { y: 40, opacity: 0, duration: 0.6, ease: "power3.out" },
      cardHover: { y: -4, duration: 0.2, ease: "power3.out" },
      cardReset: { y: 0, duration: 0.3, ease: "power3.out" },
      scalePop: { keyframes: [{ scale: 0.92, duration: 0.05 }, { scale: 1, duration: 0.3, ease: "back.out(2)" }] },
      scalePress: { keyframes: [{ scale: 0.85, duration: 0.05 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }] },
    },
    STAGGER: { fast: 0.05, normal: 0.08, slow: 0.12 },
    useReducedMotion: vi.fn(() => false),
    useScrollReveal: () => useRef(null),
    useStaggerReveal: () => useRef(null),
    useCardHover: () => useRef(null),
  };
});
