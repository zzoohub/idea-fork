"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./register";
import { PRESET, STAGGER } from "./presets";
import { useReducedMotion } from "./use-reduced-motion";

interface UseStaggerRevealOptions {
  /** CSS selector for child elements to animate (default: "> *") */
  selector?: string;
  /** Stagger delay between children in seconds */
  stagger?: number;
}

/**
 * Animates children with a stagger fade-up on mount (no scroll trigger).
 * Returns a ref to attach to the container.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>({
  selector = "> *",
  stagger = STAGGER.normal,
}: UseStaggerRevealOptions = {}) {
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
      });
    },
    { scope: containerRef, dependencies: [reducedMotion, stagger, selector] },
  );

  return containerRef;
}
