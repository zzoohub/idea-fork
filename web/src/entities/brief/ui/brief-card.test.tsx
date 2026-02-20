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
      expect(screen.getByText("89")).toBeInTheDocument();
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

  describe("tags as static chips", () => {
    it("tags are rendered as spans (non-interactive)", () => {
      render(<BriefCard {...defaultProps} />);
      // Non-interactive chips render as span, not button
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });
  });
});
