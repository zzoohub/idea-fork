import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemandSignals } from "./demand-signals";

describe("DemandSignals", () => {
  describe("postCount", () => {
    it("renders post count", () => {
      render(
        <DemandSignals postCount={120} platformCount={2} recency="2 days ago" />
      );
      expect(screen.getByText("120")).toBeInTheDocument();
    });

    it("formats large post count with toLocaleString", () => {
      render(
        <DemandSignals
          postCount={1234}
          platformCount={1}
          recency="1 hour ago"
        />
      );
      // toLocaleString may produce "1,234" or "1234" depending on locale
      const el = screen.getByText(/1[,.]?234/);
      expect(el).toBeInTheDocument();
    });
  });

  describe("platformCount", () => {
    it("renders singular 'platform' when platformCount=1", () => {
      const { container } = render(
        <DemandSignals postCount={10} platformCount={1} recency="today" />
      );
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain(" platform");
      expect(container.textContent).not.toContain(" platforms");
    });

    it("renders plural 'platforms' when platformCount > 1", () => {
      const { container } = render(
        <DemandSignals postCount={10} platformCount={3} recency="today" />
      );
      expect(container.textContent).toContain(" platforms");
    });
  });

  describe("recency", () => {
    it("renders the recency string", () => {
      render(
        <DemandSignals postCount={5} platformCount={2} recency="last week" />
      );
      expect(screen.getByText("last week")).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <DemandSignals
          postCount={1}
          platformCount={1}
          recency="now"
          className="my-signals"
        />
      );
      expect(container.firstChild).toHaveClass("my-signals");
    });

    it("renders without optional className", () => {
      const { container } = render(
        <DemandSignals postCount={1} platformCount={1} recency="now" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
