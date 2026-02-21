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

    it("renders reddit avatar for reddit source", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.getByText("r/")).toBeInTheDocument();
    });

    it("renders appstore avatar for appstore source", () => {
      const { container } = render(<PostCard {...defaultProps} source="appstore" />);
      /* appstore avatar now renders a Lucide Smartphone SVG icon */
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders twitter avatar for twitter source", () => {
      const { container } = render(<PostCard {...defaultProps} source="twitter" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders linkedin avatar for linkedin source", () => {
      const { container } = render(<PostCard {...defaultProps} source="linkedin" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
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

    it("renders a non-linked 'View Original' span when URL is not safe", () => {
      render(<PostCard {...defaultProps} originalUrl="javascript:alert(1)" />);
      expect(screen.queryByRole("link", { name: /View original/i })).not.toBeInTheDocument();
      expect(screen.getByText(/View original/i)).toBeInTheDocument();
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

  describe("optional metadata", () => {
    it("renders username when provided", () => {
      render(<PostCard {...defaultProps} username="u/johndoe" />);
      expect(screen.getByText("u/johndoe")).toBeInTheDocument();
    });

    it("does not render username element when not provided", () => {
      render(<PostCard {...defaultProps} />);
      // No paragraph with username class
      expect(screen.queryByText(/u\//)).not.toBeInTheDocument();
    });

    it("renders title heading when provided", () => {
      render(<PostCard {...defaultProps} title="A post title" />);
      expect(screen.getByRole("heading", { name: "A post title" })).toBeInTheDocument();
    });

    it("does not render title heading when not provided", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("renders sentiment badge when provided", () => {
      render(<PostCard {...defaultProps} sentiment="frustrated" />);
      expect(screen.getByText("Frustrated")).toBeInTheDocument();
    });

    it("does not render sentiment badge when not provided", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.queryByText("Frustrated")).not.toBeInTheDocument();
    });

    it("renders category badge when provided", () => {
      render(<PostCard {...defaultProps} category="SaaS" />);
      expect(screen.getByText("SaaS")).toBeInTheDocument();
    });

    it("does not render category badge when not provided", () => {
      render(<PostCard {...defaultProps} />);
      expect(screen.queryByText("SaaS")).not.toBeInTheDocument();
    });

    it("renders comment count when commentCount is provided", () => {
      render(<PostCard {...defaultProps} commentCount={42} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("does not render comment count when commentCount is not provided", () => {
      render(<PostCard {...defaultProps} />);
      // No message-circle icon section
      const text = screen.queryByText(/^42$/);
      expect(text).not.toBeInTheDocument();
    });
  });
});
