import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BriefBody } from "./brief-body";

const CITATIONS = [
  {
    id: 1,
    source: "reddit",
    sourceName: "r/startups",
    date: "2024-01-10",
    snippet: "The checkout is too slow.",
    originalUrl: "https://reddit.com/1",
  },
  {
    id: 2,
    source: "reddit",
    sourceName: "r/entrepreneur",
    date: "2024-01-12",
    snippet: "Payment flow is broken.",
    originalUrl: "https://reddit.com/2",
  },
];

const CONTENT = {
  problem: "Users face friction at checkout. [1] Some drop off. [2]",
  demandSignals: ["Signal A", "Signal B"],
  suggestedDirections: ["Direction 1", "Direction 2"],
};

describe("BriefBody", () => {
  describe("problem section", () => {
    it("renders the Problem heading", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(screen.getByRole("heading", { name: "Problem" })).toBeInTheDocument();
    });

    it("renders plain text parts of the problem", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(screen.getByText(/Users face friction at checkout./)).toBeInTheDocument();
    });

    it("renders citation reference buttons", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(
        screen.getByRole("button", { name: /Citation 1: r\/startups/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Citation 2: r\/entrepreneur/ })
      ).toBeInTheDocument();
    });

    it("renders text without citation markers when no matching citation exists", () => {
      const contentWithUnknownCitation = {
        ...CONTENT,
        problem: "No citation here [99] but text continues.",
      };
      render(
        <BriefBody content={contentWithUnknownCitation} citations={CITATIONS} />
      );
      // [99] has no match, so it renders as a plain span
      expect(screen.getByText("[99]")).toBeInTheDocument();
    });
  });

  describe("demand signals section", () => {
    it("renders Demand Signals heading when list is non-empty", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(
        screen.getByRole("heading", { name: "Demand Signals" })
      ).toBeInTheDocument();
    });

    it("renders each demand signal", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(screen.getByText("Signal A")).toBeInTheDocument();
      expect(screen.getByText("Signal B")).toBeInTheDocument();
    });

    it("does not render Demand Signals section when list is empty", () => {
      const contentEmpty = { ...CONTENT, demandSignals: [] };
      render(<BriefBody content={contentEmpty} citations={CITATIONS} />);
      expect(
        screen.queryByRole("heading", { name: "Demand Signals" })
      ).not.toBeInTheDocument();
    });
  });

  describe("suggested directions section", () => {
    it("renders Suggested Directions heading when list is non-empty", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(
        screen.getByRole("heading", { name: "Suggested Directions" })
      ).toBeInTheDocument();
    });

    it("renders each direction", () => {
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(screen.getByText("Direction 1")).toBeInTheDocument();
      expect(screen.getByText("Direction 2")).toBeInTheDocument();
    });

    it("does not render Suggested Directions section when list is empty", () => {
      const contentEmpty = { ...CONTENT, suggestedDirections: [] };
      render(<BriefBody content={contentEmpty} citations={CITATIONS} />);
      expect(
        screen.queryByRole("heading", { name: "Suggested Directions" })
      ).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <BriefBody
          content={CONTENT}
          citations={CITATIONS}
          className="my-brief-body"
        />
      );
      expect(container.firstChild).toHaveClass("my-brief-body");
    });

    it("renders without className", () => {
      const { container } = render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("citation expansion integration", () => {
    it("expands citation when citation button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <BriefBody content={CONTENT} citations={CITATIONS} />
      );
      await user.click(
        screen.getByRole("button", { name: /Citation 1: r\/startups/ })
      );
      expect(screen.getByText("The checkout is too slow.")).toBeInTheDocument();
    });
  });
});
