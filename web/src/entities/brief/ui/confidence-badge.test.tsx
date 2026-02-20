import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBadge } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  describe("returns null when confidence is adequate", () => {
    it("returns null when sourceCount >= 3", () => {
      const { container } = render(<ConfidenceBadge sourceCount={3} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when sourceCount is well above 3", () => {
      const { container } = render(<ConfidenceBadge sourceCount={10} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("renders badge when confidence is low", () => {
    it("renders status element when sourceCount < 3", () => {
      render(<ConfidenceBadge sourceCount={2} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders 'Low confidence' text", () => {
      render(<ConfidenceBadge sourceCount={1} />);
      expect(screen.getByText("Low confidence")).toBeInTheDocument();
    });

    it("shows singular source text when sourceCount=1", () => {
      render(<ConfidenceBadge sourceCount={1} />);
      expect(screen.getByText(/Based on 1 source/)).toBeInTheDocument();
    });

    it("shows plural sources text when sourceCount=2", () => {
      render(<ConfidenceBadge sourceCount={2} />);
      expect(screen.getByText(/Based on 2 sources/)).toBeInTheDocument();
    });

    it("has correct aria-label with singular source", () => {
      render(<ConfidenceBadge sourceCount={1} />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Low confidence: only 1 source"
      );
    });

    it("has correct aria-label with multiple sources", () => {
      render(<ConfidenceBadge sourceCount={2} />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Low confidence: only 2 sources"
      );
    });

    it("renders a warning icon", () => {
      const { container } = render(<ConfidenceBadge sourceCount={1} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("merges custom className", () => {
      render(<ConfidenceBadge sourceCount={1} className="my-badge" />);
      expect(screen.getByRole("status")).toHaveClass("my-badge");
    });

    it("renders without className prop", () => {
      render(<ConfidenceBadge sourceCount={1} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
