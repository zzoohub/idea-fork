import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplaintSummary } from "./complaint-summary";

const THEMES = [
  { name: "Slow sync", count: 150 },
  { name: "UI bugs", count: 80 },
  { name: "Crashes", count: 40 },
];

describe("ComplaintSummary", () => {
  describe("stats header", () => {
    it("renders total complaint count", () => {
      render(
        <ComplaintSummary
          totalCount={270}
          platformCount={2}
          themes={THEMES}
        />
      );
      // toLocaleString may vary by locale
      expect(screen.getByText(/270/)).toBeInTheDocument();
    });

    it("renders platform count", () => {
      const { container } = render(
        <ComplaintSummary
          totalCount={100}
          platformCount={3}
          themes={[]}
        />
      );
      // Use container text to avoid ambiguity with theme counts
      expect(container.textContent).toContain("3");
    });

    it("renders 'platforms' plural when platformCount > 1", () => {
      const { container } = render(
        <ComplaintSummary
          totalCount={100}
          platformCount={3}
          themes={THEMES}
        />
      );
      expect(container.textContent).toContain("platforms");
    });

    it("renders 'platform' singular when platformCount = 1", () => {
      const { container } = render(
        <ComplaintSummary
          totalCount={100}
          platformCount={1}
          themes={THEMES}
        />
      );
      expect(container.textContent).toContain("platform");
      expect(container.textContent).not.toContain("platforms");
    });
  });

  describe("themes list", () => {
    it("renders themes list with accessible label", () => {
      render(
        <ComplaintSummary
          totalCount={100}
          platformCount={2}
          themes={THEMES}
        />
      );
      expect(
        screen.getByRole("list", { name: "Complaint themes" })
      ).toBeInTheDocument();
    });

    it("renders all theme names", () => {
      render(
        <ComplaintSummary
          totalCount={100}
          platformCount={2}
          themes={THEMES}
        />
      );
      expect(screen.getByText("Slow sync")).toBeInTheDocument();
      expect(screen.getByText("UI bugs")).toBeInTheDocument();
      expect(screen.getByText("Crashes")).toBeInTheDocument();
    });

    it("renders theme counts", () => {
      render(
        <ComplaintSummary
          totalCount={100}
          platformCount={2}
          themes={THEMES}
        />
      );
      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/80/)).toBeInTheDocument();
    });

    it("renders numbered rank labels", () => {
      render(
        <ComplaintSummary
          totalCount={100}
          platformCount={2}
          themes={THEMES}
        />
      );
      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("2.")).toBeInTheDocument();
      expect(screen.getByText("3.")).toBeInTheDocument();
    });

    it("does not render themes list when themes is empty", () => {
      render(
        <ComplaintSummary totalCount={100} platformCount={2} themes={[]} />
      );
      expect(
        screen.queryByRole("list", { name: "Complaint themes" })
      ).not.toBeInTheDocument();
    });

    it("handles maxCount=1 fallback when themes is empty (no bar rendering)", () => {
      // With no themes, maxCount defaults to 1 — just verifies no crash
      render(
        <ComplaintSummary totalCount={0} platformCount={0} themes={[]} />
      );
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <ComplaintSummary
          totalCount={100}
          platformCount={2}
          themes={THEMES}
          className="extra"
        />
      );
      expect(container.firstChild).toHaveClass("extra");
    });

    it("renders without className prop", () => {
      const { container } = render(
        <ComplaintSummary totalCount={100} platformCount={2} themes={THEMES} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
