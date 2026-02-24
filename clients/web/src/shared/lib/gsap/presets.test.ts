import { describe, it, expect } from "vitest";
import { DURATION, EASE, PRESET, STAGGER } from "./presets";

describe("presets", () => {
  describe("DURATION", () => {
    it("has all expected keys with numeric values", () => {
      expect(DURATION.instant).toBe(0.1);
      expect(DURATION.fast).toBe(0.15);
      expect(DURATION.normal).toBe(0.2);
      expect(DURATION.slow).toBe(0.3);
      expect(DURATION.reveal).toBe(0.6);
    });
  });

  describe("EASE", () => {
    it("has all expected keys with string values", () => {
      expect(EASE.out).toBe("power3.out");
      expect(EASE.inOut).toBe("power2.inOut");
      expect(EASE.backOut).toBe("back.out(2)");
      expect(EASE.elastic).toBe("elastic.out(1, 0.3)");
    });
  });

  describe("PRESET", () => {
    it("fadeUp uses reveal duration and out ease", () => {
      expect(PRESET.fadeUp).toEqual({
        y: 40,
        opacity: 0,
        duration: DURATION.reveal,
        ease: EASE.out,
      });
    });

    it("cardHover moves up by 4px", () => {
      expect(PRESET.cardHover.y).toBe(-4);
      expect(PRESET.cardHover.duration).toBe(DURATION.normal);
    });

    it("cardReset returns to y=0", () => {
      expect(PRESET.cardReset.y).toBe(0);
      expect(PRESET.cardReset.duration).toBe(DURATION.slow);
    });

    it("scalePop has two keyframes", () => {
      expect(PRESET.scalePop.keyframes).toHaveLength(2);
      expect(PRESET.scalePop.keyframes[0].scale).toBe(0.92);
      expect(PRESET.scalePop.keyframes[1].scale).toBe(1);
    });

    it("scalePress has two keyframes", () => {
      expect(PRESET.scalePress.keyframes).toHaveLength(2);
      expect(PRESET.scalePress.keyframes[0].scale).toBe(0.85);
      expect(PRESET.scalePress.keyframes[1].scale).toBe(1);
    });
  });

  describe("STAGGER", () => {
    it("has all expected keys", () => {
      expect(STAGGER.fast).toBe(0.05);
      expect(STAGGER.normal).toBe(0.08);
      expect(STAGGER.slow).toBe(0.12);
    });
  });
});
