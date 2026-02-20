import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemandSignals } from "./demand-signals";

describe("DemandSignals", () => {
  describe("postCount", () => {
    it("renders post count within aggregation text", () => {
      render(
        <DemandSignals postCount={120} platformCount={2} recency="2 days" />
      );
      expect(screen.getByText("120 posts")).toBeInTheDocument();
    });

    it("formats large post count with toLocaleString", () => {
      render(
        <DemandSignals
          postCount={1234}
          platformCount={1}
          recency="1 hour"
        />
      );
      // toLocaleString may produce "1,234" or "1234" depending on locale
      const el = screen.getByText(/1[,.]?234 posts/);
      expect(el).toBeInTheDocument();
    });
  });

  describe("platformCount", () => {
    it("renders singular 'platform' when platformCount=1", () => {
      const { container } = render(
        <DemandSignals postCount={10} platformCount={1} recency="today" />
      );
      expect(container.textContent).toContain("1 platform");
      expect(container.textContent).not.toContain("1 platforms");
    });

    it("renders plural 'platforms' when platformCount > 1", () => {
      const { container } = render(
        <DemandSignals postCount={10} platformCount={3} recency="today" />
      );
      expect(container.textContent).toContain("3 platforms");
    });
  });

  describe("recency", () => {
    it("renders the recency string within aggregation text", () => {
      render(
        <DemandSignals postCount={5} platformCount={2} recency="30 days" />
      );
      expect(screen.getByText("30 days")).toBeInTheDocument();
    });
  });

  describe("aggregation text format", () => {
    it("renders the full aggregation sentence", () => {
      const { container } = render(
        <DemandSignals postCount={47} platformCount={3} recency="30 days" />
      );
      expect(container.textContent).toContain("Aggregated from");
      expect(container.textContent).toContain("47 posts");
      expect(container.textContent).toContain("3 platforms");
      expect(container.textContent).toContain("30 days");
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
