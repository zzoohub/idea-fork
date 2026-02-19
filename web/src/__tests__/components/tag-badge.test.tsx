import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagBadge } from "@/components/tag-badge";
import { TAG_CONFIG } from "@/lib/constants";
import type { TagType } from "@/types";

const allTags: TagType[] = [
  "complaint",
  "need",
  "feature-request",
  "discussion",
  "self-promo",
  "other",
];

describe("TagBadge", () => {
  it.each(allTags)("renders the correct label for tag: %s", (tag) => {
    render(<TagBadge tag={tag} />);
    expect(screen.getByText(TAG_CONFIG[tag].label)).toBeInTheDocument();
  });

  it.each(allTags)(
    "applies the correct background color for tag: %s",
    (tag) => {
      const { container } = render(<TagBadge tag={tag} />);
      const span = container.querySelector("span");
      expect(span).toHaveStyle({
        backgroundColor: TAG_CONFIG[tag].color,
      });
    }
  );

  it("renders a span element", () => {
    const { container } = render(<TagBadge tag="complaint" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("applies additional className when provided", () => {
    const { container } = render(
      <TagBadge tag="need" className="extra-class" />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("extra-class");
  });

  it("does not add extra class string when className is undefined", () => {
    const { container } = render(<TagBadge tag="need" />);
    const span = container.querySelector("span");
    // When no className is passed, the fallback "" should be appended but not add extra whitespace issues
    expect(span).toBeInTheDocument();
    // Verify the span's class does not contain "undefined"
    expect(span?.className).not.toContain("undefined");
  });

  it("renders complaint tag with label Complaint", () => {
    render(<TagBadge tag="complaint" />);
    expect(screen.getByText("Complaint")).toBeInTheDocument();
  });

  it("renders need tag with label Need", () => {
    render(<TagBadge tag="need" />);
    expect(screen.getByText("Need")).toBeInTheDocument();
  });

  it("renders feature-request tag with label Feature Request", () => {
    render(<TagBadge tag="feature-request" />);
    expect(screen.getByText("Feature Request")).toBeInTheDocument();
  });

  it("renders discussion tag with label Discussion", () => {
    render(<TagBadge tag="discussion" />);
    expect(screen.getByText("Discussion")).toBeInTheDocument();
  });

  it("renders self-promo tag with label Self-Promo", () => {
    render(<TagBadge tag="self-promo" />);
    expect(screen.getByText("Self-Promo")).toBeInTheDocument();
  });

  it("renders other tag with label Other", () => {
    render(<TagBadge tag="other" />);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });
});
