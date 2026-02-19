import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/empty-state";
import { Search } from "lucide-react";

// Mock next/link so it renders a plain <a> tag in jsdom
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("EmptyState", () => {
  describe("always renders", () => {
    it("renders the title", () => {
      render(
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different filter."
        />
      );
      expect(screen.getByText("No results")).toBeInTheDocument();
    });

    it("renders the description", () => {
      render(
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different filter."
        />
      );
      expect(screen.getByText("Try a different filter.")).toBeInTheDocument();
    });

    it("renders the icon as an SVG", () => {
      const { container } = render(
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different filter."
        />
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("icon has aria-hidden=true", () => {
      const { container } = render(
        <EmptyState
          icon={Search}
          title="Empty"
          description="Nothing here."
        />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("renders a title as an h3 element", () => {
      render(
        <EmptyState
          icon={Search}
          title="My Title"
          description="My Description"
        />
      );
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("My Title");
    });
  });

  describe("action button with href (Link variant)", () => {
    it("renders a link button when actionLabel and actionHref are provided", () => {
      render(
        <EmptyState
          icon={Search}
          title="No bookmarks"
          description="Save some items."
          actionLabel="Browse Feed"
          actionHref="/feed"
        />
      );
      const link = screen.getByRole("link", { name: "Browse Feed" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/feed");
    });

    it("does not render a button without actionLabel", () => {
      render(
        <EmptyState
          icon={Search}
          title="No bookmarks"
          description="Save some items."
          actionHref="/feed"
        />
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("action button with onClick (callback variant)", () => {
    it("renders a button when actionLabel and onAction are provided", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={Search}
          title="No results"
          description="Try again."
          actionLabel="Retry"
          onAction={onAction}
        />
      );
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    it("calls onAction when the button is clicked", async () => {
      const onAction = vi.fn();
      const user = userEvent.setup();
      render(
        <EmptyState
          icon={Search}
          title="No results"
          description="Try again."
          actionLabel="Retry"
          onAction={onAction}
        />
      );
      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(onAction).toHaveBeenCalledOnce();
    });
  });

  describe("action rendering priority — href takes precedence over onAction", () => {
    it("renders Link (not plain button) when both actionHref and onAction are provided", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={Search}
          title="Title"
          description="Desc"
          actionLabel="Go"
          actionHref="/somewhere"
          onAction={onAction}
        />
      );
      // actionHref branch: Button asChild renders as a link
      expect(screen.getByRole("link", { name: "Go" })).toBeInTheDocument();
    });
  });

  describe("no action rendered", () => {
    it("renders no button or link when neither actionHref nor onAction is given", () => {
      render(
        <EmptyState
          icon={Search}
          title="Title"
          description="Desc"
        />
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders no action when only actionLabel is given without href or callback", () => {
      render(
        <EmptyState
          icon={Search}
          title="Title"
          description="Desc"
          actionLabel="Do something"
        />
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});
