import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  const noop = () => {};

  describe("rendering", () => {
    it("renders an input with type=search", () => {
      render(<SearchInput value="" onChange={noop} />);
      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("renders with default placeholder", () => {
      render(<SearchInput value="" onChange={noop} />);
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders with custom placeholder", () => {
      render(
        <SearchInput value="" onChange={noop} placeholder="Find products..." />
      );
      expect(
        screen.getByPlaceholderText("Find products...")
      ).toBeInTheDocument();
    });

    it("displays the current value", () => {
      render(<SearchInput value="hello" onChange={noop} />);
      expect(screen.getByRole("searchbox")).toHaveValue("hello");
    });
  });

  describe("clear button", () => {
    it("shows clear button when value is non-empty and onClear is provided", () => {
      render(
        <SearchInput value="text" onChange={noop} onClear={noop} />
      );
      expect(
        screen.getByRole("button", { name: "Clear search" })
      ).toBeInTheDocument();
    });

    it("does not show clear button when value is empty", () => {
      render(<SearchInput value="" onChange={noop} onClear={noop} />);
      expect(
        screen.queryByRole("button", { name: "Clear search" })
      ).not.toBeInTheDocument();
    });

    it("does not show clear button when onClear is not provided, even with value", () => {
      render(<SearchInput value="text" onChange={noop} />);
      expect(
        screen.queryByRole("button", { name: "Clear search" })
      ).not.toBeInTheDocument();
    });

    it("fires onClear when clear button is clicked", async () => {
      const user = userEvent.setup();
      const handleClear = vi.fn();
      render(
        <SearchInput value="text" onChange={noop} onClear={handleClear} />
      );
      await user.click(screen.getByRole("button", { name: "Clear search" }));
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("onChange", () => {
    it("fires onChange when typing", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<SearchInput value="" onChange={handleChange} />);
      await user.type(screen.getByRole("searchbox"), "a");
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("className", () => {
    it("merges custom className on the wrapper div", () => {
      const { container } = render(
        <SearchInput value="" onChange={noop} className="extra-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("extra-class");
    });
  });

  describe("pr class based on value", () => {
    it("uses pr-4 when value is empty", () => {
      render(<SearchInput value="" onChange={noop} />);
      expect(screen.getByRole("searchbox")).toHaveClass("pr-4");
    });

    it("uses pr-10 when value is non-empty", () => {
      render(<SearchInput value="text" onChange={noop} />);
      expect(screen.getByRole("searchbox")).toHaveClass("pr-10");
    });
  });
});
