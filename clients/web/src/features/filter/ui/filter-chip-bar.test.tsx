import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChipBar } from "./filter-chip-bar";

const TAGS = [
  { label: "JavaScript", value: "javascript" },
  { label: "React", value: "react" },
  { label: "Node.js", value: "node-js" },
  { label: "Python", value: "python" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "TypeScript", value: "typescript" },
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
          tags={[{ label: "A", value: "a" }, { label: "B", value: "b" }, { label: "C", value: "c" }]}
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
        <FilterChipBar tags={TAGS} activeTag="react" onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("button", { name: "React" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("All chip is inactive when a tag is active", () => {
      render(
        <FilterChipBar tags={TAGS} activeTag="react" onTagChange={vi.fn()} />
      );
      expect(
        screen.getByRole("button", { name: "All" })
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("tag selection", () => {
    it("calls onTagChange with tag value (slug) when a visible tag is clicked", async () => {
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
      expect(handleChange).toHaveBeenCalledWith("javascript");
    });

    it("calls onTagChange with null when clicking the active tag (deselect)", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <FilterChipBar
          tags={TAGS}
          activeTag="react"
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
          activeTag="react"
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
      expect(handleChange).toHaveBeenCalledWith("typescript");
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
          activeTag="typescript"
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
            { label: "A", value: "a" },
            { label: "B", value: "b" },
            { label: "C", value: "c" },
            { label: "D", value: "d" },
            { label: "E", value: "e" },
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
          activeTag="typescript"
          onTagChange={handleChange}
        />
      );
      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("menuitem", { name: "TypeScript" }));
      expect(handleChange).toHaveBeenCalledWith(null);
    });
  });

  describe("without typeFilters prop", () => {
    it("renders only the All chip and visible tag chips (no type filter chips)", () => {
      render(
        <FilterChipBar
          tags={[{ label: "A", value: "a" }, { label: "B", value: "b" }]}
          activeTag={null}
          onTagChange={vi.fn()}
        />
      );
      // All + A + B buttons present, nothing else
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
    });

    it("does not render any divider element when typeFilters is not provided", () => {
      const { container } = render(
        <FilterChipBar
          tags={[{ label: "A", value: "a" }]}
          activeTag={null}
          onTagChange={vi.fn()}
        />
      );
      const dividers = container.querySelectorAll("div[aria-hidden='true']");
      expect(dividers.length).toBe(0);
    });

    it("renders an empty tag list with only the All chip", () => {
      render(
        <FilterChipBar
          tags={[]}
          activeTag={null}
          onTagChange={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^\+/ })).not.toBeInTheDocument();
    });
  });
});
