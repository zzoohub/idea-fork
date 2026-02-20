import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "./icon";

describe("Icon", () => {
  describe("known icons", () => {
    const fillIcons = ["reddit", "app-store"] as const;
    const strokeIcons = [
      "external-link",
      "thumbs-up",
      "thumbs-down",
      "search",
      "sort",
      "trending",
      "arrow-left",
      "close",
      "warning",
      "tag",
      "clock",
      "chevron-down",
    ] as const;

    fillIcons.forEach((name) => {
      it(`renders fill icon: ${name}`, () => {
        const { container } = render(<Icon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("fill", "currentColor");
        expect(svg).toHaveAttribute("stroke", "none");
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
});
