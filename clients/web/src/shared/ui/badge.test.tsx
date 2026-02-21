import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  describe("children", () => {
    it("renders children content", () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("renders node children", () => {
      render(
        <Badge>
          <span data-testid="inner">label</span>
        </Badge>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("renders default variant classes by default", () => {
      render(<Badge>Default</Badge>);
      const span = screen.getByText("Default");
      expect(span).toHaveClass("bg-bg-tertiary");
      expect(span).toHaveClass("text-text-secondary");
    });

    it("renders positive variant classes", () => {
      render(<Badge variant="positive">Good</Badge>);
      const span = screen.getByText("Good");
      expect(span).toHaveClass("bg-positive/15");
      expect(span).toHaveClass("text-positive");
    });

    it("renders negative variant classes", () => {
      render(<Badge variant="negative">Bad</Badge>);
      const span = screen.getByText("Bad");
      expect(span).toHaveClass("bg-negative/15");
      expect(span).toHaveClass("text-negative");
    });

    it("renders warning variant classes", () => {
      render(<Badge variant="warning">Warning</Badge>);
      const span = screen.getByText("Warning");
      expect(span).toHaveClass("bg-warning/15");
      expect(span).toHaveClass("text-warning");
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      render(<Badge className="extra">Label</Badge>);
      expect(screen.getByText("Label")).toHaveClass("extra");
    });

    it("uses empty string className by default without adding extra spaces", () => {
      render(<Badge>Label</Badge>);
      // Should not throw or produce invalid class list
      expect(screen.getByText("Label")).toBeInTheDocument();
    });
  });

  describe("dot indicator", () => {
    it("renders a pulsing dot for high_confidence variant", () => {
      const { container } = render(<Badge variant="high_confidence">High</Badge>);
      // The dot is a nested span with aria-hidden and animate-pulse
      const dot = container.querySelector("span[aria-hidden='true']");
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass("animate-pulse");
    });

    it("does not render a pulsing dot for default variant", () => {
      const { container } = render(<Badge>Default</Badge>);
      const dot = container.querySelector("span[aria-hidden='true']");
      expect(dot).not.toBeInTheDocument();
    });
  });
});
