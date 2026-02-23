import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { SortDropdown } from "./sort-dropdown";

const OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most upvoted", value: "upvotes" },
];

describe("SortDropdown", () => {
  describe("rendering", () => {
    it("renders a select element with aria-label", () => {
      renderWithIntl(<SortDropdown options={OPTIONS} />);
      expect(screen.getByRole("combobox", { name: "Sort by" })).toBeInTheDocument();
    });

    it("renders all options", () => {
      renderWithIntl(<SortDropdown options={OPTIONS} />);
      expect(screen.getByRole("option", { name: "Newest" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Oldest" })).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Most upvoted" })
      ).toBeInTheDocument();
    });

    it("shows the selected value", () => {
      renderWithIntl(<SortDropdown options={OPTIONS} value="oldest" />);
      expect(screen.getByRole("combobox")).toHaveValue("oldest");
    });

    it("renders with no selected value (uncontrolled)", () => {
      renderWithIntl(<SortDropdown options={OPTIONS} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });
  });

  describe("onChange", () => {
    it("fires onChange with selected value", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      renderWithIntl(
        <SortDropdown options={OPTIONS} value="newest" onChange={handleChange} />
      );
      await user.selectOptions(screen.getByRole("combobox"), "oldest");
      expect(handleChange).toHaveBeenCalledWith("oldest");
    });

    it("does not throw when onChange is not provided", async () => {
      const user = userEvent.setup();
      renderWithIntl(<SortDropdown options={OPTIONS} value="newest" />);
      // No onChange — selecting should not throw
      await user.selectOptions(screen.getByRole("combobox"), "oldest");
    });
  });

  describe("className", () => {
    it("merges custom className on wrapper", () => {
      const { container } = renderWithIntl(
        <SortDropdown options={OPTIONS} className="my-class" />
      );
      expect(container.firstChild).toHaveClass("my-class");
    });
  });
});
