import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackLink } from "./back-link";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("BackLink", () => {
  it("renders a link with the correct href", () => {
    render(<BackLink href="/briefs" label="Back to Briefs" />);
    expect(screen.getByRole("link", { name: /Back to Briefs/i })).toHaveAttribute(
      "href",
      "/briefs"
    );
  });

  it("renders the label text", () => {
    render(<BackLink href="/" label="Go back" />);
    expect(screen.getByText("Go back")).toBeInTheDocument();
  });

  it("renders the arrow-left icon inside the link", () => {
    const { container } = render(<BackLink href="/" label="Back" />);
    // Icon should render an svg
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<BackLink href="/" label="Back" className="custom-back" />);
    expect(screen.getByRole("link")).toHaveClass("custom-back");
  });

  it("renders without optional className", () => {
    render(<BackLink href="/" label="Back" />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
