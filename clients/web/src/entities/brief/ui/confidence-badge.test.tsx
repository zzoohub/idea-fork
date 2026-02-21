import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBadge } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  describe("renders for all confidence levels", () => {
    it("renders 'High Confidence' for level='high'", () => {
      render(<ConfidenceBadge level="high" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("High Confidence")).toBeInTheDocument();
    });

    it("renders 'Medium Confidence' for level='medium'", () => {
      render(<ConfidenceBadge level="medium" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
    });

    it("renders 'Low Confidence' for level='low'", () => {
      render(<ConfidenceBadge level="low" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Low Confidence")).toBeInTheDocument();
    });
  });

  describe("aria-label", () => {
    it("has correct aria-label for high confidence", () => {
      render(<ConfidenceBadge level="high" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "High Confidence"
      );
    });

    it("has correct aria-label for medium confidence", () => {
      render(<ConfidenceBadge level="medium" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Medium Confidence"
      );
    });

    it("has correct aria-label for low confidence", () => {
      render(<ConfidenceBadge level="low" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Low Confidence"
      );
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      render(<ConfidenceBadge level="high" className="my-badge" />);
      expect(screen.getByRole("status")).toHaveClass("my-badge");
    });

    it("renders without className prop", () => {
      render(<ConfidenceBadge level="low" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
