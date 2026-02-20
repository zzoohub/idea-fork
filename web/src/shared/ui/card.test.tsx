import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./card";

// Mock next/link so it renders a plain anchor tag in tests
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

describe("Card", () => {
  describe("without href", () => {
    it("renders as article by default", () => {
      render(<Card>Content</Card>);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("renders as div when as=div", () => {
      const { container } = render(<Card as="div">Content</Card>);
      expect(container.querySelector("div")).toBeInTheDocument();
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    it("renders children", () => {
      render(<Card>Hello card</Card>);
      expect(screen.getByText("Hello card")).toBeInTheDocument();
    });

    it("merges custom className", () => {
      render(<Card className="custom">Content</Card>);
      expect(screen.getByRole("article")).toHaveClass("custom");
    });
  });

  describe("with href", () => {
    it("renders a link wrapping the content", () => {
      render(<Card href="/some-page">Link card</Card>);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/some-page");
    });

    it("renders children inside the link", () => {
      render(<Card href="/page">Card body</Card>);
      expect(screen.getByText("Card body")).toBeInTheDocument();
    });

    it("wraps content with article tag inside the link by default", () => {
      const { container } = render(<Card href="/page">Content</Card>);
      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();
    });

    it("wraps content with div tag inside the link when as=div", () => {
      const { container } = render(
        <Card href="/page" as="div">
          Content
        </Card>
      );
      // The inner tag should be a div with class="contents"
      const inner = container.querySelector("div.contents");
      expect(inner).toBeInTheDocument();
    });

    it("applies no-underline class to link", () => {
      render(<Card href="/page">Link</Card>);
      expect(screen.getByRole("link")).toHaveClass("no-underline");
    });
  });
});
