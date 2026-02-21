import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "./icon";

describe("Icon", () => {
  describe("known icons", () => {
    /* Custom SVG icons (reddit, app-store) render fill="currentColor" with no stroke attribute */
    const customFillIcons = ["reddit", "app-store"] as const;
    /* Lucide stroke icons render fill="none" stroke="currentColor" by default */
    const strokeIcons = [
      "external-link",
      "thumbs-up",
      "thumbs-down",
      "search",
      "arrow-up-down",
      "trending-up",
      "arrow-left",
      "close",
      "warning",
      "tag",
      "clock",
      "chevron-down",
    ] as const;

    customFillIcons.forEach((name) => {
      it(`renders fill icon: ${name}`, () => {
        const { container } = render(<Icon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("fill", "currentColor");
      });
    });

    strokeIcons.forEach((name) => {
      it(`renders stroke icon: ${name}`, () => {
        const { container } = render(<Icon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("fill", "none");
        expect(svg).toHaveAttribute("stroke", "currentColor");
      });
    });
  });

  describe("unknown icon", () => {
    it("returns null for an unknown icon name", () => {
      const { container } = render(<Icon name="does-not-exist" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("size prop", () => {
    it("uses size=20 by default", () => {
      const { container } = render(<Icon name="search" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("height", "20");
    });

    it("uses custom size", () => {
      const { container } = render(<Icon name="search" size={32} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "32");
      expect(svg).toHaveAttribute("height", "32");
    });
  });

  describe("className prop", () => {
    it("applies custom className to svg", () => {
      const { container } = render(
        <Icon name="search" className="custom-icon" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("custom-icon");
    });
  });

  describe("aria-hidden prop", () => {
    it("sets aria-hidden=true by default", () => {
      const { container } = render(<Icon name="search" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("sets aria-hidden=false when explicitly passed", () => {
      const { container } = render(
        <Icon name="search" aria-hidden={false} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "false");
    });
  });

  describe("path data", () => {
    it("renders a path element inside the svg", () => {
      const { container } = render(<Icon name="search" />);
      const path = container.querySelector("svg path");
      expect(path).toBeInTheDocument();
      expect(path?.getAttribute("d")).toBeTruthy();
    });
  });

  describe("filled prop", () => {
    it("applies fill=currentColor and strokeWidth=0 to Lucide icon when filled=true", () => {
      const { container } = render(<Icon name="thumbs-up" filled />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("fill", "currentColor");
      expect(svg).toHaveAttribute("stroke-width", "0");
    });

    it("does not override fill on Lucide icon when filled=false (default)", () => {
      const { container } = render(<Icon name="thumbs-up" filled={false} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("fill", "none");
    });

    it("custom SVG icons always render fill=currentColor regardless of filled prop", () => {
      const { container } = render(<Icon name="reddit" filled={false} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("fill", "currentColor");
    });
  });
});
