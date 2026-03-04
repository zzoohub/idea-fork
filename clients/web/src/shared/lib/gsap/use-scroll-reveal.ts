"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./register";
import { PRESET, STAGGER } from "./presets";
import { useReducedMotion } from "./use-reduced-motion";

interface UseScrollRevealOptions {
  /** CSS selector for child elements to animate (default: "> *") */
  selector?: string;
  /** Stagger delay between children in seconds */
  stagger?: number;
  /** ScrollTrigger start position (default: "top 85%") */
  start?: string;
}

/**
 * Applies a scroll-triggered stagger fade-up animation to children
 * of the container ref. Returns a ref to attach to the container.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  selector = "> *",
  stagger = STAGGER.normal,
  start = "top 85%",
}: UseScrollRevealOptions = {}) {
  const containerRef = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const scoped = selector.startsWith(">") ? `:scope ${selector}` : selector;
      const children = containerRef.current.querySelectorAll(scoped);
      if (children.length === 0) return;

      gsap.from(children, {
        ...PRESET.fadeUp,
        stagger,
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          toggleActions: "play none none none",
        },
      });

      // On client-side navigation ScrollTrigger may not detect elements
      // already in the viewport. Refresh after a frame so positions are
      // recalculated and the animation fires immediately when visible.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    { scope: containerRef, dependencies: [reducedMotion, stagger, start, selector] },
  );

  return containerRef;
}
