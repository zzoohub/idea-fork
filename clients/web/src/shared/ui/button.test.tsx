import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  describe("variant", () => {
    it("renders primary variant by default", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button", { name: "Click me" });
      expect(btn).toHaveClass("bg-interactive");
    });

    it("renders ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const btn = screen.getByRole("button", { name: "Ghost" });
      expect(btn).toHaveClass("bg-transparent");
      expect(btn).toHaveClass("text-interactive");
    });
  });

  describe("children", () => {
    it("renders children text", () => {
      render(<Button>Submit</Button>);
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows spinner SVG when loading=true", () => {
      render(<Button loading>Saving</Button>);
      const svg = document.querySelector("svg[aria-hidden='true']");
      expect(svg).toBeInTheDocument();
    });

    it("sets aria-busy when loading", () => {
      render(<Button loading>Saving</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("does not set aria-busy when not loading", () => {
      render(<Button>Normal</Button>);
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    });

    it("disables the button when loading=true", () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("does not show spinner when loading=false", () => {
      render(<Button>Normal</Button>);
      const svg = document.querySelector("svg[aria-hidden='true']");
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables the button when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is not disabled by default", () => {
      render(<Button>Active</Button>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("onClick", () => {
    it("fires onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not fire onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not fire onClick when loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );
      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      render(<Button className="custom-class">Btn</Button>);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });
  });
});
