import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "@/components/sparkline";

describe("Sparkline", () => {
  describe("returns null for insufficient data", () => {
    it("returns null when data has 0 elements", () => {
      const { container } = render(<Sparkline data={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when data has exactly 1 element", () => {
      const { container } = render(<Sparkline data={[5]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("renders SVG for valid data", () => {
    it("renders an svg element for data with 2+ points", () => {
      const { container } = render(<Sparkline data={[1, 2]} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("has role=img and an aria-label", () => {
      render(<Sparkline data={[1, 5]} />);
      const svg = screen.getByRole("img");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-label");
    });

    it("aria-label includes the min and max values", () => {
      render(<Sparkline data={[3, 7, 5] } />);
      const svg = screen.getByRole("img");
      expect(svg.getAttribute("aria-label")).toContain("3");
      expect(svg.getAttribute("aria-label")).toContain("7");
    });
  });

  describe("default dimensions", () => {
    it("uses width=120 and height=32 by default", () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "120");
      expect(svg).toHaveAttribute("height", "32");
      expect(svg).toHaveAttribute("viewBox", "0 0 120 32");
    });
  });

  describe("custom dimensions", () => {
    it("accepts custom width and height", () => {
      const { container } = render(
        <Sparkline data={[1, 2, 3]} width={200} height={50} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "200");
      expect(svg).toHaveAttribute("height", "50");
      expect(svg).toHaveAttribute("viewBox", "0 0 200 50");
    });
  });

  describe("polyline points calculation", () => {
    // Default: width=120, height=32, padding=2
    // For data [0, 10] (2 points, min=0, max=10, range=10):
    //   i=0: x = 2 + (0/1)*116 = 2,    y = 30 - (0/10)*28  = 30   => "2,30"
    //   i=1: x = 2 + (1/1)*116 = 118,  y = 30 - (10/10)*28 = 2    => "118,2"
    it("calculates correct points for two-value data [0, 10]", () => {
      const { container } = render(<Sparkline data={[0, 10]} />);
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("points", "2,30 118,2");
    });

    // For data [5, 5] (all same, range defaults to 1):
    //   i=0: x=2,   y = 30 - (0/1)*28 = 30 => "2,30"
    //   i=1: x=118, y = 30 - (0/1)*28 = 30 => "118,30"
    it("handles flat data where all values are equal (range=0 defaults to 1)", () => {
      const { container } = render(<Sparkline data={[5, 5]} />);
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("points", "2,30 118,30");
    });

    // For data [0, 5, 10] (3 points, width=120, height=32, padding=2):
    //   range=10, usable_x=116, usable_y=28
    //   i=0: x=2,   y = 30 - (0/10)*28  = 30   => "2,30"
    //   i=1: x=60,  y = 30 - (5/10)*28  = 16   => "60,16"
    //   i=2: x=118, y = 30 - (10/10)*28 = 2    => "118,2"
    it("calculates correct points for three-value ascending data [0, 5, 10]", () => {
      const { container } = render(<Sparkline data={[0, 5, 10]} />);
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("points", "2,30 60,16 118,2");
    });

    it("renders a polyline with fill=none", () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} />);
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("fill", "none");
    });

    it("uses default color=currentColor for the stroke", () => {
      const { container } = render(<Sparkline data={[1, 2]} />);
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("stroke", "currentColor");
    });

    it("uses custom color for the stroke", () => {
      const { container } = render(
        <Sparkline data={[1, 2]} color="#FF0000" />
      );
      const polyline = container.querySelector("polyline");
      expect(polyline).toHaveAttribute("stroke", "#FF0000");
    });
  });

  describe("custom className", () => {
    it("applies className to the svg element", () => {
      const { container } = render(
        <Sparkline data={[1, 2]} className="my-sparkline" />
      );
      const svg = container.querySelector("svg");
      expect(svg?.className.baseVal).toContain("my-sparkline");
    });
  });
});
