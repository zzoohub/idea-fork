import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChipBar } from "./filter-chip-bar";

const TAGS = [
  { label: "JavaScript" },
  { label: "React" },
  { label: "Node.js" },
  { label: "Python" },
  { label: "Go" },
  { label: "Rust" },
  { label: "TypeScript" },
];

describe("FilterChipBar", () => {
  describe("rendering", () => {
    it("renders a group with accessible label", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("group", { name: "Filter by category" })
      ).toBeInTheDocument();
    });

    it("renders the All chip", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    it("renders visible tags (default visibleCount=6)", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("button", { name: "JavaScript" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "React" })
      ).toBeInTheDocument();
      // 6 visible + "All" = 7 visible chips + 1 overflow chip
    });

    it("renders overflow trigger chip when tags exceed visibleCount", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      // 7 tags, visibleCount=6 -> 1 overflow -> "+1"
      expect(screen.getByRole("button", { name: "+1" })).toBeInTheDocument();
    });

    it("does not render overflow trigger when tags <= visibleCount", () => {
      render(
        <FilterChipBar
          tags={[{ label: "A" }, { label: "B" }, { label: "C" }]}
          activeTag={null}
          onTagChange={vi.fn()}
        />
      );
      expect(screen.queryByRole("button", { name: /^\+/ })).not.toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("All chip is active (active variant) when activeTag=null", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      const allBtn = screen.getByRole("button", { name: "All" });
      expect(allBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("tag chip is active when its tag matches activeTag", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag="React" onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("button", { name: "React" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("All chip is inactive when a tag is active", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag="React" onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("button", { name: "All" })
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("tag selection", () => {
    it("calls onTagChange with tag name when a visible tag is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag={null}
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "JavaScript" }));
      expect(handleChange).toHaveBeenCalledWith("JavaScript");
    });

    it("calls onTagChange with null when clicking the active tag (deselect)", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag="React"
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "React" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("calls onTagChange with null when clicking All", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag="React"
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "All" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });
  });

  describe("overflow dropdown", () => {
    it("opens dropdown when overflow trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("shows overflow tags in the dropdown", async () => {
      const user = userEvent.setup();
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      // 7th tag is TypeScript (index 6, which is the overflow)
      expect(screen.getByRole("menuitem", { name: "TypeScript" })).toBeInTheDocument();
    });

    it("calls onTagChange and closes dropdown when overflow tag is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag={null}
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("menuitem", { name: "TypeScript" }));
      expect(handleChange).toHaveBeenCalledWith("TypeScript");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes dropdown on outside click", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <FilterChipBar
            tags={TAGS}
            activeTag={null}
            onTagChange={vi.fn()}
          />
          <div data-testid="outside">outside</div>
        </div>
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.mouseDown(screen.getByTestId("outside"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes dropdown on Escape key", async () => {
      const user = userEvent.setup();
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("does not add event listeners when dropdown is closed", () => {
      // Render with overflow but no open -- shouldn't throw
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      // Pressing escape while closed does nothing
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("does not close dropdown when a non-Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      // Press a non-Escape key -- dropdown should remain open
      fireEvent.keyDown(document, { key: "Enter" });
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("overflow trigger chip shows active variant when an overflow tag is active", () => {
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag="TypeScript"
          onTagChange={vi.fn()}
        />
      );
      const overflowTrigger = screen.getByRole("button", { name: "+1" });
      // When overflow has active tag, trigger uses "active" variant -> bg-primary
      expect(overflowTrigger).toHaveClass("bg-primary");
    });

    it("overflow trigger chip shows inactive variant when no overflow tag is active", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      const overflowTrigger = screen.getByRole("button", { name: "+1" });
      expect(overflowTrigger).toHaveClass("bg-white");
    });

    it("toggles dropdown closed when overflow trigger is clicked again", async () => {
      const user = userEvent.setup();
      render(
        <FilterChipBar tags={TAGS} activeTag={null} onTagChange={vi.fn()} />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "+1" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("visibleCount prop", () => {
    it("respects custom visibleCount", () => {
      render(
        <FilterChipBar
          tags={[
            { label: "A" },
            { label: "B" },
            { label: "C" },
            { label: "D" },
            { label: "E" },
          ]}
          activeTag={null}
          onTagChange={vi.fn()}
          visibleCount={3}
        />
      );
      // 3 visible + 2 overflow -> "+2"
      expect(screen.getByRole("button", { name: "+2" })).toBeInTheDocument();
    });
  });

  describe("clicking active overflow tag deselects", () => {
    it("calls onTagChange with null when active overflow tag is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag="TypeScript"
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("menuitem", { name: "TypeScript" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });
  });
});
