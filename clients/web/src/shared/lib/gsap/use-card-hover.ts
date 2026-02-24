"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./register";
import { PRESET } from "./presets";
import { useReducedMotion } from "./use-reduced-motion";

interface UseCardHoverOptions {
  /** Selector for an arrow element to translate-x on hover */
  arrowSelector?: string;
  /** Selector for an icon to scale on hover */
  iconSelector?: string;
}

/**
 * Adds GSAP-powered hover lift + shadow to a card element.
 * Skips on touch devices and when reduced motion is preferred.
 * Returns a ref to attach to the card.
 */
export function useCardHover<T extends HTMLElement = HTMLElement>({
  arrowSelector,
  iconSelector,
}: UseCardHoverOptions = {}) {
  const cardRef = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !cardRef.current) return;

      // Skip on touch devices
      if (window.matchMedia("(pointer: coarse)").matches) return;

      const el = cardRef.current;
      const arrow = arrowSelector ? el.querySelector(arrowSelector) : null;
      const icon = iconSelector ? el.querySelector(iconSelector) : null;

      const handleEnter = () => {
        gsap.to(el, {
          ...PRESET.cardHover,
          boxShadow: "0 8px 25px -5px rgba(19, 127, 236, 0.15)",
        });
        if (arrow) gsap.to(arrow, { x: 6, duration: 0.2, ease: "power2.out" });
        if (icon) gsap.to(icon, { scale: 1.05, duration: 0.2, ease: "power2.out" });
      };

      const handleLeave = () => {
        gsap.to(el, {
          ...PRESET.cardReset,
          boxShadow: "0 0px 0px 0px rgba(19, 127, 236, 0)",
        });
        if (arrow) gsap.to(arrow, { x: 0, duration: 0.3, ease: "power2.out" });
        if (icon) gsap.to(icon, { scale: 1, duration: 0.3, ease: "power2.out" });
      };

      el.addEventListener("mouseenter", handleEnter);
      el.addEventListener("mouseleave", handleLeave);

      return () => {
        el.removeEventListener("mouseenter", handleEnter);
        el.removeEventListener("mouseleave", handleLeave);
      };
    },
    { scope: cardRef, dependencies: [reducedMotion, arrowSelector, iconSelector] },
  );

  return cardRef;
}
