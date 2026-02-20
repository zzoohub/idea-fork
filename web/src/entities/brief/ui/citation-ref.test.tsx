import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CitationRef } from "./citation-ref";

const CITATION = {
  source: "reddit",
  sourceName: "r/startups",
  date: "2024-01-10",
  snippet: "The product needs better onboarding.",
  originalUrl: "https://reddit.com/r/startups/1",
};

describe("CitationRef", () => {
  describe("rendering", () => {
    it("renders the citation number button", () => {
      render(<CitationRef number={1} citation={CITATION} />);
      expect(
        screen.getByRole("button", { name: /Citation 1: r\/startups/ })
      ).toBeInTheDocument();
    });

    it("shows the citation number inside the button", () => {
      render(<CitationRef number={3} citation={CITATION} />);
      expect(screen.getByText("[3]")).toBeInTheDocument();
    });

    it("starts collapsed (aria-expanded=false)", () => {
      render(<CitationRef number={1} citation={CITATION} />);
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "false"
      );
    });

    it("does not show source snippet when collapsed", () => {
      render(<CitationRef number={1} citation={CITATION} />);
      expect(
        screen.queryByText("The product needs better onboarding.")
      ).not.toBeInTheDocument();
    });
  });

  describe("expanding", () => {
    it("expands when button is clicked", async () => {
      const user = userEvent.setup();
      render(<CitationRef number={1} citation={CITATION} />);
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });

    it("shows the source snippet after clicking", async () => {
      const user = userEvent.setup();
      render(<CitationRef number={1} citation={CITATION} />);
      await user.click(screen.getByRole("button"));
      expect(
        screen.getByText("The product needs better onboarding.")
      ).toBeInTheDocument();
    });

    it("collapses again on second click", async () => {
      const user = userEvent.setup();
      render(<CitationRef number={1} citation={CITATION} />);
      await user.click(screen.getByRole("button"));
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      expect(
        screen.queryByText("The product needs better onboarding.")
      ).not.toBeInTheDocument();
    });
  });
});
