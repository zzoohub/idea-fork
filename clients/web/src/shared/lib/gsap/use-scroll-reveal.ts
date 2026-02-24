"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./register";
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

      const children = containerRef.current.querySelectorAll(selector);
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
    },
    { scope: containerRef, dependencies: [reducedMotion, stagger, start, selector] },
  );

  return containerRef;
}
