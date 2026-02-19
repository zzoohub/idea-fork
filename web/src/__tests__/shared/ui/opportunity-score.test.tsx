import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpportunityScore } from "@/shared/ui/opportunity-score";

describe("OpportunityScore", () => {
  it("renders the score as a formatted number", () => {
    render(<OpportunityScore score={7} />);
    expect(screen.getByText("7.0")).toBeInTheDocument();
  });

  it("renders with one decimal place for integer scores", () => {
    render(<OpportunityScore score={10} />);
    expect(screen.getByText("10.0")).toBeInTheDocument();
  });

  it("renders with one decimal place for decimal scores", () => {
    render(<OpportunityScore score={6.5} />);
    expect(screen.getByText("6.5")).toBeInTheDocument();
  });

  it("renders score of 0 correctly", () => {
    render(<OpportunityScore score={0} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("sets bar width to correct percentage for score 5 (50%)", () => {
    const { container } = render(<OpportunityScore score={5} />);
    // The inner bar is the second div (child of the meter div)
    const bar = container.querySelector("[role='meter'] > div");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("sets bar width to 100% for score 10", () => {
    const { container } = render(<OpportunityScore score={10} />);
    const bar = container.querySelector("[role='meter'] > div");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("sets bar width to 0% for score 0", () => {
    const { container } = render(<OpportunityScore score={0} />);
    const bar = container.querySelector("[role='meter'] > div");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("sets bar width to 70% for score 7", () => {
    const { container } = render(<OpportunityScore score={7} />);
    const bar = container.querySelector("[role='meter'] > div");
    expect(bar).toHaveStyle({ width: "70%" });
  });

  it("sets bar width to 30% for score 3", () => {
    const { container } = render(<OpportunityScore score={3} />);
    const bar = container.querySelector("[role='meter'] > div");
    expect(bar).toHaveStyle({ width: "30%" });
  });

  it("renders a meter element with correct aria attributes", () => {
    render(<OpportunityScore score={8} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "8");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "10");
    expect(meter).toHaveAttribute(
      "aria-label",
      "Opportunity score: 8 out of 10"
    );
  });

  it("applies additional className when provided", () => {
    const { container } = render(
      <OpportunityScore score={5} className="custom-class" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });

  it("does not add extra className when not provided", () => {
    const { container } = render(<OpportunityScore score={5} />);
    const wrapper = container.firstChild as HTMLElement;
    // Default class should be applied, no "undefined" in className
    expect(wrapper.className).not.toContain("undefined");
  });
});
