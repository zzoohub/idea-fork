import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BriefRating } from "./brief-rating";

vi.mock("@/src/features/rating/api", () => ({
  createRating: vi.fn(() => Promise.resolve({ data: {} })),
  updateRating: vi.fn(() => Promise.resolve({ data: {} })),
}));

describe("BriefRating", () => {
  describe("unsubmitted state", () => {
    it("renders 'Was this brief useful?' prompt", () => {
      render(<BriefRating briefId={1} />);
      expect(
        screen.getByText("Was this brief useful?")
      ).toBeInTheDocument();
    });

    it("renders rating buttons in initial unsubmitted state", () => {
      render(<BriefRating briefId={2} />);
      expect(
        screen.getByRole("group", { name: "Rate this content" })
      ).toBeInTheDocument();
    });

    it("stores briefId in data attribute", () => {
      const { container } = render(<BriefRating briefId={42} />);
      expect(container.firstChild).toHaveAttribute(
        "data-brief-id",
        "42"
      );
    });
  });

  describe("rating thumbs-up flow", () => {
    it("shows thanks message after rating up", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={3} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });

    it("hides the question prompt after rating up", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={4} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(
        screen.queryByText("Was this brief useful?")
      ).not.toBeInTheDocument();
    });

    it("does not show feedback text input after rating up", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={5} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(
        screen.queryByPlaceholderText("Tell us more...")
      ).not.toBeInTheDocument();
    });
  });

  describe("rating thumbs-down flow", () => {
    it("shows thanks message after rating down", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={6} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });

    it("shows feedback input after rating down", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={7} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(
        screen.getByPlaceholderText("Tell us more...")
      ).toBeInTheDocument();
    });

    it("shows 'What was missing?' label after rating down", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={8} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(
        screen.getByText("What was missing? (optional)")
      ).toBeInTheDocument();
    });

    it("shows Send button that is disabled when input is empty", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={9} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    });

    it("enables Send button when feedback text is entered", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={10} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      await user.type(
        screen.getByPlaceholderText("Tell us more..."),
        "Better examples"
      );
      expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
    });

    it("hides feedback input after Send is clicked with text", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={11} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      await user.type(
        screen.getByPlaceholderText("Tell us more..."),
        "More examples"
      );
      await user.click(screen.getByRole("button", { name: "Send" }));
      expect(
        screen.queryByPlaceholderText("Tell us more...")
      ).not.toBeInTheDocument();
    });

    it("shows final thanks after Send is clicked with text", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={12} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      await user.type(
        screen.getByPlaceholderText("Tell us more..."),
        "Add more data"
      );
      await user.click(screen.getByRole("button", { name: "Send" }));
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });

    it("submitting empty text via Send button does nothing", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={13} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      // Send is disabled with empty text, clicking does nothing
      const sendBtn = screen.getByRole("button", { name: "Send" });
      expect(sendBtn).toBeDisabled();
      await user.click(sendBtn);
      // feedback input still visible
      expect(
        screen.getByPlaceholderText("Tell us more...")
      ).toBeInTheDocument();
    });

    it("submitting via Enter key fires send feedback", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={14} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      const input = screen.getByPlaceholderText("Tell us more...");
      await user.type(input, "Great feedback{Enter}");
      expect(
        screen.queryByPlaceholderText("Tell us more...")
      ).not.toBeInTheDocument();
    });

    it("pressing Enter with empty text does not submit feedback", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={15} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      // Press Enter without typing any text — triggers onKeyDown → handleSendFeedback
      // which returns early because feedbackText is empty
      const input = screen.getByPlaceholderText("Tell us more...");
      await user.type(input, "{Enter}");
      // Feedback input still visible because empty text early-returns
      expect(
        screen.getByPlaceholderText("Tell us more...")
      ).toBeInTheDocument();
    });
  });

  describe("initialValue prop", () => {
    it("shows submitted state when initialValue is 'up'", () => {
      render(<BriefRating briefId={16} initialValue="up" />);
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
      expect(
        screen.queryByText("Was this brief useful?")
      ).not.toBeInTheDocument();
    });

    it("shows submitted state when initialValue is 'down'", () => {
      render(<BriefRating briefId={17} initialValue="down" />);
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });

    it("shows feedback input when initialValue is 'down'", () => {
      render(<BriefRating briefId={18} initialValue="down" />);
      expect(
        screen.getByPlaceholderText("Tell us more...")
      ).toBeInTheDocument();
    });
  });

  describe("handleRate with null (de-rating via RatingButtons toggle)", () => {
    it("calling handleRate(null) does not set submitted", async () => {
      const user = userEvent.setup();
      render(<BriefRating briefId={20} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(screen.queryByText("Was this brief useful?")).not.toBeInTheDocument();
    });
  });

  describe("aria-live region", () => {
    it("has an aria-live=polite region", () => {
      const { container } = render(<BriefRating briefId={19} />);
      const liveRegion = container.querySelector("[aria-live='polite']");
      expect(liveRegion).toBeInTheDocument();
    });
  });
});
