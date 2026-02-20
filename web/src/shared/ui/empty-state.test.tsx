import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  describe("message", () => {
    it("renders the message text", () => {
      render(<EmptyState message="No results found." />);
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });
  });

  describe("suggestion", () => {
    it("renders suggestion when provided", () => {
      render(
        <EmptyState message="No results." suggestion="Try a different filter." />
      );
      expect(screen.getByText("Try a different filter.")).toBeInTheDocument();
    });

    it("does not render suggestion when omitted", () => {
      render(<EmptyState message="No results." />);
      expect(
        screen.queryByText("Try a different filter.")
      ).not.toBeInTheDocument();
    });
  });

  describe("action button", () => {
    it("renders action button when action is provided", () => {
      render(
        <EmptyState
          message="No results."
          action={{ label: "Reset filters", onClick: vi.fn() }}
        />
      );
      expect(
        screen.getByRole("button", { name: "Reset filters" })
      ).toBeInTheDocument();
    });

    it("fires action.onClick when button is clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <EmptyState
          message="No results."
          action={{ label: "Reset", onClick: handleClick }}
        />
      );
      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not render action button when action is omitted", () => {
      render(<EmptyState message="No results." />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <EmptyState message="Empty" className="my-custom" />
      );
      expect(container.firstChild).toHaveClass("my-custom");
    });
  });
});
