import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { SignalSummary } from "./signal-summary";

const THEMES = [
  { name: "Slow sync", count: 150 },
  { name: "UI bugs", count: 80 },
  { name: "Crashes", count: 40 },
];

const DEFAULT_PROPS = {
  totalMentions: 270,
  criticalSignals: 15,
  frustrationRate: 72 as number | null,
  themes: THEMES,
};

describe("SignalSummary", () => {
  describe("stats cards", () => {
    it("renders total mentions count", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("270")).toBeInTheDocument();
    });

    it("renders critical signals count", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("renders frustration rate", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("72%")).toBeInTheDocument();
    });

    it("renders card labels", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText("Total Mentions")).toBeInTheDocument();
      expect(screen.getByText("Critical Signals")).toBeInTheDocument();
      expect(screen.getByText("Frustration Rate")).toBeInTheDocument();
    });

    it("renders trend badges when provided", () => {
      renderWithIntl(
        <SignalSummary
          {...DEFAULT_PROPS}
          mentionsTrend={12}
          criticalTrend={-5}
        />
      );
      expect(screen.getByText(/\+12%/)).toBeInTheDocument();
      expect(screen.getByText(/-5%/)).toBeInTheDocument();
    });

    it("does not render trend badges when not provided", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument();
    });
  });

  describe("frustration rate progress bar", () => {
    it("renders a progressbar with correct value", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "72");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });

    it("clamps rate to 0-100 range in width", () => {
      const { container } = renderWithIntl(
        <SignalSummary {...DEFAULT_PROPS} frustrationRate={150} />
      );
      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveStyle({ width: "100%" });
    });

    it("shows N/A when frustrationRate is null", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} frustrationRate={null} />);
      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("top theme subtitle", () => {
    it("displays top theme name in critical signals card", () => {
      const { container } = renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(container.textContent).toContain("Top issue: Slow sync");
    });

    it("shows fallback text when themes is empty", () => {
      const { container } = renderWithIntl(
        <SignalSummary {...DEFAULT_PROPS} themes={[]} />
      );
      expect(container.textContent).toContain("Requires immediate attention");
    });
  });

  describe("region role", () => {
    it("renders with region role and accessible label", () => {
      renderWithIntl(<SignalSummary {...DEFAULT_PROPS} />);
      expect(
        screen.getByRole("region", { name: "Total Mentions" })
      ).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = renderWithIntl(
        <SignalSummary {...DEFAULT_PROPS} className="extra" />
      );
      expect(container.firstChild).toHaveClass("extra");
    });

    it("renders without className prop", () => {
      const { container } = renderWithIntl(
        <SignalSummary {...DEFAULT_PROPS} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
