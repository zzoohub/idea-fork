import { describe, it, expect, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { ProductCard } from "./product-card";

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
  name: "Acme CRM",
  category: "Productivity",
  signalCount: 342,
  tagline: "All-in-one CRM for small teams",
  heatLevel: "growing" as const,
  slug: "acme-crm",
  tags: [
    { id: 1, slug: "crm", name: "CRM" },
    { id: 2, slug: "sales", name: "Sales" },
  ],
};

describe("ProductCard", () => {
  describe("name and category", () => {
    it("renders the product name", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText("Acme CRM")).toBeInTheDocument();
    });

    it("renders the category", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText("Productivity")).toBeInTheDocument();
    });
  });

  describe("link", () => {
    it("links to the product page", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/products/acme-crm"
      );
    });
  });

  describe("icon / avatar", () => {
    it("renders an img when iconUrl is provided", () => {
      const { container } = renderWithIntl(
        <ProductCard {...defaultProps} iconUrl="https://example.com/icon.png" />
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    });

    it("uses favicon when iconUrl is absent but productUrl is provided", () => {
      const { container } = renderWithIntl(
        <ProductCard {...defaultProps} productUrl="https://acme.com/app" />
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "https://www.google.com/s2/favicons?domain=acme.com&sz=128"
      );
    });

    it("prefers iconUrl over favicon", () => {
      const { container } = renderWithIntl(
        <ProductCard
          {...defaultProps}
          iconUrl="https://example.com/icon.png"
          productUrl="https://acme.com"
        />
      );
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    });

    it("falls back to letter avatar when favicon fails to load", () => {
      const { container } = renderWithIntl(
        <ProductCard {...defaultProps} productUrl="https://acme.com" />
      );
      const img = container.querySelector("img")!;
      act(() => {
        img.dispatchEvent(new Event("error"));
      });
      expect(container.querySelector("img")).not.toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("falls back to letter avatar when productUrl is invalid", () => {
      renderWithIntl(
        <ProductCard {...defaultProps} productUrl="not-a-url" />
      );
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("renders a letter avatar when neither iconUrl nor productUrl is provided", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("shows the correct first letter of the name", () => {
      renderWithIntl(<ProductCard {...defaultProps} name="Zendesk" />);
      expect(screen.getByText("Z")).toBeInTheDocument();
    });
  });

  describe("heat badge", () => {
    it("renders the heat badge with the correct level", () => {
      renderWithIntl(<ProductCard {...defaultProps} heatLevel="hot" />);
      expect(screen.getByText("Hot")).toBeInTheDocument();
    });

    it("renders growing level", () => {
      renderWithIntl(<ProductCard {...defaultProps} heatLevel="growing" />);
      expect(screen.getByText("Growing")).toBeInTheDocument();
    });

    it("renders steady level", () => {
      renderWithIntl(<ProductCard {...defaultProps} heatLevel="steady" />);
      expect(screen.getByText("Steady")).toBeInTheDocument();
    });

    it("renders new level", () => {
      renderWithIntl(<ProductCard {...defaultProps} heatLevel="new" />);
      expect(screen.getByText("New")).toBeInTheDocument();
    });
  });

  describe("tagline", () => {
    it("renders the tagline", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(
        screen.getByText("All-in-one CRM for small teams")
      ).toBeInTheDocument();
    });
  });

  describe("signal count", () => {
    it("renders signal count", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText(/342/)).toBeInTheDocument();
      expect(screen.getByText(/signals/)).toBeInTheDocument();
    });
  });

  describe("source", () => {
    it("renders source when provided", () => {
      renderWithIntl(<ProductCard {...defaultProps} source="Reddit" />);
      expect(screen.getByText("Reddit")).toBeInTheDocument();
    });

    it("does not render source when not provided", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.queryByText("Reddit")).not.toBeInTheDocument();
    });
  });

  describe("tags", () => {
    it("renders tag names", () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText("CRM")).toBeInTheDocument();
      expect(screen.getByText("Sales")).toBeInTheDocument();
    });

    it("renders no tags when array is empty", () => {
      renderWithIntl(<ProductCard {...defaultProps} tags={[]} />);
      expect(screen.queryByText("CRM")).not.toBeInTheDocument();
    });
  });

  describe("CTA footer", () => {
    it('renders "Explore Gaps" link text', () => {
      renderWithIntl(<ProductCard {...defaultProps} />);
      expect(screen.getByText("Explore Gaps")).toBeInTheDocument();
    });
  });
});
