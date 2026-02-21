import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabBar } from "./tab-bar";

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

const ITEMS = [
  { href: "/feed", label: "Feed", icon: "clock", active: true },
  { href: "/briefs", label: "Briefs", icon: "tag", active: false },
  { href: "/products", label: "Products", icon: "app-store", active: false },
];

describe("TabBar", () => {
  describe("desktop variant (default)", () => {
    it("renders a nav element", () => {
      render(<TabBar items={ITEMS} />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders all item labels", () => {
      render(<TabBar items={ITEMS} />);
      expect(screen.getByText("Feed")).toBeInTheDocument();
      expect(screen.getByText("Briefs")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
    });

    it("renders links with correct hrefs", () => {
      render(<TabBar items={ITEMS} />);
      expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute(
        "href",
        "/feed"
      );
      expect(screen.getByRole("link", { name: "Briefs" })).toHaveAttribute(
        "href",
        "/briefs"
      );
    });

    it("sets aria-current=page on active item", () => {
      render(<TabBar items={ITEMS} />);
      expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("does not set aria-current on inactive items", () => {
      render(<TabBar items={ITEMS} />);
      expect(screen.getByRole("link", { name: "Briefs" })).not.toHaveAttribute(
        "aria-current"
      );
    });

    it("renders active indicator span for active item", () => {
      const { container } = render(<TabBar items={ITEMS} />);
      const indicator = container.querySelector("span[aria-hidden='true']");
      expect(indicator).toBeInTheDocument();
    });

    it("does not render icon in desktop variant", () => {
      const { container } = render(<TabBar items={ITEMS} />);
      // Icons are rendered only in mobile variant
      // In desktop, no SVG icons should be present
      // (desktop variant renders label only + active indicator)
      // However the desktop TabBar doesn't render icons at all per the source
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(0);
    });

    it("merges custom className on nav", () => {
      render(<TabBar items={ITEMS} className="extra-nav" />);
      expect(screen.getByRole("navigation")).toHaveClass("extra-nav");
    });

    it("renders items without icon when icon is not set", () => {
      const noIconItems = [
        { href: "/a", label: "Alpha", active: false },
        { href: "/b", label: "Beta", active: true },
      ];
      render(<TabBar items={noIconItems} />);
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });

  describe("mobile variant", () => {
    it("renders a nav element", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders all item labels", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      expect(screen.getByText("Feed")).toBeInTheDocument();
      expect(screen.getByText("Briefs")).toBeInTheDocument();
    });

    it("renders icon SVGs for items with icon", () => {
      const { container } = render(<TabBar items={ITEMS} variant="mobile" />);
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("sets aria-current=page on active item", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      expect(screen.getByRole("link", { name: /Feed/i })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("does not set aria-current on inactive items", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      expect(
        screen.getByRole("link", { name: /Briefs/i })
      ).not.toHaveAttribute("aria-current");
    });

    it("applies active styles to active link", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      const activeLink = screen.getByRole("link", { name: /Feed/i });
      expect(activeLink).toHaveClass("text-interactive");
    });

    it("applies inactive styles to inactive links", () => {
      render(<TabBar items={ITEMS} variant="mobile" />);
      const inactiveLink = screen.getByRole("link", { name: /Briefs/i });
      expect(inactiveLink).toHaveClass("text-text-tertiary");
    });

    it("merges custom className on mobile nav", () => {
      render(<TabBar items={ITEMS} variant="mobile" className="bottom-bar" />);
      expect(screen.getByRole("navigation")).toHaveClass("bottom-bar");
    });

    it("renders items without icon when icon not set", () => {
      const noIconItems = [
        { href: "/a", label: "Alpha", active: false },
      ];
      const { container } = render(
        <TabBar items={noIconItems} variant="mobile" />
      );
      expect(container.querySelectorAll("svg").length).toBe(0);
    });
  });
});
