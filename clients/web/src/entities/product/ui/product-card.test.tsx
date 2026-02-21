import { describe, it, expect, vi } from "vitest";
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
  complaintCount: 342,
  topFrustration: "Slow sync",
  slug: "acme-crm",
  tags: ["crm", "sales"],
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

  describe("trend badge", () => {
    it('shows "Hot" when trendLabel is "Hot"', () => {
      render(<ProductCard {...defaultProps} trendLabel="Hot" />);
      expect(screen.getByText("Hot")).toBeInTheDocument();
    });

    it('shows "Stable" when trendLabel is "Stable"', () => {
      render(<ProductCard {...defaultProps} trendLabel="Stable" />);
      expect(screen.getByText("Stable")).toBeInTheDocument();
    });

    it("shows positive trend percent when trendPercent > 0", () => {
      render(<ProductCard {...defaultProps} trendPercent={12} />);
      expect(screen.getByText("+12%")).toBeInTheDocument();
    });

    it("shows negative trend percent when trendPercent < 0", () => {
      render(<ProductCard {...defaultProps} trendPercent={-5} />);
      expect(screen.getByText("-5%")).toBeInTheDocument();
    });

    it("does not show a trend badge when neither trendLabel nor trendPercent is provided", () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.queryByText("Hot")).not.toBeInTheDocument();
      expect(screen.queryByText("Stable")).not.toBeInTheDocument();
      expect(screen.queryByText(/[+\-]\d+%/)).not.toBeInTheDocument();
    });
  });

  describe("complaint stats", () => {
    it("renders complaint count", () => {
      render(<ProductCard {...defaultProps} />);
      // toLocaleString may vary by locale
      expect(screen.getByText(/342/)).toBeInTheDocument();
    });

    it("renders top frustration text", () => {
      render(<ProductCard {...defaultProps} />);
      // The component wraps the text in curly-quote characters
      expect(screen.getByText(/Slow sync/)).toBeInTheDocument();
    });
  });

  describe("View Details footer", () => {
    it('renders "View Details" link text', () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText("View Details")).toBeInTheDocument();
    });
  });
});
