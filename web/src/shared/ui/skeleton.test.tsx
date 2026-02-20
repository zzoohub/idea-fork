import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  describe("variants", () => {
    it("renders text variant by default", () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("h-[16px]");
      expect(el).toHaveClass("w-full");
      expect(el).toHaveClass("rounded-[4px]");
    });

    it("renders card variant", () => {
      const { container } = render(<Skeleton variant="card" />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("h-[160px]");
      expect(el).toHaveClass("w-full");
      expect(el).toHaveClass("rounded-card");
    });

    it("renders chip variant", () => {
      const { container } = render(<Skeleton variant="chip" />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("h-[32px]");
      expect(el).toHaveClass("w-[80px]");
      expect(el).toHaveClass("rounded-full");
    });
  });

  describe("accessibility", () => {
    it("sets aria-hidden=true", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(<Skeleton className="extra" />);
      expect(container.firstChild).toHaveClass("extra");
    });
  });

  describe("skeleton class", () => {
    it("always has the skeleton class", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("skeleton");
    });
  });
});
