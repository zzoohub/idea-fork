import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  describe("message", () => {
    it("renders the default message when none is provided", () => {
      renderWithIntl(<ErrorState />);
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    });

    it("renders a custom message", () => {
      renderWithIntl(<ErrorState message="Failed to load data." />);
      expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
    });
  });

  describe("role", () => {
    it("has role=alert on the container", () => {
      renderWithIntl(<ErrorState />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("warning icon", () => {
    it("renders a warning icon", () => {
      const { container } = renderWithIntl(<ErrorState />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("retry button", () => {
    it("renders Try again button when onRetry is provided", () => {
      renderWithIntl(<ErrorState onRetry={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "Try again" })
      ).toBeInTheDocument();
    });

    it("fires onRetry when Try again is clicked", async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();
      renderWithIntl(<ErrorState onRetry={handleRetry} />);
      await user.click(screen.getByRole("button", { name: "Try again" }));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("does not render retry button when onRetry is not provided", () => {
      renderWithIntl(<ErrorState />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      renderWithIntl(<ErrorState className="custom-error" />);
      expect(screen.getByRole("alert")).toHaveClass("custom-error");
    });
  });
});
