import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RatingButtons } from "./rating-buttons";

describe("RatingButtons", () => {
  describe("rendering", () => {
    it("renders a group with accessible label", () => {
      render(<RatingButtons />);
      expect(
        screen.getByRole("group", { name: "Rate this content" })
      ).toBeInTheDocument();
    });

    it("renders Helpful and Not helpful buttons", () => {
      render(<RatingButtons />);
      expect(
        screen.getByRole("button", { name: "Helpful" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Not helpful" })
      ).toBeInTheDocument();
    });
  });

  describe("unrated state (value=null)", () => {
    it("neither button is pressed when value is null", () => {
      render(<RatingButtons value={null} />);
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
      expect(
        screen.getByRole("button", { name: "Not helpful" })
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("rated-up state (value='up')", () => {
    it("Helpful button is pressed", () => {
      render(<RatingButtons value="up" />);
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("Not helpful button is not pressed", () => {
      render(<RatingButtons value="up" />);
      expect(
        screen.getByRole("button", { name: "Not helpful" })
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("Helpful button has positive styling", () => {
      render(<RatingButtons value="up" />);
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveClass(
        "bg-positive/15"
      );
    });
  });

  describe("rated-down state (value='down')", () => {
    it("Not helpful button is pressed", () => {
      render(<RatingButtons value="down" />);
      expect(
        screen.getByRole("button", { name: "Not helpful" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("Helpful button is not pressed", () => {
      render(<RatingButtons value="down" />);
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("Not helpful button has negative styling", () => {
      render(<RatingButtons value="down" />);
      expect(
        screen.getByRole("button", { name: "Not helpful" })
      ).toHaveClass("bg-negative/15");
    });
  });

  describe("onChange", () => {
    it("calls onChange with 'up' when Helpful is clicked from unrated", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<RatingButtons value={null} onChange={handleChange} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(handleChange).toHaveBeenCalledWith("up");
    });

    it("calls onChange with null when Helpful is clicked while already up", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<RatingButtons value="up" onChange={handleChange} />);
      await user.click(screen.getByRole("button", { name: "Helpful" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("calls onChange with 'down' when Not helpful is clicked from unrated", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<RatingButtons value={null} onChange={handleChange} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(handleChange).toHaveBeenCalledWith("down");
    });

    it("calls onChange with null when Not helpful is clicked while already down", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<RatingButtons value="down" onChange={handleChange} />);
      await user.click(screen.getByRole("button", { name: "Not helpful" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("does not crash when onChange is not provided", async () => {
      const user = userEvent.setup();
      render(<RatingButtons value={null} />);
      // Clicking without onChange — should not throw
      await user.click(screen.getByRole("button", { name: "Helpful" }));
    });
  });

  describe("className", () => {
    it("merges custom className on wrapper", () => {
      render(<RatingButtons className="custom-class" />);
      expect(
        screen.getByRole("group", { name: "Rate this content" })
      ).toHaveClass("custom-class");
    });
  });
});
