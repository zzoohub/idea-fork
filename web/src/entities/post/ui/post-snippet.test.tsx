import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostSnippet } from "./post-snippet";

const defaultProps = {
  source: "reddit" as const,
  sourceName: "r/SaaS",
  date: "Feb 10, 2024",
  snippet: "The onboarding process is confusing.",
  originalUrl: "https://reddit.com/r/SaaS/456",
};

describe("PostSnippet", () => {
  describe("rendering", () => {
    it("renders source name", () => {
      render(<PostSnippet {...defaultProps} />);
      expect(screen.getByText("r/SaaS")).toBeInTheDocument();
    });

    it("renders date", () => {
      render(<PostSnippet {...defaultProps} />);
      expect(screen.getByText("Feb 10, 2024")).toBeInTheDocument();
    });

    it("renders snippet text", () => {
      render(<PostSnippet {...defaultProps} />);
      expect(
        screen.getByText("The onboarding process is confusing.")
      ).toBeInTheDocument();
    });

    it("renders View original link with correct href", () => {
      render(<PostSnippet {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute("href", "https://reddit.com/r/SaaS/456");
    });

    it("opens link in new tab with rel=noopener noreferrer", () => {
      render(<PostSnippet {...defaultProps} />);
      const link = screen.getByRole("link", { name: /View original/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("source icon", () => {
    it("renders an SVG icon for reddit source", () => {
      const { container } = render(<PostSnippet {...defaultProps} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders an SVG icon for appstore source", () => {
      const { container } = render(
        <PostSnippet {...defaultProps} source="appstore" />
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <PostSnippet {...defaultProps} className="custom-snippet" />
      );
      expect(container.firstChild).toHaveClass("custom-snippet");
    });

    it("renders without className prop", () => {
      const { container } = render(<PostSnippet {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
