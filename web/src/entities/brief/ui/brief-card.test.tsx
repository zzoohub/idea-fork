import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
  postCount: 89,
  platformCount: 2,
  recency: "3 days ago",
  snippet: "Many users complain about slow checkout.",
  tags: ["checkout", "ux", "performance"],
  slug: "faster-checkout",
};

describe("BriefCard", () => {
  describe("rendering", () => {
    it("renders the title", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText("Users want faster checkout")
      ).toBeInTheDocument();
    });

    it("renders as a link to the brief page", () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/briefs/faster-checkout"
      );
    });

    it("renders demand signals", () => {
      render(<BriefCard {...defaultProps} />);
      // postCount is shown as "89 related posts" in one span
      expect(screen.getByText(/89/)).toBeInTheDocument();
      expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });

    it("renders the snippet", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByText(/Many users complain about slow checkout./)
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
      // The tags div should not be rendered
      expect(screen.queryByText("checkout")).not.toBeInTheDocument();
    });
  });

  describe("confidence badge", () => {
    it('defaults to "New" confidence badge', () => {
      render(<BriefCard {...defaultProps} />);
      expect(screen.getByRole("status", { name: "New" })).toBeInTheDocument();
    });

    it('renders "High Confidence" badge when confidence="high"', () => {
      render(<BriefCard {...defaultProps} confidence="high" />);
      expect(
        screen.getByRole("status", { name: "High Confidence" })
      ).toBeInTheDocument();
    });

    it('renders "Trending" badge when confidence="trending"', () => {
      render(<BriefCard {...defaultProps} confidence="trending" />);
      expect(
        screen.getByRole("status", { name: "Trending" })
      ).toBeInTheDocument();
    });

    it('renders "Emerging" badge when confidence="emerging"', () => {
      render(<BriefCard {...defaultProps} confidence="emerging" />);
      expect(
        screen.getByRole("status", { name: "Emerging" })
      ).toBeInTheDocument();
    });
  });

  describe("bookmark button", () => {
    it("renders a bookmark button", () => {
      render(<BriefCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Bookmark this brief" })
      ).toBeInTheDocument();
    });
  });

  describe("tags as static chips", () => {
    it("tags are rendered as spans (non-interactive)", () => {
      render(<BriefCard {...defaultProps} />);
      // The only button in the card is the bookmark button; tags are spans
      const buttons = screen.queryAllByRole("button");
      // Exactly one button (the bookmark button), no tag buttons
      expect(buttons.length).toBe(1);
      expect(buttons[0]).toHaveAttribute("aria-label", "Bookmark this brief");
    });
  });

  describe("source platforms", () => {
    it("does not render platform stack when sourcePlatforms is empty", () => {
      render(<BriefCard {...defaultProps} sourcePlatforms={[]} />);
      // No platform abbreviation letters shown
      expect(screen.queryByLabelText(/Sources:/)).not.toBeInTheDocument();
    });

    it("renders platform stack when sourcePlatforms are provided", () => {
      const platforms = [
        { name: "Reddit", color: "bg-orange-500", letter: "R" },
        { name: "Twitter", color: "bg-blue-500", letter: "T" },
      ];
      render(<BriefCard {...defaultProps} sourcePlatforms={platforms} />);
      expect(
        screen.getByLabelText("Sources: Reddit, Twitter")
      ).toBeInTheDocument();
    });
  });
});
