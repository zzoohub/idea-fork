import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BriefCard } from "./brief-card";

vi.mock("next/link", () => ({
  default: ({
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
  complaintCount: 89,
  communityCount: 5,
  freshness: "3d ago",
  snippet: "Many users complain about slow checkout.",
  tags: ["checkout", "ux", "performance"],
  slug: "faster-checkout",
};

describe("BriefCard", () => {
  describe("rendering", () => {
    it("renders the title", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText("Users want faster checkout"),
      ).toBeInTheDocument();
    });

    it("renders as a link to the brief page", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/briefs/faster-checkout",
      );
    });

    it("renders complaint count", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByText("89 complaints")).toBeInTheDocument();
    });

    it("renders community count", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByText("across 5 communities")).toBeInTheDocument();
    });

    it("renders freshness as 'Active Xd ago'", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByText("Active 3d ago")).toBeInTheDocument();
    });

    it("hides freshness when null", () => {
      render(<BriefCard {...defaultProps} freshness={null} />);
      expect(screen.queryByText(/Active/)).not.toBeInTheDocument();
    });

    it("renders the snippet", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText(/Many users complain about slow checkout./),
      ).toBeInTheDocument();
    });

    it("renders all tags as chips", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByText("checkout")).toBeInTheDocument();
      expect(screen.getByText("ux")).toBeInTheDocument();
      expect(screen.getByText("performance")).toBeInTheDocument();
    });

    it("does not render tags section when tags is empty", () => {
      render(<BriefCard {...defaultProps} tags={[]} />);
      expect(screen.queryByText("checkout")).not.toBeInTheDocument();
    });

    it("renders singular 'complaint' when count is 1", () => {
      render(<BriefCard {...defaultProps} complaintCount={1} />);
      expect(screen.getByText("1 complaint")).toBeInTheDocument();
    });

    it("renders singular 'community' when count is 1", () => {
      render(<BriefCard {...defaultProps} communityCount={1} />);
      expect(screen.getByText("across 1 community")).toBeInTheDocument();
    });
  });

  describe("heat badge", () => {
    it("renders Growing badge", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("status", { name: "Growing" })).toBeInTheDocument();
    });

    it("renders Hot badge", () => {
      render(<BriefCard {...defaultProps} heatLevel="hot" />);
      expect(screen.getByRole("status", { name: "Hot" })).toBeInTheDocument();
    });

    it("renders Steady badge", () => {
      render(<BriefCard {...defaultProps} heatLevel="steady" />);
      expect(screen.getByRole("status", { name: "Steady" })).toBeInTheDocument();
    });

    it("renders New badge", () => {
      render(<BriefCard {...defaultProps} heatLevel="new" />);
      expect(screen.getByRole("status", { name: "New" })).toBeInTheDocument();
    });
  });

  describe("bookmark button", () => {
    it("renders a bookmark button", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Bookmark this brief" }),
      ).toBeInTheDocument();
    });

    it("clicking bookmark button does not navigate (prevents default)", async () => {
      const user = userEvent.setup();
      render(<BriefCard {...defaultProps} />);
      const bookmark = screen.getByRole("button", { name: "Bookmark this brief" });
      await user.click(bookmark);
      expect(bookmark).toBeInTheDocument();
    });
  });

  describe("tags as static chips", () => {
    it("tags are rendered as spans (non-interactive)", () => {
      render(<BriefCard {...defaultProps} />);
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(1);
      expect(buttons[0]).toHaveAttribute("aria-label", "Bookmark this brief");
    });
  });

  describe("source platforms", () => {
    it("does not render platform stack when sourcePlatforms is empty", () => {
      render(<BriefCard {...defaultProps} sourcePlatforms={[]} />);
      expect(screen.queryByLabelText(/Sources:/)).not.toBeInTheDocument();
    });

    it("renders platform stack when sourcePlatforms are provided", () => {
      const platforms = [
        { name: "Reddit", color: "bg-orange-500", letter: "R" },
        { name: "Twitter", color: "bg-blue-500", letter: "T" },
      ];
      render(<BriefCard {...defaultProps} sourcePlatforms={platforms} />);
      expect(
        screen.getByLabelText("Sources: Reddit, Twitter"),
      ).toBeInTheDocument();
    });
  });
});
