/**
 * Supplementary tests for BriefRating that exercise the API error paths
 * (the .catch() callbacks in handleRate and handleSendFeedback).
 * The main brief-rating.test.tsx tests the happy-path UI behavior.
 */
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { BriefRating } from "./brief-rating";

vi.mock("@/src/features/rating/api", () => ({
  createRating: vi.fn(() => Promise.reject(new Error("network error"))),
  updateRating: vi.fn(() => Promise.reject(new Error("network error"))),
}));

describe("BriefRating — API error handling", () => {
  describe("createRating catch callback", () => {
    it("still shows thanks message even when createRating rejects", async () => {
      const user = userEvent.setup();
      renderWithIntl(<BriefRating briefId={100} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      // API rejects silently — UI still shows thanks
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });

    it("does not surface an error to the user when createRating rejects on thumbs-down", async () => {
      const user = userEvent.setup();
      renderWithIntl(<BriefRating briefId={101} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      // API rejects silently — UI still transitions to submitted state
      expect(screen.getByText("Thanks for your feedback.")).toBeInTheDocument();
    });
  });

  describe("updateRating catch callback", () => {
    it("still hides feedback input even when updateRating rejects", async () => {
      const user = userEvent.setup();
      renderWithIntl(<BriefRating briefId={102} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      await user.type(screen.getByPlaceholderText("Tell us more..."), "Great feedback");
      await user.click(screen.getByRole("button", { name: "Send" }));
      // updateRating rejects silently — UI still hides the feedback input
      expect(screen.queryByPlaceholderText("Tell us more...")).not.toBeInTheDocument();
    });
  });
});
