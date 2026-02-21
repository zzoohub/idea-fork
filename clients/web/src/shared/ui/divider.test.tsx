import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Divider } from "./divider";

describe("Divider", () => {
  it("renders a separator element", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("has the border-t class", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toHaveClass("border-t");
  });

  it("merges custom className", () => {
    render(<Divider className="my-class" />);
    expect(screen.getByRole("separator")).toHaveClass("my-class");
  });

  it("renders without className prop", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
