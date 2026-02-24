/** Duration values aligned with design tokens in globals.css */
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  reveal: 0.6,
} as const;

/** GSAP ease strings aligned with design token curves */
export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  backOut: "back.out(2)",
  elastic: "elastic.out(1, 0.3)",
} as const;

/** Reusable animation presets */
export const PRESET = {
  fadeUp: {
    y: 40,
    opacity: 0,
    duration: DURATION.reveal,
    ease: EASE.out,
  },
  cardHover: {
    y: -4,
    duration: DURATION.normal,
    ease: EASE.out,
  },
  cardReset: {
    y: 0,
    duration: DURATION.slow,
    ease: EASE.out,
  },
  scalePop: {
    keyframes: [
      { scale: 0.92, duration: 0.05 },
      { scale: 1, duration: 0.3, ease: EASE.backOut },
    ],
  },
  scalePress: {
    keyframes: [
      { scale: 0.85, duration: 0.05 },
      { scale: 1, duration: 0.35, ease: "back.out(3)" },
    ],
  },
} as const;

/** Default stagger between child elements */
export const STAGGER = {
  fast: 0.05,
  normal: 0.08,
  slow: 0.12,
} as const;
