import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { BriefCard } from "./brief-card";

vi.mock("@/src/shared/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const defaultProps = {
  title: "Users want faster checkout",
  heatLevel: "growing" as const,
  signalCount: 89,
  communityCount: 5,
  freshness: "3d ago",
  snippet: "Many users complain about slow checkout.",
  tags: ["checkout", "ux", "performance"],
  slug: "faster-checkout",
};

describe("BriefCard", () => {
  describe("rendering", () => {
    it("renders the title", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText("Users want faster checkout"),
      ).toBeInTheDocument();
    });

    it("renders as a link to the brief page", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/briefs/faster-checkout",
      );
    });

    it("renders signal count", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByText("89 signals")).toBeInTheDocument();
    });

    it("renders community count", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByText("across 5 communities")).toBeInTheDocument();
    });

    it("renders freshness as 'Active Xd ago'", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByText("Active 3d ago")).toBeInTheDocument();
    });

    it("hides freshness when null", () => {
      renderWithIntl(<BriefCard {...defaultProps} freshness={null} />);
      expect(screen.queryByText(/Active/)).not.toBeInTheDocument();
    });

    it("renders the snippet", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText(/Many users complain about slow checkout./),
      ).toBeInTheDocument();
    });

    it("renders all tags as chips", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByText("checkout")).toBeInTheDocument();
      expect(screen.getByText("ux")).toBeInTheDocument();
      expect(screen.getByText("performance")).toBeInTheDocument();
    });

    it("does not render tags section when tags is empty", () => {
      renderWithIntl(<BriefCard {...defaultProps} tags={[]} />);
      expect(screen.queryByText("checkout")).not.toBeInTheDocument();
    });

    it("renders singular 'signal' when count is 1", () => {
      renderWithIntl(<BriefCard {...defaultProps} signalCount={1} />);
      expect(screen.getByText("1 signal")).toBeInTheDocument();
    });

    it("renders singular 'community' when count is 1", () => {
      renderWithIntl(<BriefCard {...defaultProps} communityCount={1} />);
      expect(screen.getByText("across 1 community")).toBeInTheDocument();
    });
  });

  describe("heat badge", () => {
    it("renders Growing badge", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("status", { name: "Growing" })).toBeInTheDocument();
    });

    it("renders Hot badge", () => {
      renderWithIntl(<BriefCard {...defaultProps} heatLevel="hot" />);
      expect(screen.getByRole("status", { name: "Hot" })).toBeInTheDocument();
    });

    it("renders Steady badge", () => {
      renderWithIntl(<BriefCard {...defaultProps} heatLevel="steady" />);
      expect(screen.getByRole("status", { name: "Steady" })).toBeInTheDocument();
    });

    it("renders New badge", () => {
      renderWithIntl(<BriefCard {...defaultProps} heatLevel="new" />);
      expect(screen.getByRole("status", { name: "New" })).toBeInTheDocument();
    });
  });

  describe("tags as static chips", () => {
    it("tags are rendered as spans (non-interactive)", () => {
      renderWithIntl(<BriefCard {...defaultProps} />);
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });
  });

  describe("source platforms", () => {
    it("does not render platform stack when sourcePlatforms is empty", () => {
      renderWithIntl(<BriefCard {...defaultProps} sourcePlatforms={[]} />);
      expect(screen.queryByLabelText(/Sources:/)).not.toBeInTheDocument();
    });

    it("renders platform stack when sourcePlatforms are provided", () => {
      const platforms = [
        { name: "Reddit", color: "bg-orange-500", letter: "R" },
        { name: "Twitter", color: "bg-blue-500", letter: "T" },
      ];
      renderWithIntl(<BriefCard {...defaultProps} sourcePlatforms={platforms} />);
      expect(
        screen.getByLabelText("Sources: Reddit, Twitter"),
      ).toBeInTheDocument();
    });
  });
});
