import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "./post-card";

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
  source: "reddit" as const,
  sourceName: "r/entrepreneur",
  date: "Jan 15, 2024",
  snippet: "This product changed my business workflow completely.",
  tags: ["productivity", "startup"],
  upvotes: 1234,
  originalUrl: "https://reddit.com/r/entrepreneur/post/123",
};

describe("PostCard", () => {
  describe("source icon and metadata", () => {
    it("renders source name", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.getByText("r/entrepreneur")).toBeInTheDocument();
    });

    it("renders date", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
    });

    it("renders reddit icon for reddit source", () => {
      const { container } = render(<PostCard {...defaultProps} />);
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("renders app-store icon for appstore source", () => {
      const { container } = render(
        <PostCard {...defaultProps} source="appstore" />
      );
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("snippet", () => {
    it("renders snippet text", () => {
      render(<PostCard {...defaultProps} />);
      expect(
        screen.getByText(/This product changed my business workflow completely./)
      ).toBeInTheDocument();
    });
  });

  describe("upvotes", () => {
    it("renders upvote count", () => {
      render(<PostCard {...defaultProps} />);
      // toLocaleString may vary by locale
      expect(screen.getByText(/1[,.]?234/)).toBeInTheDocument();
    });
  });

  describe("tags", () => {
    it("renders all tags", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.getByText("productivity")).toBeInTheDocument();
      expect(screen.getByText("startup")).toBeInTheDocument();
    });

    it("renders tags as interactive buttons when onTagClick is provided", () => {
      render(<PostCard {...defaultProps} onTagClick={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "productivity" })
      ).toBeInTheDocument();
    });

    it("renders tags as static spans when onTagClick is not provided", () => {
      render(<PostCard {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: "productivity" })
      ).not.toBeInTheDocument();
    });

    it("calls onTagClick with tag name when tag button is clicked", async () => {
      const user = userEvent.setup();
      const handleTagClick = vi.fn();
      render(<PostCard {...defaultProps} onTagClick={handleTagClick} />);
      await user.click(screen.getByRole("button", { name: "productivity" }));
      expect(handleTagClick).toHaveBeenCalledWith("productivity");
    });
  });

  describe("originalUrl link", () => {
    it("renders View original link with correct href", () => {
      render(<PostCard {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute(
        "href",
        "https://reddit.com/r/entrepreneur/post/123"
      );
    });

    it("opens original link in new tab", () => {
      render(<PostCard {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("briefSlug link", () => {
    it("renders Related Brief link when briefSlug is provided", () => {
      render(<PostCard {...defaultProps} briefSlug="my-brief" />);
      expect(
        screen.getByRole("link", { name: /Related Brief/i })
      ).toHaveAttribute("href", "/briefs/my-brief");
    });

    it("does not render Related Brief link when briefSlug is not provided", () => {
      render(<PostCard {...defaultProps} />);
      expect(
        screen.queryByRole("link", { name: /Related Brief/i })
      ).not.toBeInTheDocument();
    });
  });
});
