import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "./chip";

describe("Chip", () => {
  describe("interactive (default)", () => {
    it("renders as a button by default", () => {
      render(<Chip>All</Chip>);
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    it("renders active variant classes when variant=active", () => {
      render(<Chip variant="active">Active</Chip>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveClass("bg-primary");
      expect(btn).toHaveClass("text-white");
    });

    it("renders inactive variant classes by default", () => {
      render(<Chip>Inactive</Chip>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveClass("bg-white");
      expect(btn).toHaveClass("text-text-secondary");
    });

    it("fires onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Chip onClick={handleClick}>Tag</Chip>);
      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("has cursor-pointer class when interactive", () => {
      render(<Chip>Tag</Chip>);
      expect(screen.getByRole("button")).toHaveClass("cursor-pointer");
    });
  });

  describe("static (interactive=false)", () => {
    it("renders as a span when interactive=false", () => {
      render(<Chip interactive={false}>Tag</Chip>);
      // span does not have a button role
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("Tag")).toBeInTheDocument();
    });

    it("renders the span element", () => {
      const { container } = render(<Chip interactive={false}>Tag</Chip>);
      expect(container.querySelector("span")).toBeInTheDocument();
    });
  });

  describe("children", () => {
    it("renders children content", () => {
      render(<Chip>Hello</Chip>);
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className on button", () => {
      render(<Chip className="extra">Tag</Chip>);
      expect(screen.getByRole("button")).toHaveClass("extra");
    });

    it("merges custom className on span", () => {
      const { container } = render(
        <Chip interactive={false} className="extra">
          Tag
        </Chip>
      );
      expect(container.querySelector("span")).toHaveClass("extra");
    });
  });

  describe("hover classes", () => {
    it("includes hover class for inactive interactive chip", () => {
      render(<Chip variant="inactive">Tag</Chip>);
      expect(screen.getByRole("button")).toHaveClass("hover:bg-slate-100");
    });

    it("includes hover class for active interactive chip", () => {
      render(<Chip variant="active">Tag</Chip>);
      expect(screen.getByRole("button")).toHaveClass(
        "hover:bg-interactive-hover"
      );
    });
  });

  describe("icon prop", () => {
    it("renders an SVG icon when icon prop is provided with a known icon name", () => {
      const { container } = render(<Chip icon="zap">Tag</Chip>);
      // 'zap' is in the ICON_MAP so Icon renders an SVG
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("does not render an SVG icon when icon prop is not provided", () => {
      const { container } = render(<Chip>Tag</Chip>);
      expect(container.querySelector("svg")).not.toBeInTheDocument();
    });
  });
});
