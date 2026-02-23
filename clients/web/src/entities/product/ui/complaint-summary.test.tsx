import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { ComplaintSummary } from "./complaint-summary";

const THEMES = [
  { name: "Slow sync", count: 150 },
  { name: "UI bugs", count: 80 },
  { name: "Crashes", count: 40 },
];

const DEFAULT_PROPS = {
  totalMentions: 270,
  criticalComplaints: 15,
  sentimentScore: 72,
  themes: THEMES,
};

describe("ComplaintSummary", () => {
  describe("stats cards", () => {
    it("renders total mentions count", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("270")).toBeInTheDocument();
    });

    it("renders critical complaints count", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("renders sentiment score", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("72")).toBeInTheDocument();
    });

    it("renders card labels", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("Total Mentions")).toBeInTheDocument();
      expect(screen.getByText("Critical Complaints")).toBeInTheDocument();
      expect(screen.getByText("Sentiment Score")).toBeInTheDocument();
    });

    it("renders trend badges when provided", () => {
      renderWithIntl(
        <ComplaintSummary
          {...DEFAULT_PROPS}
          mentionsTrend={12}
          criticalTrend={-5}
        />
      );
      expect(screen.getByText(/\+12%/)).toBeInTheDocument();
      expect(screen.getByText(/-5%/)).toBeInTheDocument();
    });

    it("does not render trend badges when not provided", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe("sentiment progress bar", () => {
    it("renders a progressbar with correct value", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "72");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });

    it("clamps score to 0-100 range in width", () => {
      const { container } = renderWithIntl(
        <ComplaintSummary {...DEFAULT_PROPS} sentimentScore={150} />
      );
      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveStyle({ width: "100%" });
    });
  });

  describe("top theme subtitle", () => {
    it("displays top theme name in critical complaints card", () => {
      const { container } = renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(container.textContent).toContain("Top issue: Slow sync");
    });

    it("shows fallback text when themes is empty", () => {
      const { container } = renderWithIntl(
        <ComplaintSummary {...DEFAULT_PROPS} themes={[]} />
      );
      expect(container.textContent).toContain("Requires immediate attention");
    });
  });

  describe("region role", () => {
    it("renders with region role and accessible label", () => {
      renderWithIntl(<ComplaintSummary {...DEFAULT_PROPS} />);
      expect(
        screen.getByRole("region", { name: "Total Mentions" })
      ).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = renderWithIntl(
        <ComplaintSummary {...DEFAULT_PROPS} className="extra" />
      );
      expect(container.firstChild).toHaveClass("extra");
    });

    it("renders without className prop", () => {
      const { container } = renderWithIntl(
        <ComplaintSummary {...DEFAULT_PROPS} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
