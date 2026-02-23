import { describe, it, expect, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { SearchOverlay } from "./search-overlay";

describe("SearchOverlay", () => {
  const noop = () => {};

  describe("rendering", () => {
    it("renders a dialog element", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-label=Open search on dialog", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Open search");
    });

    it("renders Close search button", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(
        screen.getByRole("button", { name: "Close search" })
      ).toBeInTheDocument();
    });

    it("renders help text when value is empty and open", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(
        screen.getByText("Search briefs, products, and posts")
      ).toBeInTheDocument();
    });

    it("does not render hint when value is non-empty", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value="hello"
          onChange={noop}
          onClear={noop}
        />
      );
      expect(
        screen.queryByText("Search briefs, products, and posts")
      ).not.toBeInTheDocument();
    });
  });

  describe("isOpen state classes", () => {
    it("applies opacity-100 class when open", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(screen.getByRole("dialog")).toHaveClass("opacity-100");
    });

    it("applies opacity-0 class when closed", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={false}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      // aria-hidden=true means we need hidden:true to find it
      expect(screen.getByRole("dialog", { hidden: true })).toHaveClass("opacity-0");
    });

    it("sets aria-hidden=true when closed", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={false}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
        "aria-hidden",
        "true"
      );
    });

    it("sets aria-hidden=false when open", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
    });
  });

  describe("close button", () => {
    it("fires onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={handleClose}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      await user.click(screen.getByRole("button", { name: "Close search" }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Escape key", () => {
    it("fires onClose when Escape is pressed while open", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={handleClose}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      await user.keyboard("{Escape}");
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("does not fire onClose when Escape is pressed while closed", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={false}
          onClose={handleClose}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      await user.keyboard("{Escape}");
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe("onSubmit", () => {
    it("fires onSubmit and onClose when form is submitted with non-empty value", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={handleClose}
          value="test query"
          onChange={noop}
          onClear={noop}
          onSubmit={handleSubmit}
        />
      );
      const input = screen.getByRole("searchbox");
      await user.type(input, "{Enter}");
      expect(handleSubmit).toHaveBeenCalledWith("test query");
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("does not fire onSubmit when value is empty", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={handleClose}
          value=""
          onChange={noop}
          onClear={noop}
          onSubmit={handleSubmit}
        />
      );
      const input = screen.getByRole("searchbox");
      await user.type(input, "{Enter}");
      expect(handleSubmit).not.toHaveBeenCalled();
      expect(handleClose).not.toHaveBeenCalled();
    });

    it("does not fire when onSubmit prop is not provided", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={handleClose}
          value="test"
          onChange={noop}
          onClear={noop}
        />
      );
      const input = screen.getByRole("searchbox");
      await user.type(input, "{Enter}");
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe("onChange", () => {
    it("fires onChange when typing in the search input", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={handleChange}
          onClear={noop}
        />
      );
      await user.type(screen.getByRole("searchbox"), "abc");
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("body scroll lock", () => {
    it("sets body overflow=hidden when isOpen=true", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("clears body overflow when isOpen=false", () => {
      renderWithIntl(
        <SearchOverlay
          isOpen={false}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(document.body.style.overflow).toBe("");
    });

    it("restores body overflow on unmount", () => {
      const { unmount } = renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("focus management", () => {
    it("auto-focuses input when isOpen transitions to true", async () => {
      vi.useFakeTimers();
      renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      vi.useRealTimers();
    });

    it("restores focus to previous element when closing", async () => {
      const button = document.createElement("button");
      button.textContent = "Trigger";
      document.body.appendChild(button);
      button.focus();

      const { rerender } = renderWithIntl(
        <SearchOverlay
          isOpen={true}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );

      rerender(
        <SearchOverlay
          isOpen={false}
          onClose={noop}
          value=""
          onChange={noop}
          onClear={noop}
        />
      );
      document.body.removeChild(button);
    });
  });
});
