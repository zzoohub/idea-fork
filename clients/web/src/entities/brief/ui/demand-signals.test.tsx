import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemandSignals, type DemandSignalData } from "./demand-signals";

const fullData: DemandSignalData = {
  complaintCount: 47,
  timeRange: "6 weeks",
  subreddits: ["r/SaaS", "r/startups", "r/webdev", "r/entrepreneur", "r/indiehackers"],
  avgScore: 142,
  avgCommentsPerPost: 12,
  communityVerdictPct: 84,
  freshness: "2d ago",
};

describe("DemandSignals", () => {
  describe("complaint line", () => {
    it("renders complaint count with time range", () => {
      render(<DemandSignals data={fullData} />);
      expect(
        screen.getByText("47 complaints over 6 weeks"),
      ).toBeInTheDocument();
    });

    it("renders complaint count without time range when null", () => {
      render(
        <DemandSignals data={{ ...fullData, timeRange: null }} />,
      );
      expect(screen.getByText("47 complaints")).toBeInTheDocument();
    });
  });

  describe("subreddit line", () => {
    it("shows first 3 subreddits with +N more", () => {
      render(<DemandSignals data={fullData} />);
      expect(
        screen.getByText("r/SaaS, r/startups, r/webdev + 2 more"),
      ).toBeInTheDocument();
    });

    it("shows all subreddits when 3 or fewer", () => {
      render(
        <DemandSignals
          data={{ ...fullData, subreddits: ["r/SaaS", "r/startups"] }}
        />,
      );
      expect(screen.getByText("r/SaaS, r/startups")).toBeInTheDocument();
    });

    it("hides subreddit line when empty", () => {
      render(
        <DemandSignals data={{ ...fullData, subreddits: [] }} />,
      );
      expect(screen.queryByText(/r\//)).not.toBeInTheDocument();
    });
  });

  describe("engagement line", () => {
    it("renders avg upvotes and comments per post", () => {
      render(<DemandSignals data={fullData} />);
      expect(
        screen.getByText(/avg 142 upvotes .* 12 comments per post/),
      ).toBeInTheDocument();
    });
  });

  describe("community verdict line", () => {
    it("renders percentage when provided", () => {
      render(<DemandSignals data={fullData} />);
      expect(
        screen.getByText("84% of users rated this valuable"),
      ).toBeInTheDocument();
    });

    it("hides when null", () => {
      render(
        <DemandSignals
          data={{ ...fullData, communityVerdictPct: null }}
        />,
      );
      expect(
        screen.queryByText(/rated this valuable/),
      ).not.toBeInTheDocument();
    });
  });

  describe("freshness line", () => {
    it("renders most recent when provided", () => {
      render(<DemandSignals data={fullData} />);
      expect(screen.getByText("Most recent: 2d ago")).toBeInTheDocument();
    });

    it("hides when null", () => {
      render(
        <DemandSignals data={{ ...fullData, freshness: null }} />,
      );
      expect(screen.queryByText(/Most recent/)).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <DemandSignals data={fullData} className="my-signals" />,
      );
      expect(container.firstChild).toHaveClass("my-signals");
    });

    it("renders without optional className", () => {
      const { container } = render(<DemandSignals data={fullData} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
