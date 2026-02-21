import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  describe("message", () => {
    it("renders the default message when none is provided", () => {
      render(<ErrorState />);
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    });

    it("renders a custom message", () => {
      render(<ErrorState message="Failed to load data." />);
      expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
    });
  });

  describe("role", () => {
    it("has role=alert on the container", () => {
      render(<ErrorState />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("warning icon", () => {
    it("renders a warning icon", () => {
      const { container } = render(<ErrorState />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("retry button", () => {
    it("renders Try again button when onRetry is provided", () => {
      render(<ErrorState onRetry={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "Try again" })
      ).toBeInTheDocument();
    });

    it("fires onRetry when Try again is clicked", async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();
      render(<ErrorState onRetry={handleRetry} />);
      await user.click(screen.getByRole("button", { name: "Try again" }));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("does not render retry button when onRetry is not provided", () => {
      render(<ErrorState />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      render(<ErrorState className="custom-error" />);
      expect(screen.getByRole("alert")).toHaveClass("custom-error");
    });
  });
});
