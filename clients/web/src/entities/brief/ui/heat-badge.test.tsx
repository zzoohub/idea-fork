import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { HeatBadge } from "./heat-badge";

describe("HeatBadge", () => {
  describe("renders for all heat levels", () => {
    it("renders 'Hot' for level='hot'", () => {
      renderWithIntl(<HeatBadge level="hot" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Hot")).toBeInTheDocument();
    });

    it("renders 'Growing' for level='growing'", () => {
      renderWithIntl(<HeatBadge level="growing" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Growing")).toBeInTheDocument();
    });

    it("renders 'Steady' for level='steady'", () => {
      renderWithIntl(<HeatBadge level="steady" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Steady")).toBeInTheDocument();
    });

    it("renders 'New' for level='new'", () => {
      renderWithIntl(<HeatBadge level="new" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
    });
  });

  describe("aria-label", () => {
    it("has correct aria-label for hot", () => {
      renderWithIntl(<HeatBadge level="hot" />);
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Hot");
    });

    it("has correct aria-label for growing", () => {
      renderWithIntl(<HeatBadge level="growing" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Growing",
      );
    });

    it("has correct aria-label for steady", () => {
      renderWithIntl(<HeatBadge level="steady" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Steady",
      );
    });

    it("has correct aria-label for new", () => {
      renderWithIntl(<HeatBadge level="new" />);
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "New");
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      renderWithIntl(<HeatBadge level="hot" className="my-badge" />);
      expect(screen.getByRole("status")).toHaveClass("my-badge");
    });

    it("renders without className prop", () => {
      renderWithIntl(<HeatBadge level="new" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
