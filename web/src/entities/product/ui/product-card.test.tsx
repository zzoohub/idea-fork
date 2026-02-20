import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./product-card";

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
  name: "Acme CRM",
  category: "Productivity",
  isTrending: false,
  complaintCount: 342,
  topIssue: "Slow sync",
  tags: ["crm", "sales"],
  slug: "acme-crm",
};

describe("ProductCard", () => {
  describe("name and category", () => {
    it("renders the product name", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText("Acme CRM")).toBeInTheDocument();
    });

    it("renders the category", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText("Productivity")).toBeInTheDocument();
    });
  });

  describe("link", () => {
    it("links to the product page", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/products/acme-crm"
      );
    });
  });

  describe("icon / avatar", () => {
    it("renders an img when iconUrl is provided", () => {
      const { container } = render(
        <ProductCard {...defaultProps} iconUrl="https://example.com/icon.png" />
      );
      // alt="" means the img is decorative and has no accessible role in testing-library
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    });

    it("renders a letter avatar when iconUrl is not provided", () => {
      render(<ProductCard {...defaultProps} />);
      // First letter uppercase of name
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("shows the correct first letter of the name", () => {
      render(<ProductCard {...defaultProps} name="Zendesk" />);
      expect(screen.getByText("Z")).toBeInTheDocument();
    });
  });

  describe("trending indicator", () => {
    it("shows Trending when isTrending=true", () => {
      render(<ProductCard {...defaultProps} isTrending={true} />);
      expect(screen.getByText("Trending")).toBeInTheDocument();
    });

    it("does not show Trending when isTrending=false", () => {
      render(<ProductCard {...defaultProps} isTrending={false} />);
      expect(screen.queryByText("Trending")).not.toBeInTheDocument();
    });
  });

  describe("complaint stats", () => {
    it("renders complaint count", () => {
      render(<ProductCard {...defaultProps} />);
      // toLocaleString may vary by locale
      expect(screen.getByText(/342/)).toBeInTheDocument();
    });

    it("renders top issue", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText(/Slow sync/)).toBeInTheDocument();
    });
  });

  describe("tags", () => {
    it("renders all tags", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText("crm")).toBeInTheDocument();
      expect(screen.getByText("sales")).toBeInTheDocument();
    });

    it("does not render tags section when tags is empty", () => {
      render(<ProductCard {...defaultProps} tags={[]} />);
      expect(screen.queryByText("crm")).not.toBeInTheDocument();
    });

    it("renders tags as static spans (non-interactive)", () => {
      render(<ProductCard {...defaultProps} />);
      // static chips are spans, not buttons
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
