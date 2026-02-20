import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceSnippet } from "./source-snippet";

describe("SourceSnippet", () => {
  const defaultProps = {
    source: "reddit",
    sourceName: "r/startups",
    date: "2024-01-15",
    snippet: "This is a test snippet about the product.",
    originalUrl: "https://reddit.com/r/startups/123",
  };

  describe("rendering", () => {
    it("renders source name", () => {
      render(<SourceSnippet {...defaultProps} />);
      expect(screen.getByText("r/startups")).toBeInTheDocument();
    });

    it("renders date in a time element", () => {
      render(<SourceSnippet {...defaultProps} />);
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    });

    it("renders the snippet text", () => {
      render(<SourceSnippet {...defaultProps} />);
      expect(
        screen.getByText("This is a test snippet about the product.")
      ).toBeInTheDocument();
    });

    it("renders View original link with correct href", () => {
      render(<SourceSnippet {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute(
        "href",
        "https://reddit.com/r/startups/123"
      );
    });

    it("opens link in new tab with rel=noopener noreferrer", () => {
      render(<SourceSnippet {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("icon rendering", () => {
    it("renders an icon for reddit source", () => {
      const { container } = render(<SourceSnippet {...defaultProps} />);
      // reddit is a fill icon, so fill=currentColor
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("renders an icon for app-store source", () => {
      const { container } = render(
        <SourceSnippet {...defaultProps} source="app-store" />
      );
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <SourceSnippet {...defaultProps} className="extra" />
      );
      expect(container.firstChild).toHaveClass("extra");
    });

    it("renders without optional className", () => {
      const { container } = render(<SourceSnippet {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
